// C1 (harbour) and C2 (edge cases): exports are byte-equal to the committed goldens.
import { describe, expect, test } from "vitest";
import { exportAll, projectFileName } from "@/export";
import { EXPORT_FILES, readGolden, validFixtures } from "./fixtures";

const fixtures = validFixtures();
const exports = new Map(fixtures.map(({ name, project }) => [name, exportAll(project)]));

describe("C1/C2 goldens", () => {
  test("the harbour fixture and every edge case are covered", () => {
    expect(fixtures.map((f) => f.name)).toEqual([
      "edge-name", "edge-no-shadcn", "edge-radius-0", "edge-single-family", "edge-yellow", "edge-zero-laws", "harbour",
    ]);
  });

  for (const { name } of fixtures) {
    test.each(EXPORT_FILES)(`${name}: %s is byte-equal to its golden`, (file) => {
      expect(exports.get(name)![file]).toBe(readGolden(name, file));
    });
  }

  test("exports are deterministic", () => {
    const h = fixtures.find((f) => f.name === "harbour")!.project;
    expect(exportAll(h)).toEqual(exportAll(h));
  });

  test("radius 0 is exported as 0px, never dropped", () => {
    const md = readGolden("edge-radius-0", "DESIGN.md");
    expect(md).toContain("- **Radius:** 0px");
    expect(md).toContain("  --radius: 0px; /* radius.base */");
    expect(readGolden("edge-radius-0", "tokens.json")).toContain('"value": 0,\n        "unit": "px"');
  });

  test("componentLibrary none keeps tokens.json identical and drops the shadcn layer", () => {
    expect(readGolden("edge-no-shadcn", "tokens.json")).toBe(readGolden("harbour", "tokens.json"));
    const md = readGolden("edge-no-shadcn", "DESIGN.md");
    expect(md).not.toContain("--background");
    expect(md).toContain("  --bg: #E8FAF8; /* color.bg */");
  });

  test("names are slugged and escaped", () => {
    const named = fixtures.find((f) => f.name === "edge-name")!.project;
    expect(projectFileName(named)).toBe("norrebro-idas-1.dwproj.json");
    const md = readGolden("edge-name", "DESIGN.md");
    expect(md).toContain('# Design system – Nørrebro: "Ida\'s" #1');
    expect(md).toContain("`design/norrebro-idas-1.dwproj.json`");
    expect(md).toContain("Clinic booking \\| \\*beta\\* \\<v1\\>");
    expect(readGolden("edge-name", "ux-rules.yaml")).toContain('project: "Nørrebro: \\"Ida\'s\\" #1"');
  });

  test("zero laws export an empty rule list", () => {
    expect(readGolden("edge-zero-laws", "ux-rules.yaml")).toContain("\nrules: []\n");
    expect(readGolden("edge-zero-laws", "DESIGN.md")).toContain("(0 rules)");
  });

  test("every open item uses the exact marker line", () => {
    const md = readGolden("harbour", "DESIGN.md");
    const markers = md.split("\n").filter((l) => l.includes("open: design-lead") && l.startsWith(">"));
    expect(markers.length).toBeGreaterThanOrEqual(10);
    for (const m of markers) expect(m).toBe("> **open: design-lead** – not decided in Stencil.");
  });
});
