"use client";
import { useEffect, useRef, useState } from "react";
import type { ProjectFile } from "@/contracts/project";
import { projectStore, useProject } from "@/data/project/store";
import { resolveSnapshot } from "@/domain/tokens/resolve";

/** Counts differing leaf values per group ("color.light", "fontSize", …) between two snapshots. */
function diffGroups(a: unknown, b: unknown, path: string[] = [], out = new Map<string, number>()): Map<string, number> {
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diffGroups((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], [...path, k], out);
  } else if (a !== b) {
    const group = path[0] === "color" ? path.slice(0, 2).join(".") : (path[0] ?? "snapshot");
    out.set(group, (out.get(group) ?? 0) + 1);
  }
  return out;
}

const plural = (n: number) => `${n} ${n === 1 ? "value" : "values"}`;

function differences(p: ProjectFile): [string, number][] {
  if (p.resolved === null) return [];
  return [...diffGroups(p.resolved, resolveSnapshot(p)).entries()];
}

/** Project-level notice at the top of main in every step (design/specs/step-1-profile.md §6). */
export function SnapshotNotice() {
  const { project, snapshotDiffers, recomputedBy, previousResolved } = useProject();
  const [done, setDone] = useState<string | null>(null);
  // The answered button unmounts; move focus to the result line instead of dropping it on <body>.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (done !== null) resultRef.current?.focus();
  }, [done]);

  if (!snapshotDiffers) {
    const message = recomputedBy !== null ? `Changing ${recomputedBy} recomputed every stored value.` : done;
    if (message === null) return null;
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-dw-line bg-dw-surface px-4 py-3 text-small">
        <span>{message}</span>
        {previousResolved !== null && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center text-small text-dw-text underline underline-offset-4"
            onClick={() => {
              projectStore().undoRecompute();
              setDone(null);
            }}
          >
            Undo
          </button>
        )}
      </div>
    );
  }

  const diff = differences(project);
  const total = diff.reduce((n, [, c]) => n + c, 0);
  const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-sm border border-dw-ctl bg-dw-surface px-4 font-medium transition-colors duration-(--duration-fast) ease-standard hover:bg-dw-hover";
  return (
    <section role="region" aria-labelledby="snapshot-title" className="mb-5 rounded-xl border border-dw-line bg-dw-surface px-4 py-3">
      <h2 id="snapshot-title" className="font-medium">
        Stored values differ from the current algorithm: keep or recompute
      </h2>
      <p className="mt-0.5 max-w-[72ch] text-small text-dw-text-muted">
        This file was saved by an earlier version. Keeping the stored values keeps exports byte-identical; recomputing updates them to the current algorithm.
      </p>
      {diff.length > 0 && <p className="mt-1.5 font-mono text-label tabular-nums">Differs: {diff.map(([g, n]) => `${g} ${plural(n)}`).join(" · ")}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            projectStore().keepSnapshot();
            setDone("Kept the stored values. This notice returns when the file is opened again.");
          }}
        >
          Keep stored values
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            projectStore().recomputeSnapshot();
            setDone(`Recomputed ${plural(total)}.`);
          }}
        >
          Recompute now
        </button>
      </div>
    </section>
  );
}
