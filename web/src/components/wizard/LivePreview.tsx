"use client";
import type { Visual } from "@/contracts/project";
import { PREVIEW_NEUTRALS, resolveForPlate } from "@/domain/tokens/resolve";
import { isDecided, SUB_KEYS } from "@/domain/decisions";
import { Plate } from "@/components/plate/Plate";
import { SampleScreen } from "@/components/samples/SampleScreen";
import { fontPairLabel, previewPart, valueLabel } from "./steps/visual/model";
import { isCandidateInUse, usePreviewCandidate, type PreviewCandidate } from "./preview-candidate";

/** The decisions made so far with the candidate on top: what the preview plate renders. */
export function withCandidate(visual: Visual, candidate: PreviewCandidate | null): Visual {
  return candidate ? { ...visual, [candidate.key]: candidate.value } : visual;
}

/** The sample screen in a non-interactive plate: the user's choices, the candidate on top, neutrals for the rest. */
export function PreviewPlate({ visual, candidate, productName }: { visual: Visual; candidate: PreviewCandidate | null; productName: string | null }) {
  const shown = withCandidate(visual, candidate);
  const fontPairId = shown.fontPair ?? PREVIEW_NEUTRALS.fontPair;
  const line = SUB_KEYS.map((k) => previewPart(shown, k)).join(" · ");
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <div data-preview-plate="">
        <Plate
          tokens={resolveForPlate(visual, candidate ? { [candidate.key]: candidate.value } : {})}
          fontPairId={fontPairId}
          fontLabel={fontPairLabel(fontPairId)}
          selected={false}
          tabbable={false}
          interactive={false}
          ariaLabel={`Sample screen rendered with ${line}.`}
        >
          <SampleScreen productName={productName} />
        </Plate>
      </div>
      <figcaption aria-hidden="true" className="font-mono text-label text-dw-text-muted">
        {SUB_KEYS.map((k, i) => (
          <span key={k}>
            {i > 0 ? " · " : ""}
            <span className="whitespace-nowrap">{previewPart(shown, k)}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** The preview column, in every step: the selected-but-not-chosen variant on top of every decision made so far. */
export function LivePreview({ visual, productName }: { visual: Visual; productName: string | null }) {
  const candidate = usePreviewCandidate();
  // A candidate is named and says whether the project already uses it (design/specs/lab-shell.md §3, the 5a decision).
  const what = candidate
    ? `${valueLabel(withCandidate(visual, candidate), candidate.key)}, ${isCandidateInUse(visual, candidate) ? "in use" : "not used yet"}`
    : SUB_KEYS.some((k) => isDecided(visual, k))
      ? "Your choices"
      : "Neutrals";
  return (
    <>
      <p id="preview-label" className="font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">
        Live preview · {what}
      </p>
      <div className="mt-3">
        <PreviewPlate visual={visual} candidate={candidate} productName={productName} />
      </div>
    </>
  );
}
