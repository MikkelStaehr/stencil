"use client";
import type { ProjectFile } from "@/contracts/project";
import { entryStopOfLab, isStopDecided, labOfStop, LABS, openDecisions, stopsOfLab, type LabId, type StopId, type VisualKey } from "@/domain/decisions";
import { OpenProjectButton } from "./OpenProjectButton";
import { ShortcutLegend } from "./ShortcutLegend";
import { ThemeToggle } from "./ThemeToggle";
import { StopList, type StopRow } from "./SubDecisionList";
import { profileRows } from "./steps/profile/model";
import { valueLabel } from "./steps/visual/model";

/** The labs and, for the current lab only, its stops (DESIGN.md Part B "Shell: labs, stops and the path"). */
export function Rail({ project, stop, onPick }: { project: ProjectFile; stop: StopId; onPick: (id: StopId) => void }) {
  const productName = project.profile.name;
  const current = labOfStop(stop).id;
  const openCount = openDecisions(project).length;
  return (
    <nav aria-label="Labs" className="flex h-full flex-col gap-3.5 border-r border-dw-line px-3 py-4">
      <p className="flex min-w-0 items-center gap-2 px-1 font-mono text-small font-medium tracking-[0.04em] uppercase">
        <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-2xs border-[1.5px] border-dw-accent" />
        <span className="truncate">Stencil{productName ? ` · ${productName}` : ""}</span>
      </p>
      <ol className="flex flex-col">
        {LABS.map((lab) => {
          const isCurrent = lab.id === current;
          return (
            <li
              key={lab.id}
              aria-current={isCurrent ? "true" : undefined}
              className={`grid min-h-11 grid-cols-[22px_minmax(0,1fr)] items-start gap-1.5 border-t border-dw-line py-2.5 pr-1 ${
                isCurrent ? "border-l-2 border-l-dw-accent pl-2" : "pl-1"
              }`}
            >
              <span
                className={
                  isCurrent
                    ? "inline-flex size-[22px] items-center justify-center rounded-xs bg-dw-accent-fill font-mono text-label font-medium text-dw-on-accent tabular-nums"
                    : "font-mono text-label leading-5 text-dw-text-muted tabular-nums"
                }
              >
                {String(lab.number).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-col">
                {/* The lab name and summary open the lab at its first open stop: one 44px target. */}
                <button
                  type="button"
                  onClick={() => onPick(entryStopOfLab(project, lab.id))}
                  className="-mx-1 flex min-h-11 flex-col justify-center rounded-sm px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dw-focus"
                >
                  <span className="font-medium">{lab.title}</span>
                  <span className="text-small text-dw-text-muted">{labSummary(project, lab.id, openCount)}</span>
                </button>
                {isCurrent && (
                  <span className="mt-1.5 -ml-1.5 block">
                    <StopList rows={labRows(project, lab.id, openCount)} current={stop} onPick={onPick} mark />
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
          laws={stop === "principles"}
          view={stop === "preview"}
          enter={stop === "visual.brandHex" ? "Continue to palette" : stop === "export" ? (openCount === 0 ? "Download all" : "Go to open decision") : undefined}
        />
        <ThemeToggle />
      </div>
    </nav>
  );
}

/** "2 of 3 decided" for labs with decisions; Laws says how many rules once decided; the sample screen and the files say what they are. */
function labSummary(p: ProjectFile, lab: LabId, openCount: number): string {
  if (lab === "preview") return "Nothing to decide";
  if (lab === "laws") return lawsValue(p) ?? "0 of 1 decided";
  if (lab === "export") return openCount === 0 ? "Ready" : `${openCount} open`;
  const stops = stopsOfLab(lab);
  return `${stops.filter((s) => isStopDecided(p, s.id)).length} of ${stops.length} decided`;
}

/** The current lab's stop rows, each with its chosen value as the rail shows it, or null while open. */
export function labRows(p: ProjectFile, lab: LabId, openCount: number): StopRow<StopId>[] {
  if (lab === "profile") return profileRows(p);
  return stopsOfLab(lab).map((s) => ({ id: s.id, label: s.label, value: stopValue(p, s.id, openCount) }));
}

function stopValue(p: ProjectFile, id: StopId, openCount: number): string | null {
  switch (id) {
    case "visual.brandHex":
      return p.visual.brandHex;
    case "principles":
      return lawsValue(p);
    case "preview":
      return "All";
    case "export":
      return openCount === 0 ? "4 files" : "Blocked";
    default:
      return id.startsWith("visual.") ? valueLabel(p.visual, id.slice("visual.".length) as VisualKey) : null;
  }
}

/** The Laws stop's value: "4 rules", "1 rule", "No rules", or null while open. */
function lawsValue(p: ProjectFile): string | null {
  if (p.principles === null) return null;
  const n = p.principles.length;
  return n === 0 ? "No rules" : `${n} ${n === 1 ? "rule" : "rules"}`;
}
