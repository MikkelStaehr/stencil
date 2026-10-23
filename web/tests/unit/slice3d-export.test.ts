// Slice 3d owners (design/specs/step-5-export.md §10): open/undo, file status, and the export step's helpers.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { emptyProject, isEmptyProject } from "@/data/project/empty";
import { serialize } from "@/data/project/serialize";
import { STORAGE_KEY } from "@/data/project/storage";
import { createProjectStore, fileStatus } from "@/data/project/store";
import { openDecisionStops } from "@/domain/decisions";
import { countLine } from "@/domain/rules";
import { designMd, OPEN, openMarkerCount } from "@/export/design-md";
import { byteLength, clockTime, formatBytes } from "@/lib/format";

const harbour = readFileSync(join(__dirname, "..", "..", "fixtures", "harbour.project.json"), "utf8");

class MemoryStorage implements Storage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const ticking = () => {
  let t = Date.parse("2026-10-02T09:00:00.000Z");
  return () => new Date((t += 1000));
};

test("undo open restores the project, savedAt, downloadedAt, snapshot state and the autosave byte for byte", () => {
  const storage = new MemoryStorage();
  const store = createProjectStore(storage, ticking());
  store.setProfile("name", "Pier");
  store.setVisual("radius", 4);
  const before = store.getState();
  const envelope = storage.getItem(STORAGE_KEY);

  expect(store.open(harbour, "harbour.dwproj.json")).toEqual([]);
  expect(store.getState().project.profile.name).toBe("Harbour");
  expect(store.getState().openNotice).toEqual({ fileName: "harbour.dwproj.json", undone: false });
  expect(store.getState().replaced?.project).toBe(before.project);

  store.undoOpen();
  const after = store.getState();
  expect(serialize(after.project)).toBe(serialize(before.project));
  expect(after.savedAt).toBe(before.savedAt);
  expect(after.downloadedAt).toBe(before.downloadedAt);
  expect(after.snapshotDiffers).toBe(before.snapshotDiffers);
  expect(after.parked).toEqual(before.parked);
  expect(storage.getItem(STORAGE_KEY)).toBe(envelope);
  expect(after.fileVersion).toBe(before.fileVersion + 2);
  expect(after.openNotice).toEqual({ fileName: "harbour.dwproj.json", undone: true });
  expect(after.replaced).toBeNull();
});

test("undo open expires on the next decision change, Keep/Recompute or another open", () => {
  for (const expire of [
    (s: ReturnType<typeof createProjectStore>) => s.setProfile("notes", "x"),
    (s: ReturnType<typeof createProjectStore>) => s.keepSnapshot(),
    (s: ReturnType<typeof createProjectStore>) => s.recomputeSnapshot(),
  ]) {
    const store = createProjectStore(null, ticking());
    store.open(harbour, "harbour.dwproj.json");
    expire(store);
    expect(store.getState().replaced).toBeNull();
    expect(store.getState().openNotice).toBeNull();
    store.undoOpen();
    expect(store.getState().project.profile.name).toBe("Harbour");
  }
  // Another open replaces the undo with its own: undo then goes back one open, not two.
  const store = createProjectStore(null, ticking());
  store.open(harbour, "a.dwproj.json");
  store.setProfile("notes", "between");
  store.open(harbour, "b.dwproj.json");
  store.undoOpen();
  expect(store.getState().project.profile.notes).toBe("between");
});

test("an invalid open keeps the undo of the previous open and changes nothing else", () => {
  const store = createProjectStore(null, ticking());
  store.open(harbour, "harbour.dwproj.json");
  const before = store.getState();
  expect(store.open("{ nope", "broken.json").length).toBeGreaterThan(0);
  expect(store.getState().project).toBe(before.project);
  expect(store.getState().savedAt).toBe(before.savedAt);
  expect(store.getState().replaced).toBe(before.replaced);
});

test("savedAt moves only when the file's text changes; markDownloaded leaves it alone", () => {
  const store = createProjectStore(null, ticking());
  store.open(harbour);
  const opened = store.getState().savedAt;
  store.setVisual("radius", store.getState().project.visual.radius); // re-choosing is not a change
  expect(store.getState().savedAt).toBe(opened);
  store.markDownloaded();
  expect(store.getState().savedAt).toBe(opened);
  store.setProfile("notes", "changed");
  expect(store.getState().savedAt).not.toBe(opened);
});

