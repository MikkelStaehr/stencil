// Exported DESIGN.md Part B (docs/CONTRACTS.md §4): the template's headings in the template's order.
// The CSS block is mapped from the tokens object, never from the store (C4).
import { COLOR_ROLES, type FontRef, type ProjectFile } from "@/contracts/project";
import { checkPairs } from "@/domain/color/pairs";
import { assertExportable } from "@/domain/decisions";
import { formatRatio } from "@/domain/color/contrast";
import { mdEscape } from "@/lib/md-escape";
import { slug } from "@/lib/slug";
import { roleCss } from "./css-vars";
import { shadcnCss, shadcnTable } from "./shadcn-map";
import { buildTokens, requireResolved } from "./tokens-json";

/** The line that marks a Part B item Stencil leaves to design-lead. */
export const OPEN = "> **open: design-lead** – not decided in Stencil.";

/** How many open: design-lead items an exported DESIGN.md holds (exact marker lines). */
export function openMarkerCount(text: string): number {
  return text.split("\n").filter((line) => line === OPEN).length;
}

const open = (label: string) => [`**${label}**`, OPEN];
const trimNum = (n: number) => String(Math.round(n * 100) / 100);

function fontLine(f: FontRef): string {
  return `${mdEscape(f.family)} ${f.weights.join(" / ")}`;
}

function loading(fonts: FontRef[]): string {
  const unique = [...new Map(fonts.map((f) => [f.catalogueId, f])).values()];
  const packages = unique.map((f) => `\`${f.fontsource}\``).join(", ");
  return (
    `Self-host the vendored Fontsource files (${packages}; latin subset; SIL OFL 1.1, keep each family's OFL.txt next to its files) ` +
    "with `next/font/local`, exposing `--font-display-face` and `--font-text-face`. " +
    "Alternative only where Google Fonts is reachable: `next/font/google`."
  );
}

export function designMd(p: ProjectFile): string {
  assertExportable(p);
  const r = requireResolved(p);
  const tokens = buildTokens(p);
  const n = r.rules.length;
  const notes = p.profile.notes === "" ? "none" : p.profile.notes.split(/\r\n|\r|\n/).map(mdEscape).join("\\\n  ");
  const lines: string[] = [
    `# Design system – ${mdEscape(r.name)}`,
    "",
    `> Part B exported by Design Wizard from \`design/${slug(r.name)}.dwproj.json\` (project file schema v1). ` +
      "Reopen that file in Design Wizard to change a decision. Part A comes from the ProjectStart template and is not included. " +
      `UX rules: \`ux-rules.yaml\` (${n} ${n === 1 ? "rule" : "rules"}).`,
    "",
    "## Product profile",
    "",
    `- **Product type:** ${mdEscape(p.profile.productType)}`,
    `- **Platform:** ${p.profile.platform}`,
    `- **Notes:** ${notes}`,
    "",
    ...open("Primary users & context"),
    "",
    ...open("Locale"),
    "",
    ...open("References"),
    "",
    ...open("Pattern packs"),
    "",
    "# Part B – Direction (per project)",
    "",
    "## Personality",
    "",
    OPEN,
    "",
    "## Signature element(s)",
    "",
    OPEN,
    "",
    "## Type",
    "",
    `- **Display:** ${fontLine(r.font.display)}`,
    `- **Text:** ${fontLine(r.font.text)}`,
    `- **Scale:** ${Object.entries(r.fontSize).map(([k, rem]) => `${k} ${trimNum(rem * 16)}px (${rem}rem)`).join(" · ")}`,
    `- **Line height:** text ${r.lineHeight.text} · display ${r.lineHeight.display}`,
    `- **Loading:** ${loading([r.font.display, r.font.text])}`,
    "",
    ...open("Numerals"),
    "",
    "## Colour",
    "",
    `- **Brand colour:** ${p.visual.brandHex} · **Palette:** ${p.visual.paletteVariant}`,
    "- Dark theme: not defined in v0.1.",
    "",
    "| Role | Hex |",
    "|---|---|",
    ...COLOR_ROLES.map((role) => `| \`${role}\` | ${r.color.light[role]} |`),
    "",
    "**Contrast (WCAG 2.x, AA)**",
    "",
    "| Pair | Ratio | Minimum | Result |",
    "|---|---|---|---|",
    ...checkPairs(r.color.light).map((x) => `| ${x.fg} / ${x.bg} | ${formatRatio(x.ratio)} : 1 | ≥ ${x.min} | ${x.pass ? "PASS" : "FAIL"} |`),
    "",
  ];
  if (p.profile.componentLibrary === "shadcn") {
    lines.push("**shadcn/ui variables**", "", ...shadcnTable(), "", "```css", shadcnCss(tokens), "```", "");
  } else {
    lines.push("**CSS variables**", "", "```css", roleCss(tokens), "```", "");
  }
  lines.push(
    ...open("Accent usage"),
    "",
    "## Shape & depth",
    "",
    `- **Radius:** ${r.radius}px`,
    "",
    ...open("Borders vs. shadows"),
    "",
    ...open("Elevation levels"),
    "",
    "## Space & density",
    "",
    `- **Spacing base:** ${p.visual.spacingBase}px`,
    `- **Scale:** ${Object.entries(r.space).map(([k, v]) => `${k} = ${v}px`).join(" · ")}`,
    `- **Density:** ${p.visual.density}`,
    "",
    ...open("Max content width"),
    "",
    "## Motion",
    "",
    OPEN,
    "",
    "## Iconography & imagery",
    "",
    OPEN,
    "",
    "## Project rules",
    "",
    OPEN,
  );
  return `${lines.join("\n")}\n`;
}
