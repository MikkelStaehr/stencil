"use client";
import type { Visual } from "@/contracts/project";
import { VISUAL_SUBDECISIONS, type VisualKey } from "@/domain/decisions";
import { projectStore } from "@/data/project/store";
import { ArrowText } from "@/components/wizard/ArrowText";
import { SubDecisionList } from "@/components/wizard/SubDecisionList";
import { DensityDecision } from "./density";
import { FontPairDecision } from "./font-pair";
import { nextOpenAfter, SUB_KEYS } from "@/domain/decisions";
import type { DecisionProps } from "./model";
import { PaletteDecision } from "./palette";
import { RadiusDecision } from "./radius";
import { SpacingDecision } from "./spacing";

const LEADS: Record<VisualKey, (whose: string) => string> = {
  fontPair: (whose) => `Pick the display and text faces for ${whose} screens. Each plate renders in its own fonts; you can change this later.`,
  spacingBase: (whose) => `Pick the base unit for ${whose} gaps and padding. Every space is a multiple of it; you can change this later.`,
  radius: (whose) => `Pick how round ${whose} corners are. Square is a valid choice, and you can change it later.`,
  paletteVariant: (whose) => `Three ways to spread ${whose} brand colour. Each one renders in its own tokens; you can change this later.`,
  density: (whose) => `Pick how dense ${whose} type and line-height are. You can change this later.`,
};

const VIEWS: Record<VisualKey, (p: DecisionProps) => React.ReactNode> = {
  fontPair: (p) => <FontPairDecision {...p} />,
  spacingBase: (p) => <SpacingDecision {...p} />,
  radius: (p) => <RadiusDecision {...p} />,
  paletteVariant: (p) => <PaletteDecision {...p} />,
  density: (p) => <DensityDecision {...p} />,
};

/** Step 3: one view per sub-decision, in VISUAL_SUBDECISIONS order. */
export function VisualStep({ sub, visual, productName, onMove }: { sub: VisualKey; visual: Visual; productName: string | null; onMove: (key: VisualKey) => void }) {
  const index = SUB_KEYS.indexOf(sub);
  const meta = VISUAL_SUBDECISIONS[index];
  const whose = productName ? `${productName}’s` : "your project’s";

  const onChoose: DecisionProps["onChoose"] = (key, value) => {
    projectStore().setVisual(key, value);
    const next = nextOpenAfter(projectStore().getState().project.visual, key);
    if (next) onMove(next);
  };

  return (
    <>
      <p className="font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">
        Step 03 · Visual system · Decision {index + 1} of {SUB_KEYS.length}
      </p>
      <h1 id="stop-title" tabIndex={-1} className="mt-1.5 text-title font-semibold tracking-[-0.025em]">
        <ArrowText text={meta.label} />
      </h1>
      <p className="mt-1 max-w-[60ch] text-dw-text-muted">{LEADS[sub](whose)}</p>

      <div key={sub}>
        {VIEWS[sub]({ visual, productName, onChoose })}
      </div>

      <nav aria-label="Visual decisions" className="mt-6 border-t border-dw-line pt-3 min-[761px]:hidden">
        <p className="font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">All visual decisions</p>
        <div className="mt-1">
          <SubDecisionList visual={visual} current={sub} onPick={onMove} />
        </div>
      </nav>
    </>
  );
}
