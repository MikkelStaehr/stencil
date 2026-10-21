import { afterEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_THEME, THEME_BOOT, THEME_KEY, currentTheme, setTheme } from "@/lib/theme";

// lib/theme.ts in node: THEME_BOOT is a plain script string, so it runs against fake browser globals.

type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void };

const memory = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => ({
  data: { ...init },
  getItem(k) {
    return k in this.data ? this.data[k] : null;
  },
  setItem(k, v) {
    this.data[k] = v;
  },
});
const failing: Store = {
  getItem: () => {
    throw new Error("storage blocked");
  },
  setItem: () => {
    throw new Error("storage blocked");
  },
};

function boot(search: string, storage: Store): { theme: string | undefined; warnings: unknown[][] } {
  const doc = { documentElement: { dataset: {} as Record<string, string> } };
  const warnings: unknown[][] = [];
  const fakeConsole = { warn: (...a: unknown[]) => warnings.push(a) };
  new Function("document", "location", "localStorage", "console", THEME_BOOT)(doc, { search }, storage, fakeConsole);
  return { theme: doc.documentElement.dataset.theme, warnings };
}

describe("THEME_BOOT (before first paint)", () => {
  test("no stored choice: dark, whatever the OS says", () => {
    expect(boot("", memory())).toEqual({ theme: "dark", warnings: [] });
    expect(DEFAULT_THEME).toBe("dark");
  });

  test("a stored choice is applied", () => {
    expect(boot("", memory({ [THEME_KEY]: "light" })).theme).toBe("light");
  });

  test("?theme= wins for this load and is not stored", () => {
    const s = memory({ [THEME_KEY]: "dark" });
    expect(boot("?fixture=harbour&theme=light", s).theme).toBe("light");
    expect(s.data[THEME_KEY]).toBe("dark");
  });

  test("an unknown ?theme= or stored value warns and is never guessed", () => {
    const q = boot("?theme=Dark", memory({ [THEME_KEY]: "light" }));
    expect(q.theme).toBe("light");
    expect(q.warnings).toHaveLength(1);
    const s = boot("", memory({ [THEME_KEY]: "sepia" }));
    expect(s).toMatchObject({ theme: "dark" });
    expect(s.warnings).toHaveLength(1);
  });

  test("storage that throws gives dark and a warning", () => {
    const r = boot("", failing);
    expect(r.theme).toBe("dark");
    expect(r.warnings).toHaveLength(1);
  });
});

describe("setTheme (the toggle)", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("switches the tab and stores the choice", () => {
    const s = memory();
    vi.stubGlobal("document", { documentElement: { dataset: {} } });
    vi.stubGlobal("localStorage", s);
    setTheme("light");
    expect(currentTheme()).toBe("light");
    expect(s.data[THEME_KEY]).toBe("light");
  });

  test("failing storage still switches the tab and warns once", () => {
    vi.stubGlobal("document", { documentElement: { dataset: {} } });
    vi.stubGlobal("localStorage", failing);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setTheme("light");
    setTheme("dark");
    expect(currentTheme()).toBe("dark");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
