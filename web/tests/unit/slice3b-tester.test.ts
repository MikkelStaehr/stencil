// Tester checks for slice 3b (step 2, UX principles) against docs/PLAN.md and design/specs/step-2-principles.md.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";
import { LAWS } from "@/content/laws";
import type { LawEntry } from "@/contracts/content";
import type { Principle, ProjectFile } from "@/contracts/project";
import { parse } from "@/data/project/parse";
import { serialize } from "@/data/project/serialize";
import { STORAGE_KEY } from "@/data/project/storage";
import { createProjectStore } from "@/data/project/store";
import { emptyProject } from "@/data/project/empty";
import { openDecisions } from "@/domain/decisions";
import { parseParamInput } from "@/domain/parse-input";
import { renderRule } from "@/domain/rules";
import { exportAll } from "@/export";

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const harbourText = readFileSync(join(__dirname, "..", "..", "fixtures", "harbour.project.json"), "utf8");
const harbour = (): ProjectFile => {
  const r = parse(harbourText);
  if (!r.ok) throw new Error("harbour fixture does not parse");
  return r.project;
};
const suggested = (law: LawEntry) => Object.fromEntries(law.params.map((p) => [p.key, p.suggested]));
/** An in-range value per param: the max, or the min where the max is the suggested value. apps-native-scroll.max (0–0) has no other value. */
const edited = (law: LawEntry) => Object.fromEntries(law.params.map((p) => [p.key, p.max === p.suggested ? p.min : p.max]));
const all = (params: (l: LawEntry) => Record<string, number>): Principle[] => LAWS.map((l) => ({ lawId: l.id, params: params(l) }));
const yamlRules = (p: ProjectFile) => (parseYaml(exportAll(p)["ux-rules.yaml"]) as { rules: { id: string; rule: string }[] }).rules;

describe("criterion 1: each law's rule sentence equals the exported ux-rules.yaml and resolved.rules", () => {
  test("the catalogue has exactly 16 laws (9 UX laws, 7 motion laws)", () => expect(LAWS.length).toBe(16));

  for (const [name, params] of [
    ["suggested", suggested],
    ["edited", edited],
  ] as const) {
    test(`all 16 laws with ${name} params: renderRule == resolved.rules == ux-rules.yaml, in catalogue order`, () => {
      const store = createProjectStore(new MemoryStorage());
      store.open(harbourText);
      store.setPrinciples(all(params));
      const p = store.getState().project;
      const fromYaml = yamlRules(p);
      expect(fromYaml).toHaveLength(LAWS.length);
      expect(p.resolved?.rules).toHaveLength(LAWS.length);
      LAWS.forEach((law, i) => {
        const r = renderRule(law, params(law));
        expect(p.resolved!.rules[i].id).toBe(r.id);
        expect(p.resolved!.rules[i].rule).toBe(r.rule);
        expect(fromYaml[i]).toMatchObject({ id: r.id, rule: r.rule });
      });
    });
  }

  test("a comma-decimal edit (contrast 5,5) reaches the export as 5.5:1", () => {
    const law = LAWS.find((l) => l.id === "wcag-contrast")!;
    const r = parseParamInput("5,5", law.params[0]);
    expect(r).toEqual({ ok: true, value: 5.5 });
    const store = createProjectStore(new MemoryStorage());
    store.open(harbourText);
    store.setPrinciples([{ lawId: "wcag-contrast", params: { minRatio: 5.5 } }]);
    const rule = yamlRules(store.getState().project)[0].rule;
    expect(rule).toBe(renderRule(law, { minRatio: 5.5 }).rule);
    expect(rule).toContain("5.5:1");
  });
});

describe("criterion 2: param parsing", () => {
  const param = (lawId: string) => LAWS.find((l) => l.id === lawId)!.params[0];

  test.each([
    ["fitts", "44,5"],
    ["fitts", "80"],
    ["wcag-contrast", "3"],
    ["fitts", "lots"],
    ["fitts", ""],
    ["fitts", "   "],
    ["fitts", "-1"],
    ["fitts", "1e3"],
    ["response-limits", "1e3"],
    ["response-limits", "1,000"],
    ["hick", "1,5"],
    ["fitts", "0x30"],
    ["fitts", "48 ms"],
    ["wcag-contrast", "4.5px"],
  ])("%s rejects %j", (lawId, raw) => {
    const r = parseParamInput(raw, param(lawId));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/^Enter (a|a whole) number from /);
  });

  test.each([
    ["fitts", "48", 48],
    ["fitts", "48px", 48],
    ["fitts", " 48 PX ", 48],
    ["wcag-contrast", "4,5", 4.5],
    ["wcag-contrast", "7:1", 7],
    ["wcag-contrast", "5,5:1", 5.5],
    ["response-limits", "400 ms", 400],
    ["hick", "2", 2],
    ["wcag-focus-visible", "1,5px", 1.5],
  ])("%s accepts %j as %d", (lawId, raw, value) => {
    expect(parseParamInput(raw, param(lawId))).toEqual({ ok: true, value });
  });

  test("0 is rejected for every param with min > 0, and only apps-native-scroll.max allows 0", () => {
    const params = LAWS.flatMap((l) => l.params.map((p) => ({ law: l.id, p })));
    expect(params.length).toBeGreaterThan(0);
    // max-count's "none allowed" (CONTRACTS §3): the one param where 0 is a real value, not a missing one.
    expect(params.filter(({ p }) => p.min <= 0).map(({ law, p }) => `${law}.${p.key}`)).toEqual(["apps-native-scroll.max"]);
    for (const { p } of params) {
      for (const zero of ["0", "0,0", "0.0", "-0"]) expect(Object.is((parseParamInput(zero, p) as { value?: number }).value, -0)).toBe(false);
      for (const zero of ["0", "0,0", "0.0"]) expect(parseParamInput(zero, p)).toEqual(p.min <= 0 ? { ok: true, value: 0 } : expect.objectContaining({ ok: false }));
      expect(parseParamInput("-0", p)).toEqual(p.min <= 0 ? { ok: true, value: 0 } : expect.objectContaining({ ok: false }));
    }
  });

  test("range messages use the param's units (no '4.5–7 :1')", () => {
    const r = parseParamInput("3", param("wcag-contrast"));
    expect(r).toEqual({ ok: false, message: "Enter a number from 4.5:1 to 7:1. You entered 3:1." });
    const w = parseParamInput("44,5", param("fitts"));
    expect(w).toEqual({ ok: false, message: "Enter a whole number from 24px to 64px." });
  });
});

