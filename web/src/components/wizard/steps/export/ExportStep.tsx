"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProjectFile } from "@/contracts/project";
import { openDecisionStops, stepOfStop, STEPS, type StopId } from "@/domain/decisions";
import { countLine } from "@/domain/rules";
import { fileStatus, projectStore, useProject, type FileStatus } from "@/data/project/store";
import { downloadMany, downloadText } from "@/data/project/file-io";
import { serialize } from "@/data/project/serialize";
import { exportAll, projectFileName, type ExportFiles } from "@/export";
import { openMarkerCount } from "@/export/design-md";
import { byteLength, clockTime, formatBytes } from "@/lib/format";
import { ownsKey } from "@/components/wizard/use-shortcuts";
import { SECONDARY } from "@/components/wizard/classes";
import { OpenProjectButton } from "@/components/wizard/OpenProjectButton";

// Step 5 (design/specs/step-5-export.md): a delivery manifest. Nothing to decide here.

type ExportName = keyof ExportFiles;
const EXPORT_NAMES: readonly ExportName[] = ["DESIGN.md", "tokens.json", "ux-rules.yaml"];
const TYPES: Record<ExportName, string> = { "DESIGN.md": "text/markdown", "tokens.json": "application/json", "ux-rules.yaml": "text/yaml" };

