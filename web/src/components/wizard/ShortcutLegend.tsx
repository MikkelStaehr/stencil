// Only shortcuts that work are listed. Labels are words ("Enter"), per the DESIGN.md glyph rule.
// v0.1 has no Ctrl K menu and no "Apply fix" key.
const SHORTCUTS: readonly { keys: readonly string[]; label: string }[] = [
  { keys: ["1", "2", "3"], label: "Pick variant" },
  { keys: ["Enter"], label: "Choose variant" },
  { keys: ["J", "K"], label: "Next / previous stop" },
  { keys: ["E"], label: "Reopen last decision" },
];

const LAWS_KEY = { keys: ["Space"], label: "Add or remove law" } as const;

/**
 * On the Laws stop, Space replaces "1 2 3 Pick variant" (laws are not variants) and Enter continues. The sample screen
 * has nothing to pick. Where Enter is a stop's own primary (Brand colour: "Continue to palette"; Files: "Download all"
 * or "Go to open decision"), `enter` names it and 1 2 3 is left out.
 */
export function ShortcutLegend({ className = "", laws = false, view = false, enter }: { className?: string; laws?: boolean; view?: boolean; enter?: string }) {
  const list =
    enter !== undefined
      ? [{ keys: ["Enter"], label: enter }, ...SHORTCUTS.slice(2)]
      : view
        ? SHORTCUTS.slice(2)
        : laws
          ? [LAWS_KEY, { keys: ["Enter"], label: "Continue" }, ...SHORTCUTS.slice(2)]
          : SHORTCUTS;
  return (
    <dl aria-label="Keyboard shortcuts" className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-small ${className}`}>
      {list.map((s) => (
        <div key={s.label} className="contents">
          <dt className="flex gap-1">
            {s.keys.map((k) => (
              <kbd key={k}>{k}</kbd>
            ))}
          </dt>
          <dd className="text-dw-text-muted">{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}