describe("criterion 3: open vs decided", () => {
  test("a new project has principles null and the export gate lists UX principles as open", () => {
    const p = emptyProject();
    expect(p.principles).toBeNull();
    expect(openDecisions(p)).toContain("UX principles");
  });

  test("setPrinciples(null) opens the decision again and clears resolved", () => {
    const store = createProjectStore(new MemoryStorage());
    store.open(harbourText);
    store.setPrinciples(null);
    const p = store.getState().project;
    expect(p.principles).toBeNull();
    expect(p.resolved).toBeNull();
    expect(openDecisions(p)).toEqual(["UX principles"]);
  });

  test("[] is decided: the export has rules: [] and '0 rules'; going back to null reopens it", () => {
    const store = createProjectStore(new MemoryStorage());
    store.open(harbourText);
    store.setPrinciples([]);
    let p = store.getState().project;
    expect(p.principles).toEqual([]);
    expect(openDecisions(p)).toEqual([]);
    expect(p.resolved?.rules).toEqual([]);
    const files = exportAll(p);
    expect(files["ux-rules.yaml"]).toMatch(/^rules: \[\]$/m);
    expect(files["DESIGN.md"]).toContain("(0 rules)");
    store.setPrinciples(null);
    p = store.getState().project;
    expect(p.principles).toBeNull();
    expect(openDecisions(p)).toContain("UX principles");
  });

  test("the store never defaults principles: setting other decisions on an empty project leaves it null", () => {
    const store = createProjectStore(new MemoryStorage());
    store.setProfile("name", "X");
    store.setVisual("radius", 8);
    expect(store.getState().project.principles).toBeNull();
  });
});

describe("criterion 4: a law change touches only resolved.rules of a kept snapshot", () => {
  const keptHarbour = () => {
    // Make the stored snapshot differ from a fresh computation, then keep it.
    const p = JSON.parse(harbourText);
    p.resolved.lineHeight.text = 1.55;
    const store = createProjectStore(new MemoryStorage());
    expect(store.open(JSON.stringify(p))).toEqual([]);
    expect(store.getState().snapshotDiffers).toBe(true);
    store.keepSnapshot();
    return store;
  };
  const rest = (p: ProjectFile) => {
    const { rules, ...others } = p.resolved!;
    void rules;
    return JSON.stringify(others);
  };

  test("tick, untick and param change keep color, font, fontSize, lineHeight, space and radius byte-identical", () => {
    const store = keptHarbour();
    const before = rest(store.getState().project);
    const base = store.getState().project.principles!;
    store.setPrinciples([...base, { lawId: "response-limits", params: { maxMs: 100 } }]);
    expect(rest(store.getState().project)).toBe(before);
    store.setPrinciples(base.filter((x) => x.lawId !== "hick"));
    expect(rest(store.getState().project)).toBe(before);
    store.setPrinciples(base.map((x) => (x.lawId === "fitts" ? { ...x, params: { minPx: 48 } } : x)));
    const after = store.getState().project;
    expect(rest(after)).toBe(before);
    expect(after.resolved!.rules.find((r) => r.law === "fitts")!.rule).toContain("48px");
  });

  test("re-setting the same laws is a no-op (no emit, no save)", () => {
    const store = keptHarbour();
    let emits = 0;
    store.subscribe(() => emits++);
    const state = store.getState();
    store.setPrinciples(structuredClone(state.project.principles));
    expect(emits).toBe(0);
    expect(store.getState()).toBe(state);
  });
});

describe("criterion 7: reload restores laws and params, exports byte-identical", () => {
  test("a new store over the same storage restores principles and exports the same bytes", () => {
    const storage = new MemoryStorage();
    const a = createProjectStore(storage);
    a.open(harbourText);
    a.setPrinciples(harbour().principles!.map((x) => (x.lawId === "fitts" ? { ...x, params: { minPx: 48 } } : x)));
    const pa = a.getState().project;
    const b = createProjectStore(storage);
    const pb = b.getState().project;
    expect(pb.principles).toEqual(pa.principles);
    expect(serialize(pb)).toBe(serialize(pa));
    expect(exportAll(pb)).toEqual(exportAll(pa));
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).file).toBe(serialize(pa));
  });

  test("principles [] reloads as [], not null", () => {
    const storage = new MemoryStorage();
    const a = createProjectStore(storage);
    a.open(harbourText);
    a.setPrinciples([]);
    expect(createProjectStore(storage).getState().project.principles).toEqual([]);
  });
});
