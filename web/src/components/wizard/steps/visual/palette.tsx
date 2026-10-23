"use client";
import { useEffect, useRef, useState } from "react";
import type { Visual } from "@/contracts/project";
import { nextStop, pathPosition, type StopId } from "@/domain/decisions";
import { palettes, PALETTE_LABELS } from "@/domain/color/palette";
import { checkPairs } from "@/domain/color/pairs";
import { parseHexInput } from "@/domain/parse-input";
import { PREVIEW_NEUTRALS, resolveForPlate } from "@/domain/tokens/resolve";
import { projectStore } from "@/data/project/store";
import { PlateGrid } from "@/components/plate/PlateGrid";
import { ContrastTable } from "@/components/wizard/ContrastTable";
import { ownsKey } from "@/components/wizard/use-shortcuts";
import { SECONDARY } from "@/components/wizard/classes";
import { fontPairLabel, type DecisionProps } from "./model";

/**
 * The Color lab's first stop: the brand colour every palette is built from. It owns the draft, so moving on always
 * records it first. Blur records a valid colour; Continue (the button, Enter in the field or Enter on the page)
 * records it and goes on, or, when the field is empty or invalid, shows why, focuses the field and stays
 * (design/specs/lab-shell.md §3, like identity's Continue to platform).
 */
export function BrandStop({ visual, productName, onMove }: { visual: Visual; productName: string | null; onMove: (id: StopId) => void }) {
  const brand = visual.brandHex;
  const whose = productName ? `${productName}’s` : "your project’s";
  const [draft, setDraft] = useState(brand ?? "");
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  /** True when the draft is a valid colour, recorded through the store if it changed. On blur an empty field is no error. */
  const commit = (moving: boolean): boolean => {
    if (draft.trim() === "") {
      setError(moving ? "Enter the brand colour as a hex value, for example #0F766E." : null);
      return false;
    }
    const r = parseHexInput(draft);
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    setError(null);
    setDraft(r.value);
    if (r.value !== brand) projectStore().setVisual("brandHex", r.value);
    return true;
  };
  const goOn = () => {
    if (!commit(true)) {
      field.current?.focus();
      return;
    }
    const next = nextStop("visual.brandHex");
    if (next) onMove(next);
  };
  const goOnRef = useRef(goOn);
  useEffect(() => {
    goOnRef.current = goOn;
  });
  // Enter anywhere but a button, link or field continues (the field and the button handle their own Enter).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey || e.repeat || ownsKey(e.target, e.key)) return;
      e.preventDefault();
      goOnRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <h1 id="stop-title" tabIndex={-1} className="mt-1.5 text-title font-semibold tracking-[-0.025em]">
        Brand colour
      </h1>
      <p className="mt-1 max-w-[60ch] text-dw-text-muted">
        The colour {whose} palettes are built from. The next stop offers three palettes made from it; you can change it later.
      </p>
      <div className="mt-4 flex flex-col gap-1">
        <label htmlFor="brand-hex" className="font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">
          Brand colour
        </label>
        <div className="flex min-h-11 w-full items-center gap-2 rounded-sm border border-dw-ctl bg-dw-surface px-2.5 min-[761px]:w-[200px]">
          <span aria-hidden="true" className="size-4 flex-none border border-dw-ctl" style={brand ? { background: brand } : undefined} />
          <input
            ref={field}
            id="brand-hex"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onBlur={() => commit(false)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.repeat) return;
              e.preventDefault();
              goOn();
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
      <div className="mt-6 border-t border-dw-line pt-4">
        <button
          type="button"
          data-primary-action=""
          // Keep focus in the field on mousedown: a blur would record the draft and show or hide the error, moving this
          // button between mousedown and mouseup so the click is lost. goOn records the draft itself.
          onMouseDown={(e) => e.preventDefault()}
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
      {/* The brand colour is read-only here (5a decision); it is changed on its own stop (design/specs/lab-shell.md §3). */}
      {brand === null ? (
        <div className="mt-5 flex flex-col items-start gap-3 border border-dashed border-dw-ctl px-4 py-6 text-dw-text-muted">
          <p>Enter the brand colour at stop {pathPosition("visual.brandHex").n} to see three palettes built from it, each with its contrast checked.</p>
          <button type="button" onClick={() => onMove("visual.brandHex")} className={SECONDARY}>
            Go to Brand colour
          </button>
        </div>
      ) : (
        <p className="mt-3 text-small text-dw-text-muted">
          From brand colour <span className="font-mono font-medium text-dw-text">{brand}</span>. To change it, go back to{" "}
          <button type="button" onClick={() => onMove("visual.brandHex")} className="inline-flex min-h-11 items-center rounded-sm font-medium text-dw-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dw-focus">
            Brand colour
          </button>
        </p>
      )}
      {brand === null ? null : options.length === 0 ? (
        <p role="status" className="mt-5 border border-dashed border-dw-ctl px-4 py-6 text-dw-text-muted">
          No palette built from {brand} passes every contrast pair. Try a darker or lighter brand colour at stop {pathPosition("visual.brandHex").n}.
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
