// Slice 3d tester checks (commit 75fe6d6): step 5 export against design/specs/step-5-export.md §9.
// Runs against the built export: ?fixture= is dev-only, so fixture states are seeded into the autosave.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Download, type Locator, type Page } from "@playwright/test";

const KEY = "design-wizard:v1:project";
const isMobile = () => test.info().project.name === "mobile-390";
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const fixture = (name: string): Json => JSON.parse(readFileSync(resolve(`fixtures/${name}.project.json`), "utf8"));
/** Harbour with no stored snapshot: the store resolves a fresh one on load. */
const ready = (): Json => ({ ...fixture("harbour"), resolved: null });
const local = (mo: number, d: number, h: number, mi: number) => new Date(2026, mo - 1, d, h, mi).toISOString();

async function seed(page: Page, p: Json, times: { savedAt?: string; downloadedAt?: string | null } = {}) {
  const envelope = JSON.stringify({
    savedAt: times.savedAt ?? "2026-10-01T09:00:00.000Z",
    downloadedAt: times.downloadedAt ?? null,
    file: JSON.stringify(p, null, 2) + "\n",
  });
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(key, value);
    },
    [KEY, envelope],
  );
}

const saved = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const savedFile = async (page: Page): Promise<Json> => JSON.parse(JSON.parse((await saved(page))!).file);
const h1 = (page: Page) => page.locator("main h1");
const status = (page: Page) => page.locator("main div[role=status]").first();
const row = (page: Page, name: string) => page.locator(`main li[data-file="${name}"]`);
const fileText = async (d: Download) => readFileSync((await d.path())!, "utf8");
const EXPORTS = ["DESIGN.md", "tokens.json", "ux-rules.yaml"];

async function downloadVia(page: Page, button: Locator): Promise<Download> {
  const d = page.waitForEvent("download");
  await button.click();
  return d;
}
async function downloadExports(page: Page): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const f of EXPORTS) out[f] = await fileText(await downloadVia(page, page.getByRole("button", { name: `Download ${f}`, exact: true })));
  return out;
}
/** Collects `n` downloads started by `act` (Download all sends them 150 ms apart). */
async function collect(page: Page, n: number, act: () => Promise<void>): Promise<Download[]> {
  const got: Download[] = [];
  const done = new Promise<void>((ok) => page.on("download", (d) => (got.push(d), got.length === n && ok())));
  await act();
  await done;
  return got;
}
/** J/K from a neutral focus (the h1), until the h1 reads `title`. */
async function press(page: Page, key: "j" | "k", times: number) {
  for (let i = 0; i < times; i++) {
    await h1(page).focus();
    const before = await h1(page).textContent();
    await page.keyboard.press(key);
    await expect(h1(page)).not.toHaveText(before ?? "");
  }
}
async function choose(page: Page, group: string, option: RegExp) {
  await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option }).click();
  await page.getByRole("button", { name: /^Choose / }).click();
}
/** Tabs from the h1 until `match` is focused; returns every focused element's name on the way. */
async function tabTo(page: Page, match: (name: string) => boolean, max = 60): Promise<string[]> {
  await h1(page).focus();
  const seen: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return (el?.getAttribute("aria-label") ?? el?.textContent ?? "").replace(/\s+/g, " ").trim();
    });
    seen.push(name);
    if (match(name)) return seen;
  }
  throw new Error(`never focused; saw ${seen.join(" | ")}`);
}

// ---------- AC8 ----------
// Path order (the labs: Profile, Color, Type, Space & shape, Laws).
const LABELS = ["Project name", "Product type", "Platform", "Brand colour", "Palette", "Font pair", "Spacing base", "Radius", "Density", "UX principles"];
const STOP_TITLE: Record<string, RegExp> = {
  "Project name": /^Name and product type\s*$/,
  "Product type": /^Name and product type\s*$/,
  Platform: /^Platform\s*$/,
  "UX principles": /^UX principles\s*$/,
  "Font pair": /^Font pair\s*$/,
  "Spacing base": /^Spacing\s*$/,
  Radius: /^Radius\s*$/,
  "Brand colour": /^Brand colour\s*$/,
  Palette: /^Palette\s*$/,
  Density: /^Density\s*$/,
};

