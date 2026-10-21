"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { FontLoadState } from "@/fonts/loader";
import type { PlateTokens } from "@/domain/tokens/resolve";
import { SampleCard } from "@/components/samples/SampleCard";
import { ownsKey } from "@/components/wizard/use-shortcuts";
import { clearPreviewCandidate, setPreviewCandidate, type PreviewCandidate } from "@/components/wizard/preview-candidate";
import { Plate } from "./Plate";

export interface PlateOption<Id extends string = string> {
  id: Id;
  label: string;
  description: string;
  /** Variant plates only: the project tokens and font pair the sample renders in. Panels leave them out. */
  tokens?: PlateTokens;
  fontPairId?: string;
  fontLabel?: string;
  /** What the plate or panel shows; defaults to the SampleCard. */
  sample?: ReactNode;
  /** Read-only content under the plate, e.g. the contrast table. */
  footer?: ReactNode;
}

interface PlateGridProps<Id extends string> {
  /** Accessible name of the radio group, e.g. "Spacing variants". */
  label: string;
  /** Name of the decision for the choose bar, e.g. "spacing". */
  decision: string;
  options: PlateOption<Id>[];
  /** The recorded value, or null while the decision is open. */
  chosenId: Id | null;
  productName: string | null;
  onChoose: (id: Id) => void;
  /** "panel": the tool's own output (chrome fill, no variant root, no font loading), 2 columns. */
  frame?: "plate" | "panel";
  /** Status line once a choosable option is selected; defaults to "moves to the next open decision". */
  status?: string;
  /** A line under the options, above the choose bar. */
  note?: ReactNode;
  /** Visual decisions: the candidate a selected (not yet chosen) variant shows in the preview column. */
  preview?: (id: Id) => PreviewCandidate;
}


/**
 * 2–3 plates side by side as one radio group. 1/2/3 (or arrows) select a variant; Enter or the
 * primary button records it. A variant whose fonts failed can be looked at but not chosen.
 */
