import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { COLOR_ROLES, FONT_SIZE_KEYS, SPACE_KEYS } from "@/contracts/project";
import { emptyProject } from "@/data/project/empty";
import { parse } from "@/data/project/parse";
import { createProjectStore } from "@/data/project/store";
import { plateVars } from "@/domain/tokens/plate-vars";
import { PREVIEW_NEUTRALS, resolveForPlate, resolveSnapshot } from "@/domain/tokens/resolve";
import { spaceScale, typeScale } from "@/domain/tokens/scales";

const harbourText = readFileSync(join(__dirname, "..", "..", "fixtures", "harbour.project.json"), "utf8");
const harbour = () => {
  const r = parse(harbourText);
  if (!r.ok) throw new Error("harbour must parse");
  return r.project;
};

test("compact density gives the Harbour type scale; space is key × base", () => {
  expect(typeScale("compact").fontSize).toEqual(harbour().resolved!.fontSize);
  expect(spaceScale(4)).toEqual(harbour().resolved!.space);
  for (const d of ["compact", "balanced", "airy"] as const) {
    const sizes = FONT_SIZE_KEYS.map((k) => typeScale(d).fontSize[k]);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  }
});

test("resolveSnapshot is null while any decision is open and complete otherwise", () => {
  expect(resolveSnapshot(emptyProject())).toBeNull();
  const p = harbour();
  expect(resolveSnapshot({ ...p, visual: { ...p.visual, density: null } })).toBeNull();
  const r = resolveSnapshot(p)!;
  expect(r.radius).toBe(8);
  expect(r.font.display.catalogueId).toBe("sora");
  expect(r.rules.map((x) => x.id)).toEqual(p.resolved!.rules.map((x) => x.id));
  expect(Object.keys(r.color.light)).toEqual([...COLOR_ROLES]);
});

test("plates use the candidate, then the decisions made, then preview-only neutrals", () => {
  const visual = { ...emptyProject().visual, radius: 0 };
  const t = resolveForPlate(visual, { spacingBase: 8 });
  expect(t.radius).toBe(0);
  expect(t.space["1"]).toBe(8);
  expect(t.font.display.catalogueId).toBe("inter");
  expect(t.fontSize).toEqual(typeScale(PREVIEW_NEUTRALS.density).fontSize);
});

test("plateVars sets every --v-* variable of CONTRACTS §6 and nothing else", () => {
  const vars = plateVars(resolveForPlate(harbour().visual, {}));
  const expected = [
    ...COLOR_ROLES.map((r) => `--v-${r}`),
    "--v-font-display", "--v-font-text", "--v-weight-display", "--v-weight-text", "--v-weight-strong",
    ...FONT_SIZE_KEYS.map((k) => `--v-fs-${k}`), "--v-lh-text", "--v-lh-display",
    ...SPACE_KEYS.map((k) => `--v-space-${k}`), "--v-radius",
  ];
  expect(Object.keys(vars).sort()).toEqual(expected.sort());
  expect(vars["--v-font-display"]).toBe('"dwv-sora", sans-serif');
  expect(vars["--v-radius"]).toBe("8px");
});

test("store decision actions keep resolved null until the last decision, then resolve it", () => {
  const store = createProjectStore(null);
  const p = harbour();
  store.setProfile("name", "Harbour");
  store.setProfile("productType", "Clinic booking");
  store.setProfile("platform", "desktop");
  store.setPrinciples(p.principles);
  for (const key of ["fontPair", "spacingBase", "radius", "density", "brandHex"] as const) {
    store.setVisual(key, p.visual[key] as never);
    expect(store.getState().project.resolved).toBeNull();
  }
  store.setVisual("paletteVariant", "tinted");
  const resolved = store.getState().project.resolved!;
  expect(resolved.color.light.accent).toBe("#0F766E");
  store.setVisual("radius", null);
  expect(store.getState().project.resolved).toBeNull();
});

test("form input accepts the ways people type values and rejects junk", async () => {
  const { parseHexInput, parseNumberInput } = await import("@/domain/parse-input");
  expect(parseHexInput("0f766e")).toEqual({ ok: true, value: "#0F766E" });
  expect(parseHexInput(" #abc ")).toEqual({ ok: true, value: "#AABBCC" });
  expect(parseHexInput("teal").ok).toBe(false);
  const px = { min: 0, max: 32, integer: true, unit: "px" };
  expect(parseNumberInput("8", px)).toEqual({ ok: true, value: 8 });
  expect(parseNumberInput("8px", px)).toEqual({ ok: true, value: 8 });
  expect(parseNumberInput("8,0", px)).toEqual({ ok: true, value: 8 });
  expect(parseNumberInput("0", px)).toEqual({ ok: true, value: 0 });
  expect(parseNumberInput("8.5", px).ok).toBe(false);
  expect(parseNumberInput("40", px).ok).toBe(false);
  expect(parseNumberInput("eight", px).ok).toBe(false);
  expect(parseNumberInput("4,5", { min: 3, max: 7, integer: false })).toEqual({ ok: true, value: 4.5 });
});

