"use client";
import { useState } from "react";
import { palettes, PALETTE_LABELS } from "@/domain/color/palette";
import { checkPairs } from "@/domain/color/pairs";
import { parseHexInput } from "@/domain/parse-input";
import { PREVIEW_NEUTRALS, resolveForPlate } from "@/domain/tokens/resolve";
import { projectStore } from "@/data/project/store";
import { PlateGrid } from "@/components/plate/PlateGrid";
import { ContrastTable } from "@/components/wizard/ContrastTable";
import { fontPairLabel, type DecisionProps } from "./model";

/** Brand colour field: validated on blur (or Enter); on error the typed text stays and the message sits next to it. */
function BrandField({ brandHex }: { brandHex: string | null }) {
  const [draft, setDraft] = useState(brandHex ?? "");
  const [error, setError] = useState<string | null>(null);
  const commit = () => {
    if (draft.trim() === "" && brandHex === null) return setError(null);
    const r = parseHexInput(draft);
    if (!r.ok) return setError(r.message);
    setError(null);
    setDraft(r.value);
    if (r.value !== brandHex) projectStore().setVisual("brandHex", r.value);
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
            if (e.key === "Enter") commit();
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

export function PaletteDecision({ visual, productName, onChoose }: DecisionProps) {
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
      <div className="mt-4">
        <BrandField key={brand ?? "none"} brandHex={brand} />
      </div>
      {brand === null ? (
        <p className="mt-5 border border-dashed border-dw-ctl px-4 py-6 text-dw-text-muted">
          Enter the brand colour to see three palettes built from it, each with its contrast checked.
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
