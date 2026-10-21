"use client";
import type { Visual } from "@/contracts/project";
import { VISUAL_SUBDECISIONS, type VisualKey } from "@/domain/decisions";
import { ArrowText } from "./ArrowText";
import { valueLabel } from "./steps/visual/model";

export interface StopRow<Id extends string> {
  id: Id;
  label: string;
  /** The chosen value as shown in the rail, or null while open. */
  value: string | null;
}

/**
 * A step's stops with their state: the chosen value, "now", "next" or "open". Rows are 44px buttons.
 * "next" is the next open row after the current one (wrapping), or the first open row once the current is decided.
 */
export function StopList<Id extends string>({ rows, current, onPick }: { rows: StopRow<Id>[]; current: Id | null; onPick: (id: Id) => void }) {
  const at = rows.findIndex((r) => r.id === current);
  let next: Id | null = null;
  if (at >= 0 && rows[at].value !== null) next = rows.find((r) => r.value === null)?.id ?? null;
  else
    for (let n = 1; n < rows.length && next === null; n++) {
      const r = rows[((at < 0 ? -1 : at) + n + rows.length) % rows.length];
      if (r.value === null && r.id !== current) next = r.id;
    }
  return (
    <ul className="flex flex-col">
      {rows.map((s) => {
        const isCurrent = s.id === current;
        const state = s.value ?? (isCurrent ? "now" : s.id === next ? "next" : "open");
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-current={isCurrent ? "true" : undefined}
              className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-sm px-1.5 text-left text-small transition-colors duration-(--duration-fast) ease-standard ${
                isCurrent ? "bg-dw-selected font-medium text-dw-text outline outline-1 -outline-offset-1 outline-dw-ctl" : "text-dw-text-muted hover:bg-dw-hover"
              }`}
            >
              <span className="min-w-0">
                <ArrowText text={s.label} />
              </span>
              <span className={`max-w-[55%] shrink-0 truncate font-mono text-label font-normal ${isCurrent ? "text-dw-text" : ""}`}>{state}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Step 3's sub-decisions. */
export function SubDecisionList({ visual, current, onPick }: { visual: Visual; current: VisualKey | null; onPick: (key: VisualKey) => void }) {
  const rows = VISUAL_SUBDECISIONS.map((s) => ({ id: s.key, label: s.label, value: valueLabel(visual, s.key) }));
  return <StopList rows={rows} current={current} onPick={onPick} />;
}
