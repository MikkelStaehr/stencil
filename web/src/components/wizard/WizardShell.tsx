"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { firstOpenStop, isStopId, lastDecidedStopBefore, nextStop, prevStop, stepOfStop, STEPS, SUB_KEYS, type StopId, type VisualKey } from "@/domain/decisions";
import { projectStore, useProject } from "@/data/project/store";
import { ownsKey } from "./use-shortcuts";
import { Rail } from "./Rail";
import { SnapshotNotice } from "./SnapshotNotice";
import { VisualStep } from "./steps/visual/VisualStep";
import { ProfileStep } from "./steps/profile/ProfileStep";
import { PrinciplesStep } from "./steps/principles/PrinciplesStep";
import { PreviewStep } from "./steps/preview/PreviewStep";
import { ExportStep } from "./steps/export/ExportStep";
import { OpenedNotice } from "./OpenedNotice";
import { OpenProjectButton } from "./OpenProjectButton";
import { LivePreview } from "./LivePreview";
import type { ProfileStop } from "./steps/profile/model";

/** ?step=<stop id> opens a stop directly; "visual.palette" and "visual.spacing" stay accepted as aliases. */
function stopFromSearch(search: string): StopId | null {
  const raw = new URLSearchParams(search).get("step");
  if (raw === null) return null;
  const id = raw === "visual.palette" ? "visual.paletteVariant" : raw === "visual.spacing" ? "visual.spacingBase" : raw;
  if (isStopId(id)) return id;
  console.warn(`Unknown ?step=${raw}; opening the first open stop instead.`);
  return null;
}

const noSubscribe = () => () => {};

/** Display only: the row already shows the path, so drop a leading "<path> " and capitalise. Parser messages are unchanged. */
function withoutPath(path: string, message: string): string {
  const rest = path !== "" && message.startsWith(`${path} `) ? message.slice(path.length + 1) : message;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

// Layout from DESIGN.md "Space & density": ≥1101px rail 232 | main | preview 340;
// 761–1100px rail 200 + main with the preview below; ≤760px one column, rail and legend hidden.
export function WizardShell() {
  const { project, errors, saveFailed, hydrated, fileVersion } = useProject();
  const visual = project.visual;
  const productName = project.profile.name;
  const [picked, setPicked] = useState<StopId | null>(null);
  /** Until the user moves, the wizard opens on the first open stop (the project may load after first render). */
  const fromUrl = useSyncExternalStore(noSubscribe, () => stopFromSearch(window.location.search), () => null);
  // Every decision set: open step 4, the live preview.
  const stop: StopId = picked ?? fromUrl ?? firstOpenStop(project) ?? "preview";
  const current = stepOfStop(stop);
  // Pin the starting stop once, so committing a field never moves the user mid-step.
  if (hydrated && picked === null) setPicked(stop);
  const step = STEPS.find((s) => s.id === current) ?? STEPS[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || ownsKey(e.target, e.key)) return;
      const k = e.key.toLowerCase();
      const to = k === "j" ? nextStop(stop) : k === "k" ? prevStop(stop) : k === "e" ? lastDecidedStopBefore(projectStore().getState().project, stop) : null;
      if (to) setPicked(to);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stop]);

  // On arriving at a stop, focus its h1; a new project's identity stop focuses the first empty field instead.
  const arrived = useRef<StopId | null>(null);
  useEffect(() => {
    // Wait for the real project: before hydration main holds only a status line, nothing to focus.
    if (!hydrated || arrived.current === stop) return;
    arrived.current = stop;
    const { name, productType } = project.profile;
    if (stop === "profile.identity" && (name === null || productType === null)) {
      const inputs = [...document.querySelectorAll<HTMLInputElement>("main form input")];
      (inputs.find((i) => i.value === "") ?? inputs[0])?.focus();
    } else document.querySelector<HTMLElement>("main h1")?.focus();
  }, [stop, project.profile, hydrated]);

  const visualSub = (current === "visual" ? stop.slice("visual.".length) : SUB_KEYS[0]) as VisualKey;

  return (
    <div className="min-h-dvh min-[761px]:grid min-[761px]:grid-cols-[200px_minmax(0,1fr)] min-[1101px]:grid-cols-[232px_minmax(0,1fr)_340px]">
      <header className="flex min-h-11 items-center justify-between border-b border-dw-line px-4 min-[761px]:hidden">
        <span className="font-mono text-label font-medium tracking-[0.08em] uppercase">Stencil</span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-label text-dw-text-muted">
            Step {step.number} of {STEPS.length}
          </span>
          {hydrated && <OpenProjectButton label="Open file" buttonClass="px-3" />}
        </span>
      </header>
      <aside className="hidden min-[761px]:block min-[761px]:row-span-2 min-[1101px]:row-span-1">
        <Rail project={project} stop={stop} onPick={setPicked} />
      </aside>
      <main className={`min-w-0 px-4 pt-5 pb-8 min-[761px]:px-6 ${current === "preview" ? "min-[1101px]:col-span-2" : ""}`}>
        {/* Before hydration the server snapshot is an empty project: show nothing to type into. */}
        {!hydrated ? (
          <p role="status" className="text-dw-text-muted">
            Opening your project…
          </p>
        ) : (
          <>
        {errors.length > 0 && (
          <section role="alert" aria-labelledby="file-errors-title" className="mb-5 border border-dw-ctl bg-dw-surface px-4 py-3">
            <h2 id="file-errors-title" tabIndex={-1} className="font-medium">
              The project file could not be opened: {errors.length} {errors.length === 1 ? "problem" : "problems"}
            </h2>
            <p className="text-small text-dw-text-muted">Nothing was replaced. Fix these in the file and open it again.</p>
            <ul className="mt-2 flex flex-col">
              {errors.map((err, i) => (
                <li key={`${err.path}:${i}`} className="grid grid-cols-1 gap-x-4 border-t border-dw-line py-1.5 min-[761px]:grid-cols-[minmax(0,14rem)_1fr]">
                  <code className="font-mono text-label break-all">{err.path === "" ? "(whole file)" : err.path}</code>
                  <span className="text-small">{withoutPath(err.path, err.message)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {saveFailed && (
          <p role="status" className="mb-5 border border-dw-ctl bg-dw-surface px-4 py-2 text-small">
            This browser did not save your last change. Keep the tab open until you can download the project file.
          </p>
        )}
        <OpenedNotice />
        <SnapshotNotice />
        {current === "visual" && (
          <VisualStep key={fileVersion} sub={visualSub} visual={visual} productName={productName} onMove={(k) => setPicked(`visual.${k}`)} />
        )}
        {current === "profile" && <ProfileStep stop={stop as ProfileStop} project={project} onMove={setPicked} />}
        {current === "principles" && <PrinciplesStep project={project} onMove={setPicked} />}
        {current === "preview" && <PreviewStep project={project} onMove={setPicked} />}
        {current === "export" && <ExportStep project={project} onMove={setPicked} />}
          </>
        )}
      </main>
      {/* Step 4 shows the same screen full size in main, so the column steps aside there. */}
      {hydrated && current !== "preview" && (
      <section
        aria-labelledby="preview-label"
        className="border-t border-dw-line px-4 py-5 min-[761px]:col-start-2 min-[761px]:px-6 min-[1101px]:col-start-3 min-[1101px]:row-start-1 min-[1101px]:border-t-0 min-[1101px]:border-l min-[1101px]:px-4"
      >
        <LivePreview visual={visual} productName={productName} />
      </section>
      )}
    </div>
  );
}
