import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { contrastRatio, passes } from "@/domain/color/contrast";
import { normalizeHex } from "@/domain/color/hex";

// The chrome's contrast pairs (DESIGN.md Part B "Contrast"), computed from globals.css in both themes with the
// owner of the WCAG formula. Ratios are never typed here: change a token and this test recomputes it.
const css = readFileSync(join(__dirname, "..", "..", "src", "app", "globals.css"), "utf8");

function block(selector: RegExp): Record<string, string> {
  const start = css.search(selector);
  expect(start, `${selector} block in globals.css`).toBeGreaterThanOrEqual(0);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/--(dw-[a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) {
    const hex = normalizeHex(m[2]);
    expect(hex, `${m[1]} is a hex colour`).not.toBeNull();
    tokens[m[1]] = hex!;
  }
  return tokens;
}

// \s* so a CRLF checkout finds the same blocks.
const THEMES = { dark: block(/:root,\s*\[data-theme="dark"\]\s*\{/), light: block(/\[data-theme="light"\]\s*\{/) };
const BACKGROUNDS = ["dw-rail", "dw-bg", "dw-aside", "dw-surface", "dw-hover", "dw-selected"];

/** [foreground, backgrounds, minimum ratio]. Text 4.5, non-text (control borders, focus, chip, crop marks) 3. */
const PAIRS: [string, string[], number][] = [
  ["dw-text", [...BACKGROUNDS, "dw-plate"], 4.5],
  ["dw-text-muted", BACKGROUNDS, 4.5],
  ["dw-text-muted", ["dw-plate"], 3], // crop marks only: no text sits on a plate
  ["dw-accent", BACKGROUNDS, 4.5],
  ["dw-ctl", BACKGROUNDS, 3],
  ["dw-focus", [...BACKGROUNDS, "dw-plate"], 3],
  ["dw-on-accent", ["dw-accent-fill"], 4.5], // the number on the current-step chip
  ["dw-accent-fill", ["dw-rail"], 3], // the chip against the rail
  ["dw-bg", ["dw-text"], 4.5], // primary button label on its ink fill
];

describe.each(Object.entries(THEMES))("%s theme", (_name, t) => {
  test("defines the same chrome tokens as the other theme", () => {
    expect(Object.keys(t).sort()).toEqual(Object.keys(THEMES.dark).sort());
  });

  test.each(PAIRS)("%s on %j meets %d:1", (fg, bgs, min) => {
    for (const bg of bgs) {
      expect(t[fg], fg).toBeDefined();
      expect(t[bg], bg).toBeDefined();
      const ratio = contrastRatio(t[fg], t[bg]);
      expect(passes(ratio, min), `${fg} on ${bg}: ${ratio.toFixed(2)}`).toBe(true);
    }
  });

  test("plates stay R=G=B", () => {
    const [r, g, b] = [1, 3, 5].map((i) => t["dw-plate"].slice(i, i + 2));
    expect(r === g && g === b).toBe(true);
  });
});