test("a saved spacing or radius outside the fixed candidates is always shown", async () => {
  const { numericCandidates } = await import("@/domain/decisions");
  expect(numericCandidates("radius", null)).toEqual([0, 6, 14]);
  expect(numericCandidates("radius", 6)).toEqual([0, 6, 14]);
  expect(numericCandidates("radius", 8)).toEqual([0, 8, 14]);
  expect(numericCandidates("radius", 32)).toEqual([0, 6, 32]);
  expect(numericCandidates("radius", 1)).toEqual([1, 6, 14]);
  expect(numericCandidates("spacingBase", 5)).toEqual([5, 6, 8]);
});

test("font pairs are paged evenly: 2–3 per page, no duplicates, nothing left out", async () => {
  const { evenPages } = await import("@/domain/decisions");
  const sizes = (n: number) => evenPages(n).map(([a, b]) => b - a);
  expect(sizes(7)).toEqual([3, 2, 2]);
  expect(sizes(3)).toEqual([3]);
  expect(sizes(4)).toEqual([2, 2]);
  expect(sizes(5)).toEqual([3, 2]);
  expect(sizes(8)).toEqual([3, 3, 2]);
  for (let n = 2; n <= 40; n++) {
    const pages = evenPages(n);
    const ids = pages.flatMap(([a, b]) => Array.from({ length: b - a }, (_, i) => a + i));
    expect(ids).toEqual(Array.from({ length: n }, (_, i) => i));
    for (const [a, b] of pages) expect(b - a === 2 || b - a === 3).toBe(true);
  }
});

test("a brand colour change never stores grey preview colours", async () => {
  const { resolveSnapshot } = await import("@/domain/tokens/resolve");
  const palette = await import("@/domain/color/palette");
  const p = harbour();
  expect(resolveSnapshot(p)?.color.light.accent).toBe("#0F766E");
  const spy = vi.spyOn(palette, "palette").mockReturnValue(null);
  expect(resolveSnapshot(p)).toBeNull();
  spy.mockRestore();
});

test("the path runs through the labs in order (12 stops, slice 5b); E finds the nearest decided stop", async () => {
  const { DECISIONS, LABS, STOPS, firstOpenStop, isStopDecided, labOfStop, lastDecidedStopBefore, nextStop, pathPosition, prevStop, stopsOfLab } =
    await import("@/domain/decisions");
  expect(STOPS.map((s) => s.id)).toEqual([
    "profile.identity", "profile.platform", "profile.library", "visual.brandHex", "visual.paletteVariant",
    "visual.fontPair", "visual.spacingBase", "visual.radius", "visual.density", "principles", "preview", "export",
  ]);
  expect(LABS.map((l) => l.title)).toEqual(["Profile", "Color", "Type", "Space & shape", "Laws", "Preview", "Export"]);
  // Every stop belongs to a lab, the labs' stops read in path order, and every decision is made on a real stop.
  expect(LABS.flatMap((l) => stopsOfLab(l.id).map((s) => s.id))).toEqual(STOPS.map((s) => s.id));
  for (const d of DECISIONS) expect(STOPS.some((s) => s.id === d.stop), d.path).toBe(true);
  expect(labOfStop("visual.density").title).toBe("Space & shape");
  expect(pathPosition("visual.brandHex")).toEqual({ n: 4, total: 12 });
  const empty = emptyProject();
  expect(isStopDecided(empty, "visual.brandHex")).toBe(false);
  expect(isStopDecided(harbour(), "visual.brandHex")).toBe(true);
  expect(firstOpenStop(empty)).toBe("profile.identity");
  expect(isStopDecided(empty, "profile.library")).toBe(true);
  expect(nextStop("profile.library")).toBe("visual.brandHex");
  expect(prevStop("visual.fontPair")).toBe("visual.paletteVariant");
  expect(nextStop("visual.density")).toBe("principles");
  expect(nextStop("principles")).toBe("preview");
  expect(nextStop("preview")).toBe("export");
  expect(nextStop("export")).toBeNull();
  expect(isStopDecided(empty, "export")).toBe(true);
  expect(isStopDecided(empty, "preview")).toBe(true);
  expect(lastDecidedStopBefore(empty, "visual.fontPair")).toBe("profile.library");
  expect(firstOpenStop(harbour())).toBeNull();
});

