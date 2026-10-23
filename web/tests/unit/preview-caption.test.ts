import { expect, test } from "vitest";
import { emptyProject } from "@/data/project/empty";
import { isCandidateInUse } from "@/components/wizard/preview-candidate";

// The live preview caption's "in use" / "not used yet" (slice 5b2): the candidate against the project's value.
test("radius 0 is a real value: in use when the project uses 0, not used yet when the decision is open", () => {
  const visual = { ...emptyProject().visual, radius: 0 };
  expect(isCandidateInUse(visual, { key: "radius", value: 0 })).toBe(true);
  expect(isCandidateInUse(visual, { key: "radius", value: 6 })).toBe(false);
  expect(isCandidateInUse(emptyProject().visual, { key: "radius", value: 0 })).toBe(false);
});

test("every kind of value compares by value: palette, density, spacing and font pair", () => {
  const visual = { ...emptyProject().visual, paletteVariant: "tinted" as const, density: "airy" as const, spacingBase: 4, fontPair: "sora-inter" };
  expect(isCandidateInUse(visual, { key: "paletteVariant", value: "tinted" })).toBe(true);
  expect(isCandidateInUse(visual, { key: "paletteVariant", value: "deep" })).toBe(false);
  expect(isCandidateInUse(visual, { key: "density", value: "airy" })).toBe(true);
  expect(isCandidateInUse(visual, { key: "spacingBase", value: 8 })).toBe(false);
  expect(isCandidateInUse(visual, { key: "fontPair", value: "sora-inter" })).toBe(true);
});
