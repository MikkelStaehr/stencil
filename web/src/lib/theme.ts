// The chrome theme (DESIGN.md Part B, design/specs/chrome-family.md §4). A UI preference of this browser:
// never in the project file, the store, the autosave or the exports. Imports nothing from src.

export type Theme = "dark" | "light";

export const THEME_KEY = "stencil.theme";
/** Dark regardless of the OS setting (user, 2026-10-21). */
export const DEFAULT_THEME: Theme = "dark";

const isTheme = (v: unknown): v is Theme => v === "dark" || v === "light";

/** The theme on <html> now; THEME_BOOT set it before first paint. */
export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return isTheme(t) ? t : DEFAULT_THEME;
}

const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let warned = false;

/** Applies the theme to this tab, then stores it. Failing storage still switches the tab and warns once. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    if (!warned) {
      warned = true;
      console.warn("Stencil could not save the theme; it applies to this tab only.", e);
    }
  }
  listeners.forEach((l) => l());
}

/**
 * Runs in <head> before first paint: `?theme=dark|light` for this load only (screenshots, e2e; not stored),
 * else the stored value, else dark. An unknown stored value is ignored with a warning, never guessed.
 */
export const THEME_BOOT = `(function(){var t=null;try{t=new URLSearchParams(location.search).get("theme");if(t!=="dark"&&t!=="light"){t=localStorage.getItem("${THEME_KEY}");if(t!==null&&t!=="dark"&&t!=="light"){console.warn("Stencil ignored an unknown stored theme: "+t);t=null}}}catch(e){t=null}document.documentElement.dataset.theme=t||"${DEFAULT_THEME}"})()`;