test("AC8: an empty project lists the 10 decisions in path order, offers no export download, and its project file keeps every decision null", async ({ page }) => {
  await page.goto("/?step=export");
  await expect(h1(page)).toBeFocused();
  const names = await page.locator('section[aria-labelledby="still-open"] li button > span:first-child').allTextContents();
  expect(names).toEqual(LABELS.map((l) => `Decide ${l}`));
  for (const f of EXPORTS) {
    await expect(page.getByRole("button", { name: `Download ${f}` })).toHaveCount(0);
    await expect(row(page, f).locator("summary")).toHaveCount(0);
    await expect(row(page, f).locator("[data-meta]")).toHaveText("blocked until every decision is made");
  }
  const projectRow = page.locator('main li[data-file$=".dwproj.json"]');
  const p = JSON.parse(await fileText(await downloadVia(page, projectRow.getByRole("button", { name: /^Download / }))));
  expect([p.profile.name, p.profile.productType, p.profile.platform, p.principles]).toEqual([null, null, null, null]);
  for (const k of ["fontPair", "spacingBase", "radius", "brandHex", "paletteVariant", "density"]) expect(p.visual[k], k).toBeNull();
  expect(p.resolved).toBeNull();
});

for (const [i, label] of LABELS.entries()) {
  test(`AC8: the "${label}" row opens its stop`, async ({ page }) => {
    await page.goto("/?step=export");
    await page.getByRole("button", { name: new RegExp(`^Decide ${label}\\b`) }).click();
    await expect(h1(page)).toHaveText(STOP_TITLE[label]);
    if (i < 2) await expect(page.locator("main form input").first()).toBeFocused();
  });
}

