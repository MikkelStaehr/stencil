"use client";
import { useEffect, useState } from "react";
import type { Visual } from "@/contracts/project";
import { nextStop, type StopId } from "@/domain/decisions";
import { palettes, PALETTE_LABELS } from "@/domain/color/palette";
import { checkPairs } from "@/domain/color/pairs";
import { parseHexInput } from "@/domain/parse-input";
import { PREVIEW_NEUTRALS, resolveForPlate } from "@/domain/tokens/resolve";
import { projectStore } from "@/data/project/store";
import { PlateGrid } from "@/components/plate/PlateGrid";
import { ContrastTable } from "@/components/wizard/ContrastTable";
import { ownsKey } from "@/components/wizard/use-shortcuts";
import { fontPairLabel, type DecisionProps } from "./model";

/** Brand colour field: validated on blur (or Enter); on error the typed text stays and the message sits next to it. */
function BrandField({ brandHex, onEntered }: { brandHex: string | null; onEntered: () => void }) {
  const [draft, setDraft] = useState(brandHex ?? "");
  const [error, setError] = useState<string | null>(null);
  /** True when the field holds a valid colour afterwards (recorded through the store if it changed). */
  const commit = (): boolean => {
    if (draft.trim() === "" && brandHex === null) {
      setError(null);
      return false;
    }
    const r = parseHexInput(draft);
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    setError(null);
    setDraft(r.value);
    if (r.value !== brandHex) projectStore().setVisual("brandHex", r.value);
    return true;
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="brand-hex" className="font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">
        Brand colour
      </label>
      <div className="flex min-h-11 w-full items-center gap-2 rounded-sm border border-dw-ctl bg-dw-surface px-2.5 min-[761px]:w-[200px]">
        <span aria-hidden="true" className="size-4 flex-none border border-dw-ctl" style={brandHex ? { background: brandHex } : undefined} />
        <input
          id="brand-hex"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && commit()) onEntered();
          }}
          placeholder="#0F766E"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error !== null}
          aria-describedby={error ? "brand-hex-error" : undefined}
          className="h-11 w-full bg-transparent font-mono text-body font-medium outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dw-focus placeholder:text-dw-text-muted"
        />
      </div>
      {error && (
        <p id="brand-hex-error" role="alert" className="max-w-[40ch] text-small">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The Color lab's first stop: the brand colour every palette is built from. Enter in the field records it and goes on;
 * elsewhere Enter (or the primary) goes on to the palette.
 */
export function BrandStop({ visual, productName, onMove }: { visual: Visual; productName: string | null; onMove: (id: StopId) => void }) {
  const brand = visual.brandHex;
  const whose = productName ? `${productName}’s` : "your project’s";
  const goOn = () => {
    const next = nextStop("visual.brandHex");
    if (next) onMove(next);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey && !ownsKey(e.target, e.key)) goOn();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  return (
    <>
      <h1 id="stop-title" tabIndex={-1} className="mt-1.5 text-title font-semibold tracking-[-0.025em]">
        Brand colour
      </h1>
      <p className="mt-1 max-w-[60ch] text-dw-text-muted">
        The colour {whose} palettes are built from. The next stop offers three palettes made from it; you can change it later.
      </p>
      <div className="mt-4">
        <BrandField key={brand ?? "none"} brandHex={brand} onEntered={goOn} />
      </div>
      <div className="mt-6 border-t border-dw-line pt-4">
        <button
          type="button"
          data-primary-action=""
          onClick={goOn}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-primary px-4 font-semibold whitespace-nowrap text-primary-foreground min-[761px]:w-auto"
        >
          Continue to palette
          <kbd className="border-primary-foreground bg-transparent text-primary-foreground">Enter</kbd>
        </button>
      </div>
    </>
  );
}

export function PaletteDecision({ visual, productName, onChoose, onMove }: DecisionProps) {
  const fontPairId = visual.fontPair ?? PREVIEW_NEUTRALS.fontPair;
  const brand = visual.brandHex;
  const offered = brand ? palettes(brand) : [];
  const options = offered.map(({ variant }) => {
    const tokens = resolveForPlate(visual, { paletteVariant: variant });
    const { label, description } = PALETTE_LABELS[variant];
    return {
      id: variant,
      label,
      description,
      tokens,
      fontPairId,
      fontLabel: fontPairLabel(fontPairId),
      footer: <ContrastTable caption={`Contrast, ${label} palette`} results={checkPairs(tokens.color.light)} />,
    };
  });

  return (
    <>
      {/* The brand colour is read-only here (5a decision); it is changed on its own stop. */}
      <p className="mt-3 text-small text-dw-text-muted">
        {brand === null ? "No brand colour yet. " : <>From brand colour <span className="font-mono font-medium text-dw-text">{brand}</span>. </>}
        <button type="button" onClick={() => onMove("visual.brandHex")} className="rounded-sm font-medium text-dw-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dw-focus">
          {brand === null ? "Pick the brand colour" : "Change the brand colour"}
        </button>
      </p>
      {brand === null ? (
        <p className="mt-5 border border-dashed border-dw-ctl px-4 py-6 text-dw-text-muted">
          Three palettes appear here once the brand colour is set, each with its contrast checked.
        </p>
      ) : options.length === 0 ? (
        <p role="status" className="mt-5 border border-dashed border-dw-ctl px-4 py-6 text-dw-text-muted">
          No palette built from {brand} passes every contrast pair. Try a darker or lighter brand colour.
        </p>
      ) : (
        <PlateGrid
          key={`palette:${brand}:${visual.paletteVariant}`}
          label="Palette variants"
          decision="palette"
          options={options}
          chosenId={visual.paletteVariant}
          productName={productName}
          onChoose={(id) => onChoose("paletteVariant", id)}
          preview={(id) => ({ key: "paletteVariant", value: id })}
        />
      )}
    </>
  );
}
