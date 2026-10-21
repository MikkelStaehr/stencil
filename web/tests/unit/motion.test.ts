import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { APP_MOTION_CEILING_MS, MOTION_DURATIONS, MOTION_EASINGS } from "@/domain/motion";
import { motionCss } from "@/export/motion-md";

const golden = readFileSync(join(__dirname, "..", "contract", "golden", "harbour", "DESIGN.md"), "utf8");
const section = golden.slice(golden.indexOf("## Motion\n"), golden.indexOf("## Iconography & imagery\n"));

test("durations: unique keys, whole ms above 0, apps stay at or under the ceiling, website reveals go beyond it", () => {
  expect(new Set(MOTION_DURATIONS.map((d) => d.key)).size).toBe(MOTION_DURATIONS.length);
  for (const d of MOTION_DURATIONS) {
    expect(Number.isInteger(d.ms) && d.ms > 0).toBe(true);
    if (d.websitesOnly) expect(d.ms).toBeGreaterThan(APP_MOTION_CEILING_MS);
    else expect(d.ms).toBeLessThanOrEqual(APP_MOTION_CEILING_MS);
  }
  expect(APP_MOTION_CEILING_MS).toBe(300);
});

test("easings: no ease-in, and every cubic-bezier has x1 and x2 within 0–1", () => {
  for (const e of MOTION_EASINGS) {
    expect(e.key).not.toBe("in");
    const m = /^cubic-bezier\(([^)]*)\)$/.exec(e.css);
    if (m === null) {
      expect(e.css).toBe("ease");
      continue;
    }
    const [x1, , x2] = m[1].split(",").map(Number);
    expect(x1).toBeGreaterThanOrEqual(0);
    expect(x1).toBeLessThanOrEqual(1);
    expect(x2).toBeGreaterThanOrEqual(0);
    expect(x2).toBeLessThanOrEqual(1);
  }
});

test("the exported Motion section carries motionCss() exactly and a table row per token", () => {
  expect(section).toContain("```css\n" + motionCss() + "\n```\n");
  for (const d of MOTION_DURATIONS) expect(section).toContain(`| \`duration.${d.key}\` | ${d.ms}ms |`);
  for (const e of MOTION_EASINGS) expect(section).toContain(`| \`ease.${e.key}\` | \`${e.css}\` |`);
  expect(section.split("\n").filter((l) => l.startsWith("> **open: design-lead**"))).toHaveLength(1);
});

test("the Motion section holds nothing Mainframe reads as HTML (app/web/src/lib/design/export.ts designProblem)", () => {
  expect(/(^|[^\\])(\\\\)*<[A-Za-z/!?]/m.test(section)).toBe(false);
});