test("AC8: deciding the last open decision shows the ready state without a reload", async ({ page }) => {
  const p = ready();
  p.visual.density = null;
  await seed(page, p);
  await page.goto("/?step=export");
  await expect(page.getByRole("heading", { name: "STILL OPEN · 1" })).toBeVisible();
  await expect(page.getByText("1 DECISION OPEN", { exact: false })).toBeVisible();
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await h1(page).focus();
  await page.keyboard.press("Enter"); // blocked: Enter = Go to Density
  await expect(h1(page)).toHaveText(/^Density *$/);
  await choose(page, "Density variants", /, Balanced:/);
  await press(page, "j", 2);
  await expect(h1(page)).toHaveText("Export");
  await expect(page.getByRole("heading", { name: "EXPORTS · 3 FILES" })).toBeVisible();
  for (const f of EXPORTS) await expect(page.getByRole("button", { name: `Download ${f}`, exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
});

// ---------- AC9 ----------
test("AC9: radius 8 → 0 changes only the radius lines, 0 is exported as 0px, ux-rules.yaml is byte-equal", async ({ page }) => {
  await seed(page, ready());
  await page.goto("/?step=export");
  await expect(page.getByText("Stored values differ")).toHaveCount(0);
  const before = await downloadExports(page);
  await press(page, "k", 4); // export → preview → laws → density → radius
  await expect(h1(page)).toHaveText(/^Radius *$/);
  await choose(page, "Radius variants", /, 0 px:/); // choosing moves on to density
  expect((await savedFile(page)).visual.radius).toBe(0);
  await press(page, "j", 3); // density → laws → preview → export
  await expect(h1(page)).toHaveText("Export");
  const after = await downloadExports(page);

  expect(after["ux-rules.yaml"]).toBe(before["ux-rules.yaml"]);
  const a = before["DESIGN.md"].split("\n");
  const b = after["DESIGN.md"].split("\n");
  expect(b.length).toBe(a.length);
  const changed = b.filter((l, i) => l !== a[i]);
  expect(changed.length).toBeGreaterThan(0);
  for (const l of changed) expect(l, "DESIGN.md changed line").toMatch(/radius/i);
  expect(after["DESIGN.md"]).toMatch(/Radius: 0px|--radius: 0px/);

  const diffPaths = (x: unknown, y: unknown, path = ""): string[] => {
    if (typeof x !== "object" || x === null || typeof y !== "object" || y === null) return JSON.stringify(x) === JSON.stringify(y) ? [] : [path];
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    return [...keys].flatMap((k) => diffPaths((x as Json)[k], (y as Json)[k], path ? `${path}.${k}` : k));
  };
  const t0 = JSON.parse(before["tokens.json"]);
  const t1 = JSON.parse(after["tokens.json"]);
  const paths = diffPaths(t0, t1);
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) expect(path, "tokens.json changed path").toMatch(/^radius\./);
  expect(JSON.stringify(t1.radius.base)).toMatch(/"0px"|:0\b|"value":0/);
});

// ---------- AC10 ----------
/**
 * waitForEvent("filechooser") turns on the browser's chooser interception without awaiting it, so a chooser opened
 * by the very next key press can beat it (the browser then cancels it and the wait times out). Listen from before
 * the page loads: the navigation is ordered after the interception, so it is on by the time Enter is pressed.
 */
const interceptFileChoosers = (page: Page) => page.on("filechooser", () => {});
test("AC10: a downloaded project file reopened with the keyboard restores every decision and byte-identical exports; Undo open restores the changed density", async ({ page }, info) => {
  await seed(page, ready());
  interceptFileChoosers(page);
  await page.goto("/?step=export");
  await expect(h1(page)).toBeFocused();
  const first = await collect(page, 4, () => page.keyboard.press("Enter"));
  const firstText: Record<string, string> = {};
  for (const d of first) firstText[d.suggestedFilename()] = await fileText(d);
  const projectPath = info.outputPath("harbour.dwproj.json");
  await first[0].saveAs(projectPath);

  await press(page, "k", 3); // export → preview → laws → density
  await expect(h1(page)).toHaveText(/^Density *$/);
  await choose(page, "Density variants", /, Balanced:/); // choosing moves on to laws
  const changedDensity = (await savedFile(page)).visual.density;
  expect(changedDensity).not.toBe("compact");
  await press(page, "j", 2); // laws → preview → export
  await expect(h1(page)).toHaveText("Export");
  const beforeOpen = await saved(page);

  await tabTo(page, (n) => n === "Open project file…" && true);
  // The step 5 button, not the rail's: the rail comes before main in tab order, so make sure it is in main.
  expect(await page.evaluate(() => !!document.activeElement?.closest("main"))).toBe(true);
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (await chooser).setFiles(projectPath);
  await expect(page.locator("#opened-title")).toHaveText("Opened harbour.dwproj.json.");
  await expect(page.locator("#opened-title")).toBeFocused();
  expect(JSON.parse((await saved(page))!).file).toBe(firstText["harbour.dwproj.json"]);
  if (!isMobile()) {
    // The rail expands only the current lab: visit Density (navigation is not a change) to read its value there.
    await press(page, "k", 3);
    await expect(page.locator('nav[aria-label="Labs"]')).toContainText("Compact");
    await press(page, "j", 3);
    await expect(h1(page)).toHaveText("Export");
  }
  const reopened = await downloadExports(page);
  for (const f of EXPORTS) expect(reopened[f], f).toBe(firstText[f]);

  await page.getByRole("button", { name: "Undo open" }).click();
  await expect(page.locator("#opened-title")).toHaveText("Back to Harbour.");
  expect(await saved(page)).toBe(beforeOpen);
  expect((await savedFile(page)).visual.density).toBe(changedDensity);
});

const ENTRY: [string, (page: Page) => Locator, "desktop" | "mobile" | "both"][] = [
  ["step 5", (page) => page.locator("main section").getByRole("button", { name: "Open project file…" }), "both"],
  ["the rail", (page) => page.locator('nav[aria-label="Labs"]').getByRole("button", { name: "Open project file…" }), "desktop"],
  ["the mobile header", (page) => page.locator("header").getByRole("button", { name: "Open file" }), "mobile"],
];
for (const [where, button, only] of ENTRY) {
  test(`AC10: invalid-many opened from ${where} with the keyboard lists every problem, focuses the panel h2 and changes nothing`, async ({ page }) => {
    test.skip(only === "desktop" ? isMobile() : only === "mobile" ? !isMobile() : false, `${where} exists only at that width`);
    const expected = JSON.parse(readFileSync(resolve("fixtures/invalid-many.errors.json"), "utf8")).length;
    await seed(page, ready());
    interceptFileChoosers(page);
    await page.goto("/?step=export");
    await expect(h1(page)).toBeFocused();
    const store = await saved(page);
    const projectText = await row(page, "harbour.dwproj.json").locator("pre").textContent();
    await button(page).focus();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles(resolve("fixtures/invalid-many.project.json"));
    const title = page.locator("#file-errors-title");
    await expect(title).toHaveText(`The project file could not be opened: ${expected} problems`);
    await expect(title).toBeFocused();
    await expect(page.locator('section[aria-labelledby="file-errors-title"] li')).toHaveCount(expected);
    expect(await saved(page)).toBe(store);
    expect(await row(page, "harbour.dwproj.json").locator("pre").textContent()).toBe(projectText);
    if (where === "step 5")
      await expect(page.locator("main section").getByText(`invalid-many.project.json could not be opened: ${expected} problems, listed at the top. Nothing here changed.`)).toBeVisible();
  });
}

// ---------- Names and sizes ----------
test("names and sizes: Enter downloads the 4 files in manifest order; each byte count and <pre> equals its file", async ({ page }) => {
  await seed(page, fixture("harbour"));
  await page.goto("/?step=export");
  await expect(h1(page)).toBeFocused();
  const files = await collect(page, 4, () => page.keyboard.press("Enter"));
  expect(files.map((d) => d.suggestedFilename())).toEqual(["harbour.dwproj.json", ...EXPORTS]);
  for (const d of files) {
    const name = d.suggestedFilename();
    const buf = readFileSync((await d.path())!);
    const r = row(page, name);
    await expect(r.locator("[data-meta]")).toHaveText(new RegExp(`^${buf.length.toLocaleString("en-GB")} bytes`));
    await r.locator("summary").click();
    expect(await r.locator("pre").textContent(), name).toBe(buf.toString("utf8"));
  }
});

test("names: the edge-name project file downloads as norrebro-idas-1.dwproj.json", async ({ page }) => {
  await seed(page, fixture("edge-name"));
  await page.goto("/?step=export");
  const d = await downloadVia(page, page.getByRole("button", { name: "Download norrebro-idas-1.dwproj.json" }));
  expect(d.suggestedFilename()).toBe("norrebro-idas-1.dwproj.json");
});

// ---------- markDownloaded ----------
test("markDownloaded: DESIGN.md alone saves nothing; the project file makes it current; a decision change makes it behind", async ({ page }) => {
  await seed(page, ready());
  await page.goto("/?step=export");
  await downloadVia(page, page.getByRole("button", { name: "Download DESIGN.md" }));
  await expect(status(page)).toContainText("NO PROJECT FILE YET");
  expect(JSON.parse((await saved(page))!).downloadedAt).toBeNull();
  await downloadVia(page, page.getByRole("button", { name: "Download harbour.dwproj.json" }));
  await expect(status(page)).toContainText("PROJECT FILE UP TO DATE");
  expect(JSON.parse((await saved(page))!).downloadedAt).not.toBeNull();
  await press(page, "k", 3); // export → preview → laws → density
  await choose(page, "Density variants", /, Balanced:/); // choosing moves on to laws
  await press(page, "j", 2);
  await expect(status(page)).toContainText(/UNSAVED SINCE \d\d:\d\d/);
});

test("markDownloaded: the behind state reads UNSAVED SINCE 1 Oct, 14:32 (spec §8)", async ({ page }) => {
  await seed(page, fixture("harbour"), { savedAt: local(10, 2, 9, 10), downloadedAt: local(10, 1, 14, 32) });
  await page.goto("/?step=export");
  await expect(status(page).locator("p").first()).toHaveText("UNSAVED SINCE 1 Oct, 14:32");
});

// ---------- Hint ----------
for (const [fx, slug] of [["harbour", "harbour"], ["edge-name", "norrebro-idas-1"]] as const) {
  test(`hint: ${fx} shows design/${slug}.dwproj.json, the same path as DESIGN.md's provenance line`, async ({ page }) => {
    await seed(page, fixture(fx));
    await page.goto("/?step=export");
    await expect(page.locator("main code", { hasText: `design/${slug}.dwproj.json` })).toHaveText(`design/${slug}.dwproj.json`);
    const md = await fileText(await downloadVia(page, page.getByRole("button", { name: "Download DESIGN.md" })));
    expect(md).toContain(`\`design/${slug}.dwproj.json\``);
  });
}

// ---------- Keyboard ----------
test("keyboard: Continue to export (Enter) lands on step 5 with the h1 focused; Tab reaches every Download; K and E go to step 4", async ({ page }) => {
  await seed(page, fixture("harbour"));
  await page.goto("/?step=preview");
  await h1(page).focus();
  await page.keyboard.press("Enter");
  await expect(h1(page)).toHaveText("Export");
  await expect(h1(page)).toBeFocused();
  const seen = await tabTo(page, (n) => n === "Download ux-rules.yaml");
  for (const f of ["harbour.dwproj.json", ...EXPORTS]) expect(seen).toContain(`Download ${f}`);
  await h1(page).focus();
  await page.keyboard.press("k");
  await expect(h1(page)).toHaveText("Live preview");
  await page.keyboard.press("Enter");
  await expect(h1(page)).toHaveText("Export");
  await h1(page).focus();
  await page.keyboard.press("e");
  await expect(h1(page)).toHaveText("Live preview");
});

test("keyboard: blocked, Enter goes to the first open stop", async ({ page }) => {
  await page.goto("/?step=export");
  await expect(h1(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(h1(page)).toHaveText("Name and product type");
});

// ---------- 44px and focus ----------
test("44px: rows, Download buttons, summaries, Open buttons and the bar button; focus never under the sticky bar", async ({ page }) => {
  await seed(page, fixture("harbour"));
  await page.goto("/?step=export");
  await expect(page.getByRole("button", { name: "Download DESIGN.md" })).toBeVisible();
  const targets = page.locator(
    'main li[data-file] > div, main li[data-file] button, main li[data-file] summary, main [data-primary-action], button:text-is("Open project file…"), button:text-is("Open file")',
  );
  const heights = await targets.evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => [e.textContent?.trim().slice(0, 30), e.getBoundingClientRect().height] as const),
  );
  expect(heights.length).toBeGreaterThan(10);
  for (const [name, h] of heights) expect(h, String(name)).toBeGreaterThanOrEqual(44);

  await h1(page).focus();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const barEl = document.querySelector("main [data-primary-action]")!.parentElement!;
      // The ≤760px lab overview (5b2) comes after the step, below the bar's container, so the bar can't cover it.
      if (barEl.contains(el) || !el.closest("main") || el.closest('nav[aria-label="All labs"]')) return null;
      const outline = getComputedStyle(el).outlineStyle;
      return { name: el.textContent?.trim().slice(0, 30), bottom: el.getBoundingClientRect().bottom, barTop: barEl.getBoundingClientRect().top, outline };
    });
    if (r === null) continue;
    expect(r.bottom, `${r.name} under the bar`).toBeLessThanOrEqual(r.barTop + 0.5);
    expect(r.outline, `${r.name} focus outline`).not.toBe("none");
  }
});

