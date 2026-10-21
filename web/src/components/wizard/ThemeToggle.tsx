"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { currentTheme, DEFAULT_THEME, setTheme, subscribeTheme, type Theme } from "@/lib/theme";

// Dark / Light segmented control (design/specs/chrome-family.md §4). No shortcut of its own: Tab reaches it,
// Enter or Space switches it, and nothing animates when the theme changes.

const moon = (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10Z" />
  </svg>
);

const sun = (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const OPTIONS: readonly { theme: Theme; label: string; icon: ReactNode }[] = [
  { theme: "dark", label: "Dark", icon: moon },
  { theme: "light", label: "Light", icon: sun },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => DEFAULT_THEME);
  return (
    <div role="group" aria-label="Theme" className="flex rounded-md border border-dw-ctl">
      {OPTIONS.map((o) => {
        const pressed = theme === o.theme;
        return (
          <button
            key={o.theme}
            type="button"
            aria-pressed={pressed}
            aria-label={compact ? `${o.label} theme` : undefined}
            onClick={() => setTheme(o.theme)}
            className={`inline-flex items-center justify-center gap-2 rounded-md text-small transition-colors duration-(--duration-fast) ease-standard ${
              compact ? "size-11" : "min-h-11 flex-1"
            } ${pressed ? "bg-dw-selected font-medium text-dw-text outline outline-1 -outline-offset-1 outline-dw-ctl" : "text-dw-text-muted hover:bg-dw-hover"}`}
          >
            {o.icon}
            {compact ? null : o.label}
          </button>
        );
      })}
    </div>
  );
}
