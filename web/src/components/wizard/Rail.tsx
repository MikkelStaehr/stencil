"use client";
import type { ProjectFile } from "@/contracts/project";
import { isDecided, openDecisions, stepOfStop, STEPS, SUB_KEYS, type StopId, type VisualKey } from "@/domain/decisions";
import { OpenProjectButton } from "./OpenProjectButton";
import { ShortcutLegend } from "./ShortcutLegend";
import { StopList, SubDecisionList } from "./SubDecisionList";
import { profileDecidedCount, profileRows, type ProfileStop } from "./steps/profile/model";

export function Rail({ project, stop, onPick }: { project: ProjectFile; stop: StopId; onPick: (id: StopId) => void }) {
  const productName = project.profile.name;
  const current = stepOfStop(stop);
  const visualDecided = SUB_KEYS.filter((k) => isDecided(project.visual, k)).length;
  const openCount = openDecisions(project).length;
  const exportValue = openCount === 0 ? "Ready" : `${openCount} open`;
  return (
    <nav aria-label="Wizard steps" className="flex h-full flex-col gap-3.5 border-r border-dw-line px-3 py-4">
      <p className="flex min-w-0 items-center gap-2 px-1 font-mono text-small font-medium tracking-[0.04em] uppercase">
        <span aria-hidden="true" className="inline-block size-3 shrink-0 border-[1.5px] border-dw-text" />
        <span className="truncate">Stencil{productName ? ` · ${productName}` : ""}</span>
      </p>
      <ol className="flex flex-col">
        {STEPS.map((step) => {
          const isCurrent = step.id === current;
          const summary =
            step.id === "profile"
              ? `${profileDecidedCount(project)} of 3 decided`
              : step.id === "visual"
                ? `${visualDecided} of ${SUB_KEYS.length} decided`
                : step.id === "principles"
                  ? `${project.principles === null ? 0 : 1} of 1 decided`
                  : step.id === "preview"
                    ? "Nothing to decide"
                    : exportValue;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={`grid min-h-11 grid-cols-[22px_minmax(0,1fr)] items-start gap-1.5 border-t border-dw-line py-2.5 pr-1 ${
                isCurrent ? "border-l-2 border-l-dw-accent pl-2" : "pl-1"
              }`}
            >
              <span className="font-mono text-label leading-5 text-dw-text-muted tabular-nums">{String(step.number).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{step.title}</span>
                <span className="text-small text-dw-text-muted">{summary}</span>
                {step.id === "profile" && (
                  <span className="mt-1.5 -ml-1.5 block">
                    <StopList<ProfileStop> rows={profileRows(project)} current={current === "profile" ? (stop as ProfileStop) : null} onPick={onPick} />
                  </span>
                )}
                {step.id === "principles" && (
                  <span className="mt-1.5 -ml-1.5 block">
                    <StopList rows={[{ id: "principles" as const, label: "Laws", value: lawsValue(project) }]} current={isCurrent ? "principles" : null} onPick={onPick} />
                  </span>
                )}
                {step.id === "preview" && (
                  <span className="mt-1.5 -ml-1.5 block">
                    <StopList rows={[{ id: "preview" as const, label: "Sample screen", value: "All" }]} current={isCurrent ? "preview" : null} onPick={onPick} />
                  </span>
                )}
                {step.id === "export" && (
                  <span className="mt-1.5 -ml-1.5 block">
                    <StopList rows={[{ id: "export" as const, label: "Files", value: openCount === 0 ? "4 files" : "Blocked" }]} current={isCurrent ? "export" : null} onPick={onPick} />
                  </span>
                )}
                {step.id === "visual" && (
                  <span className="mt-1.5 -ml-1.5 block">
                    <SubDecisionList
                      visual={project.visual}
                      current={current === "visual" ? (stop.slice("visual.".length) as VisualKey) : null}
                      onPick={(k) => onPick(`visual.${k}`)}
                    />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <OpenProjectButton buttonClass="w-full" />
        <ShortcutLegend
          laws={current === "principles"}
          view={current === "preview"}
          exportEnter={current === "export" ? (openCount === 0 ? "Download all" : "Go to open decision") : undefined}
        />
      </div>
    </nav>
  );
}

/** The rail sub-row value for step 2: "4 rules", "1 rule", "No rules", or null while open. */
function lawsValue(p: ProjectFile): string | null {
  if (p.principles === null) return null;
  const n = p.principles.length;
  return n === 0 ? "No rules" : `${n} ${n === 1 ? "rule" : "rules"}`;
}