test("44px: blocked rows are at least 44px tall", async ({ page }) => {
  await page.goto("/?step=export");
  const rows = page.locator('section[aria-labelledby="still-open"] li button');
  // The static HTML shows "Opening your project…" until hydration: wait for the rows before measuring.
  await expect(rows).toHaveCount(10);
  const hs = await rows.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(hs).toHaveLength(10);
  for (const h of hs) expect(h).toBeGreaterThanOrEqual(44);
});

// ---------- Overflow and glyphs ----------
test("no horizontal overflow with edge-name, and every chevron is an SVG", async ({ page }) => {
  await seed(page, fixture("edge-name"));
  await page.goto("/?step=export");
  // Wait for the hydrated manifest, not the static HTML, before measuring.
  await expect(page.getByRole("button", { name: "Download DESIGN.md" })).toBeVisible();
  for (const s of await page.locator("main summary").all()) await s.click();
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw).toBeLessThanOrEqual(cw);
  for (const s of await page.locator("main summary").all()) await expect(s.locator("svg")).toHaveCount(1);
  // Chrome only: the <pre> bodies are file text (DESIGN.md quotes with ">").
  const chromeText = await page.locator("main").evaluate((m) => {
    const c = m.cloneNode(true) as HTMLElement;
    c.querySelectorAll("pre").forEach((p) => p.remove());
    return c.textContent ?? "";
  });
  expect(chromeText).not.toMatch(/[›❯▸▶>]/);
});

