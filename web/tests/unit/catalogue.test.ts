// Catalogue checks (docs/CONTRACTS.md §5): the curated laws, fonts and pairs are internally consistent,
// every font file exists once under public/fonts/ with its licence, and nothing unlisted ships.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CHECK_PARAMS } from "@/contracts/rules";
import { FONT_PAIRS } from "@/content/font-pairs";
import { FONT_BY_ID, FONTS } from "@/content/fonts";
import { LAWS } from "@/content/laws";

const FONTS_DIR = join(__dirname, "..", "..", "public", "fonts");
/** The wizard's own chrome fonts: shipped, but never project options. */
const CHROME = ["geist", "geist-mono"];

describe("laws", () => {
  test("ids are unique kebab-case", () => {
    const ids = LAWS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test.each(LAWS.map((l) => [l.id, l] as const))("%s: template, params and check agree", (_, law) => {
    const inTemplate = [...law.rule.template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const keys = law.params.map((p) => p.key);
    expect([...new Set(inTemplate)].sort()).toEqual([...keys].sort());
    expect(keys).toEqual(CHECK_PARAMS[law.rule.check.kind]);
    for (const p of law.params) {
      expect(p.suggested).toBeGreaterThanOrEqual(p.min);
      expect(p.suggested).toBeLessThanOrEqual(p.max);
      if (p.integer) expect(Number.isInteger(p.suggested)).toBe(true);
    }
    const manual = law.rule.check.kind === "manual";
    expect(law.rule.check.selector === null).toBe(manual);
    expect(law.rule.check.question !== undefined).toBe(manual);
    if (manual) expect(law.rule.check.question).toMatch(/^.{10,199}\?$/);
  });

  test("the response-time check targets primary actions only, never every button", () => {
    const rule = LAWS.find((l) => l.rule.check.kind === "response-time");
    expect(rule?.rule.check.selector).toBe("[data-primary-action]");
  });
});

describe("fonts", () => {
  test.each(FONTS.map((f) => [f.id, f] as const))("%s: files exist, licence travels with them", (_, font) => {
    expect(font.license).toBe("OFL-1.1");
    expect(CHROME).not.toContain(font.id);
    for (const { file } of font.files) expect(existsSync(join(FONTS_DIR, font.id, file)), file).toBe(true);
    const ofl = readFileSync(join(FONTS_DIR, font.id, "OFL.txt"), "utf8");
    expect(ofl.split(/\r?\n/)[0]).toBe(font.copyright);
    expect(ofl).toContain("SIL OPEN FONT LICENSE Version 1.1");
  });

  test("no woff2 ships that the catalogue or the chrome doesn't list", () => {
    const listed = new Set(FONTS.flatMap((f) => f.files.map((x) => `${f.id}/${x.file}`)));
    for (const dir of readdirSync(FONTS_DIR)) {
      if (CHROME.includes(dir)) continue;
      for (const file of readdirSync(join(FONTS_DIR, dir)).filter((x) => x.endsWith(".woff2"))) {
        expect(listed.has(`${dir}/${file}`), `${dir}/${file}`).toBe(true);
      }
    }
  });
});

describe("font pairs", () => {
  test("ids are unique", () => {
    const ids = FONT_PAIRS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(FONT_PAIRS.map((p) => [p.id, p] as const))("%s: fonts exist, roles fit, weights ship", (_, pair) => {
    for (const role of ["display", "text"] as const) {
      const font = FONT_BY_ID.get(pair[role].font);
      expect(font, pair[role].font).toBeDefined();
      expect(font!.roles).toContain(role);
      const weights = font!.files.map((f) => f.weight);
      for (const w of pair[role].weights) expect(weights).toContain(w);
    }
  });
});