const LABEL = "font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase";

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`size-4 shrink-0 text-dw-text-muted ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

const STATUS_LINE: Record<FileStatus["kind"], (s: FileStatus) => [string, string]> = {
  none: () => ["NO PROJECT FILE YET", "Your work is only in this browser. Download the project file to keep a copy you can commit and reopen."],
  current: (s) => {
    const t = s.kind === "current" ? clockTime(s.at) : "";
    return ["PROJECT FILE UP TO DATE", `Matches the project file you downloaded or opened at ${t}.`];
  },
  behind: (s) => {
    const t = s.kind === "behind" ? clockTime(s.since) : "";
    return [`UNSAVED SINCE ${t}`, `Changes made after ${t} are only in this browser. Download the project file to keep them.`];
  },
};

function buildExports(p: ProjectFile): ExportFiles | "error" | null {
  if (openDecisionStops(p).length > 0) return null;
  try {
    return exportAll(p);
  } catch (e) {
    console.error("Export failed", e);
    return "error";
  }
}

export function ExportStep({ project, onMove }: { project: ProjectFile; onMove: (id: StopId) => void }) {
  const state = useProject();
  const open = openDecisionStops(project);
  const blocked = open.length > 0;
  const name = project.profile.name;
  // A name ending in a digit or punctuation reads badly as a possessive ("Ida's" #1's).
  const whose = name && /\p{L}$/u.test(name) ? `${name}’s` : "your project’s";
  const projectName = projectFileName(project);
  const projectText = useMemo(() => serialize(project), [project]);
  const exports = useMemo(() => buildExports(project), [project]);
  const files = exports !== null && exports !== "error" ? exports : null;
  const status = fileStatus(state);
  const [statusMono, statusSentence] = STATUS_LINE[status.kind](status);

  // "downloaded {t}" per export is view state for this file; another file (fileVersion) starts clean.
  const [downloaded, setDownloaded] = useState<Partial<Record<ExportName, string>>>({});
  const [fileSeen, setFileSeen] = useState(state.fileVersion);
  if (state.fileVersion !== fileSeen) {
    setFileSeen(state.fileVersion);
    setDownloaded({});
  }

  function downloadProject() {
    downloadText(projectName, projectText);
    projectStore().markDownloaded();
  }
  function downloadExport(n: ExportName) {
    if (!files) return;
    downloadText(n, files[n], TYPES[n]);
    setDownloaded((d) => ({ ...d, [n]: new Date().toISOString() }));
  }
  function downloadAll() {
    const list = [{ name: projectName, text: projectText }, ...(files ? EXPORT_NAMES.map((n) => ({ name: n, text: files[n], type: TYPES[n] })) : [])];
    // The project file goes first; it counts as downloaded only once the browser has it.
    void downloadMany(list, (i) => {
      if (i === 0) projectStore().markDownloaded();
      else setDownloaded((d) => ({ ...d, [EXPORT_NAMES[i - 1]]: new Date().toISOString() }));
    });
  }

  function primary() {
    if (blocked) onMove(open[0].stop);
    else downloadAll();
  }

  // Enter outside a button, summary or field is the primary action (the kbd in the button promises it).
  const primaryRef = useRef(primary);
  useEffect(() => {
    primaryRef.current = primary;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (ownsKey(e.target, e.key)) return;
      // Reading a file's text or a notice is not a request to download (reviewer 3d).
      if (e.target instanceof Element && e.target.closest("pre, [role=status], [role=alert]")) return;
      e.preventDefault();
      primaryRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The sticky bar never hides focus (WCAG 2.4.11): the page scroller pads by its height.
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => (root.style.scrollPaddingBottom = `${el.offsetHeight + 8}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.scrollPaddingBottom = "";
    };
  }, []);

  const n = open.length;
  const purposes: Record<ExportName, string> = {
    "DESIGN.md": "Part B for the repo’s DESIGN.md: type, colour, shape, space. Merge it in; Part A stays as it is.",
    "tokens.json": "Design tokens in W3C DTCG format, for code and design tools.",
    "ux-rules.yaml":
      project.principles === null
        ? "The UX rules tester and reviewer check."
        : project.principles.length === 0
          ? "No rules, as decided: an empty list."
          : `${countLine(project.principles).toLowerCase()}: what tester and reviewer check.`,
  };

  function exportMeta(f: ExportName): ReactNode {
    if (blocked) return "blocked until every decision is made";
    if (!files) return `Could not build ${f}. Your decisions are unchanged; download the project file and report it.`;
    const text = files[f];
    let line = formatBytes(byteLength(text));
    if (f === "DESIGN.md") {
      const m = openMarkerCount(text);
      line += ` · ${m} ${m === 1 ? "item" : "items"} open for design-lead`;
    }
    return <Meta line={line} at={downloaded[f]} />;
  }

  return (
    <div className="max-w-[720px]">
      <p className={LABEL}>Step 05 · Export</p>
      <h1 id="stop-title" tabIndex={-1} className="mt-1.5 text-title font-semibold tracking-[-0.025em]">
        Export
      </h1>
      <p className="mt-1 max-w-[60ch] text-dw-text-muted">
        {exports === "error"
          ? "Every decision is made, but the exports could not be built. Your decisions are unchanged; download the project file and report it."
          : blocked
          ? `Export writes DESIGN.md, tokens.json and ux-rules.yaml from your decisions. ${n === 1 ? "1 decision is" : `${n} decisions are`} still open. Nothing is filled in for you, so make each one first.`
          : `Every decision is made. Download the files and commit them to ${whose} repo. Downloading changes nothing here.`}
      </p>
      {!blocked && state.snapshotDiffers && (
        <p className="mt-1.5 max-w-[60ch] text-small text-dw-text-muted">
          These files use the stored values. To export the current algorithm’s values, choose Recompute now above.
        </p>
      )}

      {blocked && (
        <section aria-labelledby="still-open" className="mt-6">
          <h2 id="still-open" className={LABEL}>
            STILL OPEN · {n}
          </h2>
          <ul className="mt-2 flex flex-col border-b border-dw-line">
            {open.map((d) => (
              <li key={d.label} className="border-t border-dw-line">
                <button type="button" onClick={() => onMove(d.stop)} className="flex min-h-11 w-full items-center justify-between gap-4 px-2 text-left hover:bg-dw-hover">
                  <span className="font-medium">
                    <span className="sr-only">Decide </span>
                    {d.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-label text-dw-text-muted">Step {STEPS.find((s) => s.id === stepOfStop(d.stop))?.number}</span>
                    <Chevron />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="project-file" className="mt-6">
        <h2 id="project-file" className={LABEL}>
          PROJECT FILE
        </h2>
        <ul className="mt-2 flex flex-col border-b border-dw-line">
          <FileRow
            name={projectName}
            purpose="Every decision. Reopen it here to change one."
            meta={<Meta line={formatBytes(byteLength(projectText))} at={state.downloadedAt ?? undefined} />}
            text={projectText}
            onDownload={downloadProject}
          >
            <p className="pb-3 text-small text-dw-text">
              Commit it as <code className="font-mono text-label [overflow-wrap:anywhere]">design/{projectName}</code> in the target repo. The exported DESIGN.md names
              this path, so anyone can reopen it.
            </p>
          </FileRow>
        </ul>
      </section>

      <section aria-labelledby="exports" className="mt-6">
        <h2 id="exports" className={LABEL}>
          {blocked ? "EXPORTS · BLOCKED" : exports === "error" ? "EXPORTS · NOT BUILT" : "EXPORTS · 3 FILES"}
        </h2>
        <ul className="mt-2 flex flex-col border-b border-dw-line">
          {EXPORT_NAMES.map((f) => (
            <FileRow key={f} name={f} purpose={purposes[f]} meta={exportMeta(f)} text={files ? files[f] : null} onDownload={() => downloadExport(f)} />
          ))}
        </ul>
        {!blocked && (
          <p className="mt-3 max-w-[60ch] text-small text-dw-text-muted">
            Same decisions, same bytes: download any file again at any time. Download all hands your browser 4 files at once, so Chrome may ask you once to allow that.
            Each file’s own button never asks. If your browser adds (1) to a name, remove it before committing.
          </p>
        )}
      </section>

      <section aria-labelledby="open-file" className="mt-8">
        <h2 id="open-file" className={LABEL}>
          OPEN A PROJECT FILE
        </h2>
        <p className="mt-1 max-w-[60ch] text-small text-dw-text-muted">
          Reopen a .dwproj.json to change its decisions. It replaces what is here; you can undo that until your next change.
        </p>
        <OpenProjectButton withStatus className="mt-3" />
      </section>

      <div
        ref={bar}
        className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-col gap-3 border-t border-dw-line bg-dw-bg px-4 py-3 min-[761px]:-mx-6 min-[761px]:flex-row min-[761px]:items-center min-[761px]:justify-between min-[761px]:px-6"
      >
        <div role="status" className="min-w-0">
          <p className="font-mono text-label font-medium text-dw-text tabular-nums">
            {blocked ? `${n} ${n === 1 ? "DECISION" : "DECISIONS"} OPEN · ${statusMono}` : statusMono}
          </p>
          <p className="text-small text-dw-text-muted">{blocked ? "The three exports unlock when the last decision is made." : statusSentence}</p>
        </div>
        <button
          type="button"
          data-primary-action=""
          onClick={primary}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-primary px-4 font-semibold whitespace-nowrap text-primary-foreground min-[761px]:w-auto min-[761px]:shrink-0"
        >
          {blocked ? `Go to ${open[0].label}` : files ? "Download all 4 files" : "Download the project file"}
          <kbd className="border-primary-foreground bg-transparent text-primary-foreground">Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/** "{bytes} · downloaded {t}"; the downloaded part fades in over 120ms (none with reduced motion). */
function Meta({ line, at }: { line: string; at: string | undefined }) {
  return (
    <>
      {line}
      {at !== undefined && (
        <span className="transition-opacity duration-(--duration-base) ease-out starting:opacity-0 motion-reduce:transition-none"> · downloaded {clockTime(at)}</span>
      )}
    </>
  );
}

function FileRow({
  name,
  purpose,
  meta,
  text,
  onDownload,
  children,
}: {
  name: string;
  purpose: string;
  meta: ReactNode;
  text: string | null;
  onDownload: () => void;
  children?: ReactNode;
}) {
  return (
    <li className="border-t border-dw-line" data-file={name}>
      <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-body font-medium [overflow-wrap:anywhere]">{name}</p>
          <p className="max-w-[60ch] text-small text-dw-text-muted">{purpose}</p>
          <p data-meta="" className="font-mono text-label text-dw-text-muted tabular-nums">
            {meta}
          </p>
        </div>
        {text !== null && (
          <button type="button" onClick={onDownload} className={`${SECONDARY} whitespace-nowrap`}>
            Download<span className="sr-only"> {name}</span>
          </button>
        )}
      </div>
      {children}
      {text !== null && (
        <details className="group pb-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-small [&::-webkit-details-marker]:hidden">
            Show text
            <Chevron className="group-open:rotate-90" />
          </summary>
          <pre tabIndex={0} aria-label={`${name} text`} className="max-h-80 overflow-auto rounded-md border border-dw-line bg-dw-surface p-3 font-mono text-label whitespace-pre">
            {text}
          </pre>
        </details>
      )}
    </li>
  );
}
