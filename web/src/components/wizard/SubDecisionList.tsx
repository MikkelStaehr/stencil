"use client";
import { ArrowText } from "./ArrowText";

export interface StopRow<Id extends string> {
  id: Id;
  label: string;
  /** The chosen value as shown in the rail, or null while open. */
  value: string | null;
}

/**
 * A lab's stops with their state: the chosen value or "open" (design/labs/lab-pattern.md). Rows are 44px buttons.
 * With `mark`, the current stop on the path gets the 6px accent square (DESIGN.md Part B, "The lit lab and stop"),
 * always with the selected fill and aria-current, so orange never carries the meaning alone.
 */
export function StopList<Id extends string>({ rows, current, onPick, mark = false }: { rows: StopRow<Id>[]; current: Id | null; onPick: (id: Id) => void; mark?: boolean }) {
  return (
    <ul className="flex flex-col">
      {rows.map((s) => {
        const isCurrent = s.id === current;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-sm px-1.5 text-left text-small transition-colors duration-(--duration-fast) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dw-focus ${
                isCurrent ? "bg-dw-selected font-medium text-dw-text outline outline-1 -outline-offset-1 outline-dw-ctl" : "text-dw-text-muted hover:bg-dw-hover"
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {mark && <span aria-hidden="true" data-stop-mark className={`size-1.5 shrink-0 ${isCurrent ? "bg-dw-accent-fill" : ""}`} />}
                <ArrowText text={s.label} />
              </span>
              <span className={`max-w-[55%] shrink-0 truncate font-mono text-label font-normal ${isCurrent ? "text-dw-text" : ""}`}>{s.value ?? "open"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