test("links: ?step= wins, aliases still work, ?lab= opens the lab's first open stop, unknown values are reported", async () => {
  const { stopFromLink } = await import("@/domain/decisions");
  const empty = emptyProject();
  expect(stopFromLink(empty, "visual.palette", null)).toEqual({ stop: "visual.paletteVariant", warning: null });
  expect(stopFromLink(empty, "visual.spacing", "color")).toEqual({ stop: "visual.spacingBase", warning: null });
  expect(stopFromLink(empty, null, "color")).toEqual({ stop: "visual.brandHex", warning: null });
  expect(stopFromLink(harbour(), null, "space")).toEqual({ stop: "visual.spacingBase", warning: null });
  expect(stopFromLink(empty, "visual.nope", null).stop).toBeNull();
  expect(stopFromLink(empty, "visual.nope", null).warning).toContain("Unknown ?step=visual.nope");
  expect(stopFromLink(empty, null, "sound").warning).toContain("Unknown ?lab=sound");
  // ?step= wins, but an unknown ?lab= beside it is still reported.
  expect(stopFromLink(empty, "visual.palette", "sound")).toEqual({ stop: "visual.paletteVariant", warning: "Unknown ?lab=sound (ignored: ?step= wins)." });
  expect(stopFromLink(empty, null, null)).toEqual({ stop: null, warning: null });
});

test("law params parse as typed and report the range in the param's own units", async () => {
  const { parseParamInput } = await import("@/domain/parse-input");
  const { LAW_BY_ID } = await import("@/content/laws");
  const minPx = LAW_BY_ID.get("fitts")!.params[0];
  const ratio = LAW_BY_ID.get("wcag-contrast")!.params[0];
  expect(parseParamInput("44", minPx)).toEqual({ ok: true, value: 44 });
  expect(parseParamInput(" 48 px ", minPx)).toEqual({ ok: true, value: 48 });
  expect(parseParamInput("44,5", minPx)).toEqual({ ok: false, message: "Enter a whole number from 24px to 64px." });
  expect(parseParamInput("80", minPx)).toEqual({ ok: false, message: "Enter a whole number from 24px to 64px. You entered 80px." });
  expect(parseParamInput("4,5", ratio)).toEqual({ ok: true, value: 4.5 });
  expect(parseParamInput("7:1", ratio)).toEqual({ ok: true, value: 7 });
  expect(parseParamInput("3", ratio)).toEqual({ ok: false, message: "Enter a number from 4.5:1 to 7:1. You entered 3:1." });
  expect(parseParamInput("lots", ratio).ok).toBe(false);
});

test("changing laws updates only resolved.rules; a kept snapshot's colours stay", () => {
  const store = createProjectStore(null);
  store.open(harbourText);
  store.keepSnapshot();
  const before = store.getState().project.resolved!;
  const principles = store.getState().project.principles!.map((p) => (p.lawId === "fitts" ? { ...p, params: { minPx: 48 } } : p));
  store.setPrinciples(principles);
  const after = store.getState().project.resolved!;
  expect(after.color).toBe(before.color);
  expect(after.fontSize).toBe(before.fontSize);
  expect(after.rules.find((r) => r.law === "fitts")?.rule).toBe("Make every interactive element at least 48px by 48px.");
  store.setPrinciples(null);
  expect(store.getState().project.resolved).toBeNull();
});

test("law params take at most 2 decimals, which is what the rule shows", async () => {
  const { parseParamInput } = await import("@/domain/parse-input");
  const { LAW_BY_ID } = await import("@/content/laws");
  const ratio = LAW_BY_ID.get("wcag-contrast")!.params[0];
  expect(parseParamInput("4,56", ratio)).toEqual({ ok: true, value: 4.56 });
  expect(parseParamInput("4.567", ratio)).toEqual({ ok: false, message: "Enter a number from 4.5:1 to 7:1, with at most 2 decimals." });
});

test("the demo contrast labels state the floored ratio of what is drawn", async () => {
  const { DEMO_VALUES } = await import("@/components/plate/demo-vars");
  const { contrastRatio, formatRatio } = await import("@/domain/color/contrast");
  expect(DEMO_VALUES.passRatio).toBe(formatRatio(contrastRatio(DEMO_VALUES.passGrey, "#FFFFFF")));
  expect(DEMO_VALUES.passRatio).toBe("6.48");
  expect(DEMO_VALUES.failRatio).toBe("2.81");
});
