// Owner of the labs and the path's ordered stops, the list of decisions, which are open, and the export gate
// (docs/ARCHITECTURE.md §4). The parser and the exporters both ask this module.
import type { ProjectFile, Visual } from "@/contracts/project";

/**
 * Every decision (`null` = open; notes and componentLibrary are not decisions) with the stop that makes or changes it.
 * This order is the export gate's "Still open" order and stays fixed (exports and messages are byte-stable); the UI
 * lists open decisions in path order instead (openDecisionStops).
 */
export const DECISIONS: readonly { path: string; label: string; stop: StopId; get: (p: ProjectFile) => unknown }[] = [
  { path: "profile.name", label: "Project name", stop: "profile.identity", get: (p) => p.profile?.name },
  { path: "profile.productType", label: "Product type", stop: "profile.identity", get: (p) => p.profile?.productType },
  { path: "profile.platform", label: "Platform", stop: "profile.platform", get: (p) => p.profile?.platform },
  { path: "principles", label: "UX principles", stop: "principles", get: (p) => p.principles },
  { path: "visual.fontPair", label: "Font pair", stop: "visual.fontPair", get: (p) => p.visual?.fontPair },
  { path: "visual.spacingBase", label: "Spacing base", stop: "visual.spacingBase", get: (p) => p.visual?.spacingBase },
  { path: "visual.radius", label: "Radius", stop: "visual.radius", get: (p) => p.visual?.radius },
  { path: "visual.brandHex", label: "Brand colour", stop: "visual.brandHex", get: (p) => p.visual?.brandHex },
  { path: "visual.paletteVariant", label: "Palette", stop: "visual.paletteVariant", get: (p) => p.visual?.paletteVariant },
  { path: "visual.density", label: "Density", stop: "visual.density", get: (p) => p.visual?.density },
];

/** The open decisions with the stop that reopens each, in path order (the export step's blocked list). */
export function openDecisionStops(p: ProjectFile): { label: string; stop: StopId }[] {
  return DECISIONS.filter((d) => d.get(p) === null)
    .map((d) => ({ label: d.label, stop: d.stop }))
    .sort((a, b) => STOP_IDS.indexOf(a.stop) - STOP_IDS.indexOf(b.stop));
}

/** Labels of the decisions that are still open (null), in DECISIONS order (the export gate's message). */
export function openDecisions(p: ProjectFile): string[] {
  return DECISIONS.filter((d) => d.get(p) === null).map((d) => d.label);
}

/** Export gate: every decision made and the snapshot resolved. Throws with every open decision named. */
export function assertExportable(p: ProjectFile): asserts p is ProjectFile & {
  profile: { name: string; productType: string; platform: NonNullable<ProjectFile["profile"]["platform"]> };
  principles: NonNullable<ProjectFile["principles"]>;
  resolved: NonNullable<ProjectFile["resolved"]>;
} {
  const open = openDecisions(p);
  if (open.length > 0) throw new Error(`Export is blocked. Still open: ${open.join(", ")}.`);
  if (p.resolved === null) throw new Error("Export is blocked: the design snapshot has not been resolved yet.");
}

/** The visual sub-decisions shown as 2–3 plates; each is a stop `visual.<key>` (the brand colour is its own stop, a field). */
export const VISUAL_SUBDECISIONS = [
  { key: "fontPair", label: "Font pair" },
  { key: "spacingBase", label: "Spacing" },
  { key: "radius", label: "Radius" },
  { key: "paletteVariant", label: "Brand colour → palette" },
  { key: "density", label: "Density" },
] as const;
export type VisualKey = (typeof VISUAL_SUBDECISIONS)[number]["key"];

/** Fixed candidates shown as 3 variants. Font pairs and palettes come from content/ and palette.ts. */
export const VISUAL_CANDIDATES = {
  spacingBase: [4, 6, 8],
  radius: [0, 6, 14],
  density: ["compact", "balanced", "airy"],
} as const;

/**
 * The 3 values shown for spacing or radius. A saved value that isn't a fixed candidate (a file may hold
 * any valid value) replaces the nearest candidate, so the user's choice is always on screen.
 */
export function numericCandidates(key: "spacingBase" | "radius", saved: number | null): number[] {
  const fixed: number[] = [...VISUAL_CANDIDATES[key]];
  if (saved === null || fixed.includes(saved)) return fixed;
  let nearest = 0;
  fixed.forEach((v, i) => {
    if (Math.abs(v - saved) < Math.abs(fixed[nearest] - saved)) nearest = i;
  });
  fixed[nearest] = saved;
  return fixed.sort((a, b) => a - b);
}

/**
 * Splits n items into the fewest pages of at most 3, as evenly as possible (7 → 3, 2, 2), so every
 * page shows 2–3 variants side by side and nothing repeats. Returns [start, end) per page.
 */
export function evenPages(n: number, max = 3): [number, number][] {
  const count = Math.max(1, Math.ceil(n / max));
  const base = Math.floor(n / count);
  const extra = n % count;
  const pages: [number, number][] = [];
  let start = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0);
    pages.push([start, start + size]);
    start += size;
  }
  return pages;
}

/** Visual sub-decision keys in wizard order. */
export const SUB_KEYS: readonly VisualKey[] = VISUAL_SUBDECISIONS.map((s) => s.key);

/** The palette sub-decision needs both the brand colour and a variant. */
export function isDecided(v: Visual, key: VisualKey): boolean {
  return key === "paletteVariant" ? v.paletteVariant !== null && v.brandHex !== null : v[key] !== null;
}