test("file status: none until a project file exists, current after download or open, behind after a change", () => {
  const store = createProjectStore(null, ticking());
  store.setProfile("name", "Pier");
  expect(fileStatus(store.getState())).toEqual({ kind: "none" });
  store.markDownloaded();
  const at = store.getState().downloadedAt!;
  expect(fileStatus(store.getState())).toEqual({ kind: "current", at });
  store.setProfile("notes", "after");
  expect(fileStatus(store.getState())).toEqual({ kind: "behind", since: at });
  store.open(harbour, "harbour.dwproj.json");
  expect(fileStatus(store.getState()).kind).toBe("current");
  // Reopening the same text is current too: the file on disk matches.
  store.open(harbour, "harbour.dwproj.json");
  expect(fileStatus(store.getState()).kind).toBe("current");
});

test("a failed autosave still stamps the change, so a downloaded project reads behind (reviewer Must)", () => {
  const full = { ...new MemoryStorage(), getItem: () => null, setItem: () => { throw new Error("full"); }, removeItem: () => {} } as unknown as Storage;
  const store = createProjectStore(full, ticking());
  store.open(harbour);
  store.markDownloaded();
  expect(fileStatus(store.getState()).kind).toBe("current");
  store.setVisual("density", "airy");
  expect(store.getState().saveFailed).toBe(true);
  expect(fileStatus(store.getState()).kind).toBe("behind");
});

test("a change in the same millisecond as a download or open still reads behind (frozen clock)", () => {
  const frozen = () => new Date("2026-10-02T09:00:00.000Z");
  const store = createProjectStore(null, frozen);
  store.open(harbour);
  expect(fileStatus(store.getState()).kind).toBe("current");
  store.setVisual("density", "airy");
  expect(fileStatus(store.getState()).kind).toBe("behind");
  store.markDownloaded();
  expect(fileStatus(store.getState()).kind).toBe("current");
});

test("opening a file that is resolved on load marks it changed: behind, not current", () => {
  const p = JSON.parse(harbour);
  p.resolved = null;
  const store = createProjectStore(null, ticking());
  store.open(JSON.stringify(p), "ready.dwproj.json");
  expect(store.getState().project.resolved).not.toBeNull();
  expect(fileStatus(store.getState()).kind).toBe("behind");
});

test("undo open in a fresh browser removes the autosave it created", () => {
  const storage = new MemoryStorage();
  const store = createProjectStore(storage, ticking());
  store.open(harbour, "harbour.dwproj.json");
  expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  store.undoOpen();
  expect(store.getState().savedAt).toBeNull();
  expect(storage.getItem(STORAGE_KEY)).toBeNull();
});

test("openDecisionStops lists every open decision in path order with the stop that decides it (slice 5b)", () => {
  expect(openDecisionStops(emptyProject())).toEqual([
    { label: "Project name", stop: "profile.identity" },
    { label: "Product type", stop: "profile.identity" },
    { label: "Platform", stop: "profile.platform" },
    { label: "Brand colour", stop: "visual.brandHex" },
    { label: "Palette", stop: "visual.paletteVariant" },
    { label: "Font pair", stop: "visual.fontPair" },
    { label: "Spacing base", stop: "visual.spacingBase" },
    { label: "Radius", stop: "visual.radius" },
    { label: "Density", stop: "visual.density" },
    { label: "UX principles", stop: "principles" },
  ]);
  const store = createProjectStore(null);
  store.open(harbour);
  expect(openDecisionStops(store.getState().project)).toEqual([]);
});

test("isEmptyProject is true only for an untouched project", () => {
  expect(isEmptyProject(emptyProject())).toBe(true);
  expect(isEmptyProject({ ...emptyProject(), profile: { ...emptyProject().profile, notes: "x" } })).toBe(false);
  expect(isEmptyProject({ ...emptyProject(), profile: { ...emptyProject().profile, componentLibrary: "none" } })).toBe(false);
});

test("countLine moved to the rules owner unchanged", () => {
  expect(countLine(null)).toBe("NO RULES YET");
  expect(countLine([])).toBe("NO RULES · DECIDED");
});

test("openMarkerCount counts the exported DESIGN.md's open: design-lead lines", () => {
  const store = createProjectStore(null);
  store.open(harbour);
  const md = designMd(store.getState().project);
  expect(openMarkerCount(md)).toBe(md.split(OPEN).length - 1);
  expect(openMarkerCount(md)).toBe(14);
  expect(openMarkerCount("no markers")).toBe(0);
});

test("byte and time formatting", () => {
  expect(byteLength("abc")).toBe(3);
  expect(byteLength("Nørrebro")).toBe(9);
  expect(formatBytes(6412)).toBe("6,412 bytes");
  expect(formatBytes(1)).toBe("1 byte");
  const now = new Date(2026, 9, 2, 12, 0);
  expect(clockTime(new Date(2026, 9, 2, 9, 5).toISOString(), now)).toBe("09:05");
  expect(clockTime(new Date(2026, 9, 1, 14, 32).toISOString(), now)).toBe("1 Oct, 14:32");
});