export function PlateGrid<Id extends string>({ label, decision, options, chosenId, productName, onChoose, frame = "plate", status, note, preview }: PlateGridProps<Id>) {
  const [selectedId, setSelectedId] = useState<Id | null>(chosenId);
  const [fontStates, setFontStates] = useState<Record<string, FontLoadState>>({});
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const selected = options.find((o) => o.id === selectedId) ?? null;
  const selectedFailed = selected !== null && fontStates[selected.id] === "failed";
  // The preview candidate: published on select, cleared on choose and on unmount (it is UI state, never stored).
  const previewRef = useRef(preview);
  useEffect(() => {
    previewRef.current = preview;
  });
  const published = useRef<PreviewCandidate["key"] | undefined>(undefined);
  useEffect(() => () => clearPreviewCandidate(published.current), []);
  const offered = options.some((o) => o.id === selectedId);
  useEffect(() => {
    if (!offered) clearPreviewCandidate();
  }, [offered]);

  const select = useCallback(
    (index: number, focus: boolean) => {
      const option = options[index];
      if (!option) return;
      setSelectedId(option.id);
      if (previewRef.current) {
        const candidate = previewRef.current(option.id);
        published.current = candidate.key;
        setPreviewCandidate(candidate);
      }
      if (focus) refs.current[index]?.focus();
    },
    [options],
  );

  const choose = useCallback(() => {
    if (!selected || fontStates[selected.id] === "failed") return;
    if (previewRef.current) clearPreviewCandidate();
    onChoose(selected.id);
  }, [selected, fontStates, onChoose]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || ownsKey(e.target, e.key)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        select(n - 1, true);
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [options.length, select, choose]);

  const onArrow = (index: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step !== 0) {
      e.preventDefault();
      select((index + step + options.length) % options.length, true);
    } else if (e.key === " ") {
      e.preventDefault();
      select(index, false);
    }
  };

  const onFontState = useCallback(
    (id: string, s: FontLoadState) => setFontStates((prev) => (prev[id] === s ? prev : { ...prev, [id]: s })),
    [],
  );
  const tabIndexId = selected?.id ?? options[0]?.id;
  const optionKey = options.map((o) => o.id).join("|");

  // Equal plates: one ResizeObserver measures each variant's content; every root gets the tallest as min-height,
  // so columns stay level and nothing shifts between candidates. Re-runs as plates finish loading their fonts.
  const groupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const roots = [...group.querySelectorAll<HTMLElement>("[data-v-root]")];
    const contents = roots.map((r) => r.firstElementChild).filter((c): c is HTMLElement => c instanceof HTMLElement);
    if (contents.length === 0) return;
    const sync = () => {
      // Exact (fractional) height: offsetHeight rounds, which shifted a plate by a sub-pixel after fonts loaded.
      const tallest = Math.max(...contents.map((c) => c.getBoundingClientRect().height));
      for (const r of roots) r.style.minHeight = `${tallest}px`;
    };
    const observer = new ResizeObserver(sync);
    contents.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [fontStates, optionKey]);

  return (
    <>
      <div ref={groupRef} role="radiogroup" aria-label={label} className={`mt-5 grid grid-cols-1 gap-6 min-[761px]:gap-5 ${frame === "panel" || options.length === 2 ? "min-[761px]:grid-cols-2" : "min-[761px]:grid-cols-3"}`}>
        {options.map((o, i) => (
          <section key={o.id} className="flex min-w-0 flex-col gap-2.5">
            <div className="flex min-h-5 items-center justify-between gap-2" aria-hidden="true">
              <span className="truncate font-mono text-label font-medium tracking-[0.08em] uppercase">{o.label}</span>
              <span className="flex items-center gap-2">
                {chosenId === o.id && <span className="font-mono text-label text-dw-text-muted">Chosen</span>}
                <kbd>{i + 1}</kbd>
              </span>
            </div>
            {frame === "panel" || o.tokens === undefined || o.fontPairId === undefined ? (
              <div
                ref={(el) => {
                  refs.current[i] = el;
                }}
                role="radio"
                aria-checked={selectedId === o.id}
                aria-label={`Option ${i + 1}, ${o.label}: ${o.description}`}
                tabIndex={tabIndexId === o.id ? 0 : -1}
                onClick={() => select(i, false)}
                onKeyDown={onArrow(i)}
                className="dw-plate dw-panel"
              >
                <span className="dw-cm" aria-hidden="true" />
                {o.sample}
              </div>
            ) : (
            <PlateSlot option={o} onFontState={onFontState}>
              {(report) => (
                <Plate
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  tokens={o.tokens as PlateTokens}
                  fontPairId={o.fontPairId as string}
                  fontLabel={o.fontLabel ?? ""}
                  selected={selectedId === o.id}
                  tabbable={tabIndexId === o.id}
                  ariaLabel={`Variant ${i + 1}, ${o.label}: ${o.description}`}
                  onSelect={() => select(i, false)}
                  onKeyDown={onArrow(i)}
                  onFontState={report}
                >
                  {o.sample ?? <SampleCard productName={productName} />}
                </Plate>
              )}
            </PlateSlot>
            )}
            <p className="min-h-9 text-small text-dw-text-muted">{o.description}</p>
            {o.footer}
          </section>
        ))}
      </div>
      {note}
      <div className="mt-5 flex flex-col items-start gap-3 border-t border-dw-line pt-4">
        <p className="max-w-[56ch] text-dw-text-muted">
          {selected === null
            ? `Pick a ${decision} variant with a number key or a click.`
            : selectedFailed
              ? `${selected.label} can't be chosen: its fonts failed to load.`
              : (status ?? `Choosing records the ${decision} and moves to the next open decision. You can change it later.`)}
        </p>
        <button
          type="button"
          onClick={choose}
          disabled={selected === null || selectedFailed}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-primary px-4 font-semibold whitespace-nowrap text-primary-foreground disabled:cursor-not-allowed disabled:bg-dw-ctl min-[761px]:w-auto"
        >
          {selected ? `Choose ${selected.label}` : "Choose a variant"}
          <kbd className="border-primary-foreground bg-transparent text-primary-foreground">Enter</kbd>
        </button>
      </div>
    </>
  );
}

/** Gives each plate a stable font-state callback bound to its option id. */
function PlateSlot({
  option,
  onFontState,
  children,
}: {
  option: PlateOption;
  onFontState: (id: string, s: FontLoadState) => void;
  children: (report: (s: FontLoadState) => void) => ReactNode;
}) {
  const report = useCallback((s: FontLoadState) => onFontState(option.id, s), [onFontState, option.id]);
  return <>{children(report)}</>;
}