/** The labs, in path order (docs/PLAN.md "Labs programme", design/labs/lab-pattern.md). */
export const LABS = [
  { id: "profile", number: 1, title: "Profile" },
  { id: "color", number: 2, title: "Color" },
  { id: "type", number: 3, title: "Type" },
  { id: "space", number: 4, title: "Space & shape" },
  { id: "laws", number: 5, title: "Laws" },
  { id: "preview", number: 6, title: "Preview" },
  { id: "export", number: 7, title: "Export" },
] as const;
export type LabId = (typeof LABS)[number]["id"];
export type Lab = (typeof LABS)[number];

/**
 * The path: every stop the user walks with J/K/E, lab by lab (12 stops). Ids stay stable (?step= links, fixtures);
 * the lab is a field, never parsed from the id. componentLibrary is never null, so its stop is always decided.
 */
export const STOPS = [
  { id: "profile.identity", lab: "profile", label: "Name & type" },
  { id: "profile.platform", lab: "profile", label: "Platform" },
  { id: "profile.library", lab: "profile", label: "Component library" },
  { id: "visual.brandHex", lab: "color", label: "Brand colour" },
  { id: "visual.paletteVariant", lab: "color", label: "Palette" },
  { id: "visual.fontPair", lab: "type", label: "Font pair" },
  { id: "visual.spacingBase", lab: "space", label: "Spacing" },
  { id: "visual.radius", lab: "space", label: "Radius" },
  { id: "visual.density", lab: "space", label: "Density" },
  { id: "principles", lab: "laws", label: "Laws" },
  // Shows every decision on one sample screen; there is nothing to decide there.
  { id: "preview", lab: "preview", label: "Sample screen" },
  // The files. Nothing to decide; its blocked state lists the open decisions instead.
  { id: "export", lab: "export", label: "Files" },
] as const;
export type StopId = (typeof STOPS)[number]["id"];
const STOP_IDS: readonly StopId[] = STOPS.map((s) => s.id);

/** The lab a stop belongs to (from STOPS, not from the id string). */
export function labOfStop(id: StopId): Lab {
  const lab = STOPS.find((s) => s.id === id)?.lab ?? "profile";
  return LABS.find((l) => l.id === lab) ?? LABS[0];
}

/** A lab's stops, in path order. */
export function stopsOfLab(lab: LabId): readonly (typeof STOPS)[number][] {
  return STOPS.filter((s) => s.lab === lab);
}

/** Where a stop sits on the path: "stop n of 12". */
export function pathPosition(id: StopId): { n: number; total: number } {
  return { n: STOP_IDS.indexOf(id) + 1, total: STOP_IDS.length };
}

export function isStopId(id: string): id is StopId {
  return (STOP_IDS as readonly string[]).includes(id);
}

function isLabId(id: string): id is LabId {
  return LABS.some((l) => l.id === id);
}

/**
 * Where a link opens: ?step=<stop id> wins (the aliases "visual.palette" and "visual.spacing" stay accepted), else
 * ?lab=<lab id> opens that lab's first open stop (its first stop when all are decided). An unknown value is
 * reported, never guessed: stop is then null.
 */
export function stopFromLink(p: ProjectFile, step: string | null, lab: string | null): { stop: StopId | null; warning: string | null } {
  if (step !== null) {
    const id = step === "visual.palette" ? "visual.paletteVariant" : step === "visual.spacing" ? "visual.spacingBase" : step;
    if (isStopId(id)) return { stop: id, warning: null };
    return { stop: null, warning: `Unknown ?step=${step}; opening the first open stop instead.` };
  }
  if (lab !== null) {
    if (isLabId(lab)) {
      const stops = stopsOfLab(lab);
      return { stop: (stops.find((s) => !isStopDecided(p, s.id)) ?? stops[0]).id, warning: null };
    }
    return { stop: null, warning: `Unknown ?lab=${lab}; opening the first open stop instead.` };
  }
  return { stop: null, warning: null };
}

export function isStopDecided(p: ProjectFile, id: StopId): boolean {
  switch (id) {
    case "profile.identity":
      return p.profile.name !== null && p.profile.productType !== null;
    case "profile.platform":
      return p.profile.platform !== null;
    case "profile.library":
    case "preview":
    case "export":
      return true;
    case "principles":
      return p.principles !== null;
    case "visual.brandHex":
      return p.visual.brandHex !== null;
    default:
      return isDecided(p.visual, id.slice("visual.".length) as VisualKey);
  }
}

/** The stop after `id` on the path (choosing moves on in order, so every stop is seen once); null at the end. */
export function nextStop(id: StopId): StopId | null {
  return STOP_IDS[STOP_IDS.indexOf(id) + 1] ?? null;
}

export function prevStop(id: StopId): StopId | null {
  const i = STOP_IDS.indexOf(id);
  return i > 0 ? STOP_IDS[i - 1] : null;
}

/** E: the nearest decided stop before `id`, else the last decided one after it. */
export function lastDecidedStopBefore(p: ProjectFile, id: StopId): StopId | null {
  const i = STOP_IDS.indexOf(id);
  for (let n = i - 1; n >= 0; n--) if (isStopDecided(p, STOP_IDS[n])) return STOP_IDS[n];
  for (let n = STOP_IDS.length - 1; n > i; n--) if (isStopDecided(p, STOP_IDS[n])) return STOP_IDS[n];
  return null;
}

export function firstOpenStop(p: ProjectFile): StopId | null {
  return STOP_IDS.find((id) => !isStopDecided(p, id)) ?? null;
}
