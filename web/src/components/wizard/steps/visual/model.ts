// View helpers for step 3: how a chosen value reads in the rail. Which sub-decisions are open is
// owned by domain/decisions.ts.
import type { Visual } from "@/contracts/project";
import { FONT_BY_ID } from "@/content/fonts";
import { FONT_PAIR_BY_ID } from "@/content/font-pairs";
import { PALETTE_LABELS } from "@/domain/color/palette";
import { isDecided, type StopId, type VisualKey } from "@/domain/decisions";

/** "Sora + Inter", or "Inter" for a single-family pair. Unknown ids are shown as-is, never hidden. */
export function fontPairLabel(id: string): string {
  const pair = FONT_PAIR_BY_ID.get(id);
  if (!pair) return id;
  const display = FONT_BY_ID.get(pair.display.font)?.family ?? pair.display.font;
  const text = FONT_BY_ID.get(pair.text.font)?.family ?? pair.text.font;
  return display === text ? display : `${display} + ${text}`;
}

export const spacingLabel = (n: number) => `${n}-pt`;
export const radiusLabel = (n: number) => `${n} px`;
export const densityLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

/** The chosen value as shown in the rail, or null while open. */
export function valueLabel(v: Visual, key: VisualKey): string | null {
  if (!isDecided(v, key)) return null;
  switch (key) {
    case "fontPair":
      return fontPairLabel(v.fontPair as string);
    case "spacingBase":
      return spacingLabel(v.spacingBase as number);
    case "radius":
      return radiusLabel(v.radius as number);
    case "paletteVariant":
      return PALETTE_LABELS[v.paletteVariant as NonNullable<Visual["paletteVariant"]>].label;
    case "density":
      return densityLabel(v.density as string);
  }
}

/** Props every sub-decision view takes. `onChoose` records the value through the store, then moves on; `onMove` opens another stop. */
export interface DecisionProps {
  visual: Visual;
  productName: string | null;
  onChoose: <K extends VisualKey>(key: K, value: NonNullable<Visual[K]>) => void;
  onMove: (id: StopId) => void;
}

/** The footer line's word for an open decision. */
const PENDING: Record<VisualKey, string> = {
  fontPair: "font pair pending",
  spacingBase: "spacing pending",
  radius: "radius pending",
  paletteVariant: "palette pending",
  density: "density pending",
};

/** One part of the footer line: the value as the rail shows it, named where the value alone is ambiguous. */
export function previewPart(v: Visual, key: VisualKey): string {
  const label = valueLabel(v, key);
  if (label === null) return PENDING[key];
  if (key === "radius") return `radius ${label}`;
  if (key === "paletteVariant") return `${label} palette`;
  if (key === "density") return `${label.toLowerCase()} density`;
  return label;
}
