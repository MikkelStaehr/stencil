"use client";
import { useEffect, useRef } from "react";
import { fileStatus, projectStore, useProject } from "@/data/project/store";
import { downloadText } from "@/data/project/file-io";
import { serialize } from "@/data/project/serialize";
import { isEmptyProject } from "@/data/project/empty";
import { projectFileName } from "@/export";
import { SECONDARY } from "./classes";

const BUTTON = `${SECONDARY} [overflow-wrap:anywhere]`;

/** Project-level notice after opening a file, in every step (design/specs/step-5-export.md §6). Undo over confirm. */
export function OpenedNotice() {
  const { openNotice, replaced, project } = useProject();
  const title = useRef<HTMLHeadingElement>(null);
  // Every open and every undo makes a new notice object: move focus to its title (the pressed control may be gone).
  useEffect(() => {
    if (openNotice !== null) title.current?.focus();
  }, [openNotice]);
  if (openNotice === null) return null;

  if (openNotice.undone) {
    return (
      <section role="status" aria-labelledby="opened-title" className="mb-5 rounded-xl border border-dw-line bg-dw-surface px-4 py-3">
        <h2 ref={title} id="opened-title" tabIndex={-1} className="font-medium [overflow-wrap:anywhere]">
          Back to {project.profile.name ?? "your untitled project"}.
        </h2>
        <p className="mt-0.5 text-small text-dw-text-muted">The opened file was not kept; open it again at any time.</p>
      </section>
    );
  }

  const kind = replaced === null ? "current" : fileStatus(replaced).kind;
  const unsaved = replaced !== null && kind !== "current" && !isEmptyProject(replaced.project);
  return (
    <section role="status" aria-labelledby="opened-title" className="mb-5 rounded-xl border border-dw-line bg-dw-surface px-4 py-3">
      <h2 ref={title} id="opened-title" tabIndex={-1} className="font-medium [overflow-wrap:anywhere]">
        Opened {openNotice.fileName}.
      </h2>
      {unsaved && (
        <p className="mt-0.5 max-w-[72ch] text-small text-dw-text-muted [overflow-wrap:anywhere]">
          It replaced {replaced.project.profile.name ?? "your untitled project"}, which had changes in no downloaded file.
        </p>
      )}
      {replaced !== null && (
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className={BUTTON} onClick={() => projectStore().undoOpen()}>
            Undo open
          </button>
          {unsaved && (
            // Saves the replaced work without undoing; it is not the current project, so no markDownloaded().
            <button type="button" className={BUTTON} onClick={() => downloadText(projectFileName(replaced.project), serialize(replaced.project))}>
              Download {projectFileName(replaced.project)}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
