// Invariants that hold after EVERY store action, in any order (retro 3c: per-action tests missed a
// sequence bug). Random but seeded sequences of all actions; after each step:
//  1. the project serializes to a file the parser accepts (so the autosave never ends in quarantine);
//  2. `resolved` is null exactly when a decision is open;
//  3. when resolved, the snapshot's copied fields match the decisions (radius, rules = chosen laws);
//  4. savedAt moves only when the file's text changes, and the file status follows (3d): a project-file
//     download or an open makes it current, any change to the text afterwards makes it behind.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { LAWS } from "@/content/laws";
import { parse } from "@/data/project/parse";
import { serialize } from "@/data/project/serialize";
import { createProjectStore, fileStatus, type ProjectStore } from "@/data/project/store";
import { openDecisions } from "@/domain/decisions";

const harbour = readFileSync(join(__dirname, "..", "..", "fixtures", "harbour.project.json"), "utf8");

function check(store: ProjectStore, trail: string[], before?: { text: string; savedAt: string | null }) {
  const p = store.getState().project;
  const where = trail.join(" → ");
  const action = trail[trail.length - 1];
  const s = store.getState();
  // An open sets both times itself (the file on disk matches); undo open puts the old ones back.
  const opened = action.startsWith("open") && s.errors.length === 0;
  if (before && action !== "undo open" && !opened) {
    const changed = serialize(p) !== before.text;
    if (!changed) expect(s.savedAt, `${where}: savedAt moved without a text change`).toBe(before.savedAt);
    if (changed && !action.startsWith("open")) expect(fileStatus(s).kind, where).not.toBe("current");
  }
  if (action === "download" || (action.startsWith("open") && s.errors.length === 0)) expect(fileStatus(s).kind, where).toBe("current");
  const reparsed = parse(serialize(p));
  expect(reparsed.ok ? [] : reparsed.errors.map((e) => `${e.path}:${e.code}`), where).toEqual([]);
  expect(p.resolved === null, where).toBe(openDecisions(p).length > 0);
  if (p.resolved !== null) {
    expect(p.resolved.radius, where).toBe(p.visual.radius);
    expect(p.resolved.rules.map((r) => r.law), where).toEqual((p.principles ?? []).map((x) => x.lawId));
  }
}

type Action = [string, (s: ProjectStore) => void];
const suggested = (i: number) => ({ lawId: LAWS[i].id, params: Object.fromEntries(LAWS[i].params.map((q) => [q.key, q.suggested])) });
const ACTIONS: Action[] = [
  ["name null", (s) => s.setProfile("name", null)],
  ["name set", (s) => s.setProfile("name", "Harbour")],
  ["platform null", (s) => s.setProfile("platform", null)],
  ["platform both", (s) => s.setProfile("platform", "both")],
  ["notes", (s) => s.setProfile("notes", "n")],
  ["library none", (s) => s.setProfile("componentLibrary", "none")],
  ["radius 6", (s) => s.setVisual("radius", 6)],
  ["radius 0", (s) => s.setVisual("radius", 0)],
  ["radius null", (s) => s.setVisual("radius", null)],
  ["spacing 8", (s) => s.setVisual("spacingBase", 8)],
  ["density airy", (s) => s.setVisual("density", "airy")],
  ["palette deep", (s) => s.setVisual("paletteVariant", "deep")],
  ["palette null", (s) => s.setVisual("paletteVariant", null)],
  ["brand yellow", (s) => s.setVisual("brandHex", "#FFFF00")],
  ["pair inter-solo", (s) => s.setVisual("fontPair", "inter-solo")],
  ["laws null", (s) => s.setPrinciples(null)],
  ["laws []", (s) => s.setPrinciples([])],
  ["laws 1", (s) => s.setPrinciples([suggested(0)])],
  ["laws 3", (s) => s.setPrinciples([suggested(0), suggested(1), suggested(4)])],
  ["keep", (s) => s.keepSnapshot()],
  ["recompute", (s) => s.recomputeSnapshot()],
  ["undo", (s) => s.undoRecompute()],
  ["open harbour", (s) => s.open(harbour)],
  ["open harbour as file", (s) => s.open(harbour, "harbour.dwproj.json")],
  ["open invalid", (s) => s.open("{ nope", "broken.json")],
  ["undo open", (s) => s.undoOpen()],
  ["download", (s) => s.markDownloaded()],
];

/** Storage that is full: every save throws (the download is then the only copy). */
const fullStorage = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 } as Storage;

/** A clock that moves one second per call, so every timestamp is distinct and ordered. */
const ticking = () => {
  let t = Date.parse("2026-10-02T09:00:00.000Z");
  return () => new Date((t += 1000));
};

test("after every action in 300 seeded random sequences, the autosave is valid and the snapshot is consistent", () => {
  let x = 20261002;
  const next = () => (x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (let run = 0; run < 300; run++) {
    const store = createProjectStore(run % 3 === 0 ? fullStorage : null, run % 5 === 0 ? () => new Date("2026-10-02T09:00:00.000Z") : ticking());
    store.open(harbour);
    const trail = ["open harbour"];
    for (let step = 0; step < 15; step++) {
      const [name, act] = ACTIONS[Math.floor(next() * ACTIONS.length)];
      const before = { text: serialize(store.getState().project), savedAt: store.getState().savedAt };
      act(store);
      trail.push(name);
      check(store, trail, before);
    }
  }
}, 30_000); // 300 sequences take about 3–4 s alone; the default 5 s timed out when every test file ran in parallel (slice 4b).

test("reviewer case: a visual change while the name is open is not undone when the name returns", () => {
  const store = createProjectStore(null);
  store.open(harbour);
  store.setProfile("name", null);
  store.setVisual("radius", 6);
  store.setProfile("name", "Harbour");
  expect(store.getState().project.resolved?.radius).toBe(6);
  check(store, ["name null", "radius 6", "name set"]);
});

test("reviewer case: a law change while the platform is open is kept when the platform returns", () => {
  const store = createProjectStore(null);
  store.open(harbour);
  store.setProfile("platform", null);
  store.setPrinciples([suggested(0)]);
  store.setProfile("platform", "desktop");
  expect(store.getState().project.resolved?.rules.map((r) => r.law)).toEqual(["fitts"]);
  check(store, ["platform null", "laws 1", "platform set"]);
});