// ---------- Opened notice ----------
test("opened notice: Undo open disappears after the next decision change", async ({ page }) => {
  await seed(page, ready());
  await page.goto("/?step=export");
  await page.locator("main section input[type=file]").setInputFiles(resolve("fixtures/edge-name.project.json"));
  await expect(page.locator("#opened-title")).toBeVisible();
  await press(page, "k", 3); // export → preview → laws → density
  await expect(page.locator("#opened-title")).toBeVisible(); // navigation is not a change
  await page.getByRole("radiogroup", { name: "Density variants" }).locator('[role="radio"][aria-checked="false"]').first().click();
  await page.getByRole("button", { name: /^Choose / }).click();
  await expect(page.locator("#opened-title")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo open" })).toHaveCount(0);
});

test("opened notice: the replaced-work download saves the old project and leaves the bar status alone", async ({ page }) => {
  await seed(page, ready());
  await page.goto("/?step=export");
  await expect(h1(page)).toBeFocused(); // hydrated: the fresh snapshot is persisted
  const old = JSON.parse((await saved(page))!).file;
  await page.locator("main section input[type=file]").setInputFiles(resolve("fixtures/edge-name.project.json"));
  await expect(page.getByText("It replaced Harbour, which had changes in no downloaded file.")).toBeVisible();
  const statusBefore = await status(page).textContent();
  const store = await saved(page);
  const d = await downloadVia(page, page.getByRole("button", { name: "Download harbour.dwproj.json" }));
  expect(d.suggestedFilename()).toBe("harbour.dwproj.json");
  expect(await fileText(d)).toBe(old);
  expect(await status(page).textContent()).toBe(statusBefore);
  expect(await saved(page)).toBe(store);
});

test("opened notice: no replaced-work warning when the old project was downloaded, or was empty", async ({ page }) => {
  await seed(page, ready());
  await page.goto("/?step=export");
  await downloadVia(page, page.getByRole("button", { name: "Download harbour.dwproj.json" }));
  await page.locator("main section input[type=file]").setInputFiles(resolve("fixtures/edge-name.project.json"));
  await expect(page.locator("#opened-title")).toBeVisible();
  await expect(page.getByText(/It replaced/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo open" })).toBeVisible();
});

test("opened notice: no replaced-work warning when the old project was empty", async ({ page }) => {
  await page.goto("/?step=export");
  await page.locator("main section input[type=file]").setInputFiles(resolve("fixtures/edge-name.project.json"));
  await expect(page.locator("#opened-title")).toBeVisible();
  await expect(page.getByText(/It replaced/)).toHaveCount(0);
});
