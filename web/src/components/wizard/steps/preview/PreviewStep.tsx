"use client";
import { useEffect, useRef } from "react";
import type { ProjectFile } from "@/contracts/project";
import { nextStop, SUB_KEYS, VISUAL_SUBDECISIONS, type StopId } from "@/domain/decisions";
import { PreviewPlate } from "@/components/wizard/LivePreview";
import { ArrowText } from "@/components/wizard/ArrowText";
import { valueLabel } from "@/components/wizard/steps/visual/model";
import { ownsKey } from "@/components/wizard/use-shortcuts";

// Step 4: every decision on one sample screen, full size. Nothing to decide here; each row reopens its decision.
export function PreviewStep({ project, onMove }: { project: ProjectFile; onMove: (id: StopId) => void }) {
  const { visual, profile } = project;
  const rows: { id: StopId; label: string; value: string | null }[] = [
    { id: "profile.identity", label: "Product name", value: profile.name },
    ...SUB_KEYS.map((k) => ({
      id: `visual.${k}` as const,
      label: VISUAL_SUBDECISIONS.find((s) => s.key === k)?.label ?? k,
      value: valueLabel(visual, k),
    })),
  ];

  // Enter outside a button, summary or field goes on along the path (at 390 there is no rail and no J key).
  const moveRef = useRef(onMove);
  useEffect(() => {
    moveRef.current = onMove;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey || e.repeat || ownsKey(e.target, e.key)) return;
      e.preventDefault();
      const next = nextStop("preview");
      if (next) moveRef.current(next);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <h1 id="stop-title" tabIndex={-1} className="mt-1.5 text-title font-semibold tracking-[-0.025em]">
        Live preview
      </h1>
      <p className="mt-1 max-w-[60ch] text-dw-text-muted">
        Every decision you have made, on one sample screen.{" "}
        {rows.some((r) => r.value === null)
          ? "Open decisions show in neutral placeholders until you make them. Select a row below to make or change one."
          : "Select a row below to change it."}
        {profile.name === null ? " Harbour stands in until you name the project." : ""}
      </p>
      <div className="mt-5 max-w-[720px]">
        <PreviewPlate visual={visual} candidate={null} productName={profile.name} />
      </div>
      <h2 className="mt-6 font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">Decisions shown</h2>
      <ul className="mt-2 flex max-w-[720px] flex-col border-b border-dw-line">
        {rows.map((r) => (
          <li key={r.id} className="border-t border-dw-line">
            <button
              type="button"
              onClick={() => onMove(r.id)}
              className="flex min-h-11 w-full items-center justify-between gap-4 px-2 text-left hover:bg-dw-hover"
            >
              <span className="font-medium">
                <span className="sr-only">Change </span>
                <ArrowText text={r.label} />
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className={`min-w-0 truncate font-mono text-label ${r.value === null ? "text-dw-text-muted" : ""}`}>
                  {r.value ?? "pending"}
                </span>
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 text-dw-text-muted" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-primary-action=""
        onClick={() => {
          const next = nextStop("preview");
          if (next) onMove(next);
        }}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-primary px-4 font-semibold whitespace-nowrap text-primary-foreground min-[761px]:w-auto"
      >
        Continue to export
        <kbd className="border-primary-foreground bg-transparent text-primary-foreground">Enter</kbd>
      </button>
    </>
  );
}
