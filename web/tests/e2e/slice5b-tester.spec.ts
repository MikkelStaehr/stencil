// Slice 5b tester checks (commit 16059ae, the shell into labs): the rail's labs and the 12-stop path, the eyebrow,
// J/K/E, choosing in path order, ?step=/?lab= links, the palette's read-only brand colour, the blocked export list,
// accent only in the rail, plates identical across chrome themes, no overflow at 390 in both themes, and a full
// keyboard walk in light with zero non-localhost requests. Runs against the built export (localStorage seeding;
// ?fixture= is development-only, so the built export's empty start and a seeded harbour stand in for it).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const KEY = "design-wizard:v1:project";
const isMobile = () => test.info().project.name === "mobile-390";
type Json = Record<string, unknown> & { profile: Record<string, unknown>; visual: Record<string, unknown> };
const harbour = (): Json => JSON.parse(readFileSync(resolve("fixtures/harbour.project.json"), "utf8"));
/** The parser requires resolved = null while any decision is open (parse.ts:202). */
const opened = (p: Json): Json => ({ ...p, resolved: null });

async function seed(page: Page, p: Json) {
  const envelope = JSON.stringify({ savedAt: "2026-10-01T09:00:00.000Z", downloadedAt: null, file: JSON.stringify(p, null, 2) + "\n" });
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(key, value);
    },
    [KEY, envelope],
  );
}

const h1 = (page: Page) => page.locator("main h1");
const eyebrow = (page: Page) => page.locator("main p", { hasText: /^Path · stop/ });
const saved = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const rail = (page: Page) => page.getByRole("navigation", { name: "Labs" });

const LABS = ["Profile", "Color", "Type", "Space & shape", "Laws", "Preview", "Export"];
const STOPS: { id: string; lab: string; label: string; h1: string | RegExp }[] = [
  { id: "profile.identity", lab: "Profile", label: "Name & type", h1: "Name and product type" },
  { id: "profile.platform", lab: "Profile", label: "Platform", h1: "Platform" },
  { id: "profile.library", lab: "Profile", label: "Component library", h1: "Component library" },
  { id: "visual.brandHex", lab: "Color", label: "Brand colour", h1: "Brand colour" },
  // The h1 is "Palette" since the 5b review (user, 2026-10-23: the spec wins over "the same h1 as before").
  { id: "visual.paletteVariant", lab: "Color", label: "Palette", h1: /^\s*Palette\s*$/ },
  { id: "visual.fontPair", lab: "Type", label: "Font pair", h1: /^\s*Font pair\s*$/ },
  { id: "visual.spacingBase", lab: "Space & shape", label: "Spacing", h1: /^\s*Spacing\s*$/ },
  { id: "visual.radius", lab: "Space & shape", label: "Radius", h1: /^\s*Radius\s*$/ },
  { id: "visual.density", lab: "Space & shape", label: "Density", h1: /^\s*Density\s*$/ },
  { id: "principles", lab: "Laws", label: "Laws", h1: "UX principles" },
  { id: "preview", lab: "Preview", label: "Sample screen", h1: "Live preview" },
  { id: "export", lab: "Export", label: "Files", h1: "Export" },
];

async function hydrated(page: Page) {
  await expect(h1(page)).toBeVisible();
}

/** Picks variant `n` with its digit and chooses it with Enter, once the plates' fonts are in. */
async function pick(page: Page, n: number) {
  await expect(page.locator('main [role="radiogroup"] [role="radio"]').nth(n - 1)).toBeVisible();
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  await page.keyboard.press(String(n));
  await page.keyboard.press("Enter");
}

// ---- 2: the rail ----
test("C2: the rail lists the 7 labs in order, only the current one expanded; across labs the 12 stops are in path order", async ({ page }) => {
  test.skip(isMobile(), "the rail is hidden at 390");
  await seed(page, harbour());
  const labsSeen: string[][] = [];
  const stopsSeen: string[] = [];
  for (const labId of ["profile", "color", "type", "space", "laws", "preview", "export"]) {
    await page.goto(`/?lab=${labId}`);
    await hydrated(page);
    const names = await rail(page).locator("ol > li > span > button > span:first-child").allTextContents();
    labsSeen.push(names);
    // Exactly one lab is current and only it shows its stops.
    await expect(rail(page).locator('ol > li[aria-current="true"]')).toHaveCount(1);
    const stopLists = rail(page).locator("ol > li ol, ol > li ul");
    const expanded = await rail(page).locator("ol > li").evaluateAll((lis) => lis.map((li) => li.querySelectorAll("[data-stop-mark]").length > 0));
    expect(expanded.filter(Boolean)).toHaveLength(1);
    expect(await stopLists.count()).toBeGreaterThanOrEqual(1);
    const rows = await rail(page)
      .locator('ol > li[aria-current="true"] [data-stop-mark]')
      .evaluateAll((marks) => marks.map((m) => (m.closest("button,a,[role=button]") as HTMLElement | null)?.innerText.split("\n")[0].trim() ?? "?"));
    stopsSeen.push(...rows);
  }
  for (const names of labsSeen) expect(names).toEqual(LABS);
  expect(stopsSeen).toEqual(STOPS.map((s) => s.label));
});

// ---- 3 + 14 + 11: every stop, both themes ----
for (const theme of ["dark", "light"] as const) {
  test(`C3/C14/C11 (${theme}): every stop's eyebrow and n; 390 header "Stop n of 12" and no overflow; accent only in the rail at 1280`, async ({ page }) => {
    await seed(page, harbour());
    for (const [i, s] of STOPS.entries()) {
      await page.goto(`/?step=${s.id}&theme=${theme}`);
      await hydrated(page);
      await expect(h1(page)).toHaveText(s.h1);
      expect(await eyebrow(page).evaluate((e) => e.textContent?.trim())).toBe(`Path · stop ${i + 1} of 12 · ${s.lab}`);
      expect(await eyebrow(page).evaluate((e) => getComputedStyle(e).textTransform)).toBe("uppercase");
      if (isMobile()) {
        await expect(page.locator("header")).toContainText(`Stop ${i + 1} of 12`);
        await expect(page.getByText("Loading fonts…")).toHaveCount(0);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, `${s.id} overflows by ${over}px in ${theme}`).toBeLessThanOrEqual(0);
      } else {
        const accent = await page.evaluate(() => {
          const probe = document.createElement("div");
          document.body.appendChild(probe);
          const resolveVar = (v: string) => {
            probe.style.color = `var(${v})`;
            return getComputedStyle(probe).color;
          };
          const colors = new Set([resolveVar("--dw-accent"), resolveVar("--dw-accent-fill")]);
          probe.remove();
          const props = ["color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor", "fill", "stroke"] as const;
          const widthOf: Record<string, string> = { borderTopColor: "borderTopWidth", borderRightColor: "borderRightWidth", borderBottomColor: "borderBottomWidth", borderLeftColor: "borderLeftWidth", outlineColor: "outlineWidth" };
          const hits: { where: string; what: string; prop: string; w: number; h: number }[] = [];
          for (const el of document.querySelectorAll<HTMLElement>("body *")) {
            if (el.closest("[data-v-root]") || el.offsetParent === null) continue;
            const cs = getComputedStyle(el);
            for (const p of props) {
              const val = cs[p];
              if (!colors.has(val)) continue;
              if (widthOf[p] && (parseFloat(cs[widthOf[p] as "borderTopWidth"]) === 0 || (p === "outlineColor" && cs.outlineStyle === "none"))) continue;
              if (p === "color" && (el.textContent ?? "").trim() === "" && !el.querySelector("svg")) continue;
              if ((p === "fill" || p === "stroke") && !(el instanceof SVGElement)) continue;
              const r = el.getBoundingClientRect();
              hits.push({ where: el.closest('nav[aria-label="Labs"]') ? "rail" : "outside", what: `${el.tagName}.${el.className}`.slice(0, 90), prop: p, w: Math.round(r.width), h: Math.round(r.height) });
            }
          }
          return hits;
        });
        const outside = accent.filter((h) => h.where === "outside");
        expect(outside, `${s.id} ${theme}: accent outside the rail`).toEqual([]);
        const inRail = accent.filter((h) => h.where === "rail");
        const squares = inRail.filter((h) => h.prop === "backgroundColor" && h.w === 6 && h.h === 6);
        expect(squares, `${s.id}: exactly one 6px stop square`).toHaveLength(1);
        const chip = inRail.filter((h) => h.prop === "backgroundColor" && h.w === 22);
        expect(chip, `${s.id}: one lab chip`).toHaveLength(1);
        const rule = inRail.filter((h) => h.prop === "borderLeftColor" && h.what.startsWith("LI"));
        expect(rule, `${s.id}: one lab rule`).toHaveLength(1);
        const hollow = inRail.filter((h) => h.prop.startsWith("border") && h.w === 12 && h.h === 12);
        expect(hollow.length, `${s.id}: the hollow mark`).toBeGreaterThanOrEqual(1);
        // Nothing else in the rail carries the accent.
        const known = new Set([...squares, ...chip, ...rule, ...hollow]);
        expect(inRail.filter((h) => !known.has(h)), `${s.id}: other accent in the rail`).toEqual([]);
        // The square sits on the aria-current="step" row.
        const squareOnCurrent = await rail(page)
          .locator('[aria-current="step"] [data-stop-mark]')
          .evaluate((m) => getComputedStyle(m).backgroundColor !== "rgba(0, 0, 0, 0)");
        expect(squareOnCurrent).toBe(true);
      }
    }
  });
}

// ---- 5: J/K never write; ends do nothing; E ----
test("C5: a J/K-only walk over all 12 stops leaves the autosave bytes unchanged; K on stop 1 and J on stop 12 do nothing", async ({ page }) => {
  await seed(page, harbour());
  await page.goto("/?step=profile.identity");
  await hydrated(page);
  await expect(h1(page)).toHaveText(STOPS[0].h1);
  await expect(h1(page)).toBeFocused();
  const before = await saved(page);
  expect(before).not.toBeNull();
  await page.keyboard.press("k");
  await expect(h1(page)).toHaveText(STOPS[0].h1);
  for (const s of STOPS.slice(1)) {
    await page.keyboard.press("j");
    await expect(h1(page)).toHaveText(s.h1);
    await expect(h1(page)).toBeFocused();
  }
  await page.keyboard.press("j");
  await expect(h1(page)).toHaveText("Export");
  for (const s of [...STOPS].reverse().slice(1)) {
    await page.keyboard.press("k");
    await expect(h1(page)).toHaveText(s.h1);
  }
  await page.keyboard.press("k");
  await expect(h1(page)).toHaveText(STOPS[0].h1);
  expect(await saved(page)).toBe(before);
});

test("C5: E opens the nearest decided stop before, else the last decided stop after", async ({ page }) => {
  const p = harbour();
  p.visual.radius = null;
  p.visual.density = null;
  await seed(page, opened(p));
  await page.goto("/?step=visual.density");
  await hydrated(page);
  await expect(h1(page)).toBeFocused();
  await page.keyboard.press("e");
  await expect(h1(page)).toHaveText(/^\s*Spacing\s*$/);
});

test("C5: E on an empty project's first stop opens the last decided stop on the path", async ({ page }) => {
  await page.goto("/?step=profile.platform");
  await hydrated(page);
  await expect(h1(page)).toBeFocused();
  await page.keyboard.press("e");
  // profile.identity is open; library, preview and export are always decided: nearest before is none → the last decided after.
  await expect(h1(page)).toHaveText("Export");
});

// ---- 6: choosing moves on in path order ----
test("C6: choosing the component library moves on to Brand colour; choosing density moves on to Laws", async ({ page }) => {
  const p = harbour();
  p.visual.density = null;
  await seed(page, opened(p));
  await page.goto("/?step=profile.library");
  await hydrated(page);
  await pick(page, 1);
  await expect(h1(page)).toHaveText("Brand colour");
  await page.goto("/?step=visual.density");
  await hydrated(page);
  await pick(page, 2);
  await expect(h1(page)).toHaveText("UX principles");
  expect(JSON.parse(JSON.parse((await saved(page)) ?? "{}").file).visual.density).not.toBeNull();
});

// ---- 7 + 8: links ----
test("C7: ?step= for every stop id and the aliases visual.palette / visual.spacing open the expected h1", async ({ page }) => {
  await seed(page, harbour());
  const cases: [string, string | RegExp][] = [...STOPS.map((s) => [s.id, s.h1] as [string, string | RegExp]), ["visual.palette", /^\s*Palette\s*$/], ["visual.spacing", /^\s*Spacing\s*$/]];
  for (const [id, title] of cases) {
    await page.goto(`/?step=${id}`);
    await expect(h1(page)).toHaveText(title);
  }
});

test("C7: an unknown ?step= warns in the console and opens the first open stop", async ({ page }) => {
  const p = harbour();
  p.visual.fontPair = null;
  await seed(page, opened(p));
  const warnings: string[] = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
  await page.goto("/?step=visual.nope");
  await expect(h1(page)).toHaveText(/^\s*Font pair\s*$/);
  await expect.poll(() => warnings.some((w) => w.includes("?step=visual.nope"))).toBe(true);
});

test("C8: ?lab= opens the lab's first open stop, else its first stop; ?step= wins; an unknown ?lab= warns", async ({ page }) => {
  const p = harbour();
  p.visual.radius = null;
  await seed(page, opened(p));
  const warnings: string[] = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
  await page.goto("/?lab=space");
  await expect(h1(page)).toHaveText(/^\s*Radius\s*$/);
  await page.goto("/?lab=color");
  await expect(h1(page)).toHaveText("Brand colour");
  await page.goto("/?lab=export");
  await expect(h1(page)).toHaveText("Export");
  await page.goto("/?lab=color&step=visual.density");
  await expect(h1(page)).toHaveText(/^\s*Density\s*$/);
  await page.goto("/?step=visual.density&lab=color");
  await expect(h1(page)).toHaveText(/^\s*Density\s*$/);
  await page.goto("/?lab=bogus");
  await expect(h1(page)).toHaveText(/^\s*Radius\s*$/);
  await expect.poll(() => warnings.some((w) => w.includes("?lab=bogus"))).toBe(true);
});

test("C8: ?lab= on an empty project opens the lab's first open stop", async ({ page }) => {
  await page.goto("/?lab=space");
  await expect(h1(page)).toHaveText(/^\s*Spacing\s*$/);
  await page.goto("/?lab=profile");
  await expect(h1(page)).toHaveText("Name and product type");
});

// ---- 9: palette shows the brand read-only ----
test("C9: the palette stop shows the brand colour read-only; with none it offers a way to the Brand colour stop", async ({ page }) => {
  const p = harbour();
  await seed(page, p);
  await page.goto("/?step=visual.paletteVariant");
  await hydrated(page);
  await expect(page.locator("main")).toContainText(`From brand colour ${p.visual.brandHex as string}`);
  await expect(page.locator("main input")).toHaveCount(0);
  await expect(page.locator("main #brand-hex")).toHaveCount(0);

  await page.evaluate(() => sessionStorage.clear());
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.context().clearCookies();
  const fresh = await page.context().newPage();
  await fresh.goto("/?step=visual.paletteVariant");
  await expect(h1(fresh)).toBeVisible();
  await expect(fresh.locator("main")).toContainText("Enter the brand colour at stop 4");
  await fresh.getByRole("button", { name: "Go to Brand colour" }).click();
  await expect(h1(fresh)).toHaveText("Brand colour");
});

test("C9b: Continue to palette never drops a draft: invalid or empty stays, says why and focuses the field; a valid one is recorded", async ({ page }) => {
  const p = harbour();
  await seed(page, p);
  await page.goto("/?step=visual.brandHex");
  await hydrated(page);
  const field = page.locator("#brand-hex");
  const before = await saved(page);

  await field.fill("teal");
  await page.getByRole("button", { name: /Continue to palette/ }).click();
  await expect(h1(page)).toHaveText("Brand colour");
  await expect(page.locator("#brand-hex-error")).toBeVisible();
  await expect(field).toBeFocused();
  expect(await saved(page)).toBe(before);

  await field.fill("");
  await field.press("Enter");
  await expect(h1(page)).toHaveText("Brand colour");
  await expect(page.locator("#brand-hex-error")).toBeVisible();
  expect(await saved(page)).toBe(before);

  await field.fill("#112233");
  await page.getByRole("button", { name: /Continue to palette/ }).click();
  await expect(h1(page)).toHaveText("Palette");
  await expect(page.locator("main")).toContainText("From brand colour #112233");
});

// ---- 10: blocked list ----
test("C10: the export step's blocked list is in path order with each row's lab; Enter goes to the first open stop", async ({ page }) => {
  const p = harbour();
  p.principles = null;
  p.visual.radius = null;
  p.visual.brandHex = null;
  p.profile.platform = null;
  await seed(page, opened(p));
  await page.goto("/?step=export");
  await hydrated(page);
  const rows = await page.locator('section[aria-labelledby="still-open"] li button').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).innerText.replace(/\s+/g, " ").replace(/^Decide /, "").trim()));
  expect(rows).toEqual(["Platform Profile", "Brand colour Color", "Radius Space & shape", "UX principles Laws"]);
  await expect(h1(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(h1(page)).toHaveText("Platform");
});

test("C10: an empty project's blocked list follows the 12-stop path", async ({ page }) => {
  await page.goto("/?step=export");
  await hydrated(page);
  const rows = await page.locator('section[aria-labelledby="still-open"] li button').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).innerText.replace(/\s+/g, " ").replace(/^Decide /, "").trim()));
  expect(rows).toEqual([
    "Project name Profile",
    "Product type Profile",
    "Platform Profile",
    "Brand colour Color",
    "Palette Color",
    "Font pair Type",
    "Spacing base Space & shape",
    "Radius Space & shape",
    "Density Space & shape",
    "UX principles Laws",
  ]);
});

// ---- 12: plates identical in dark and light ----
for (const stop of ["profile.platform", "visual.paletteVariant", "visual.fontPair", "visual.spacingBase", "visual.radius", "visual.density", "preview"]) {
  test(`C12: ${stop} plates compute the same styles in dark and light chrome`, async ({ page }) => {
    await seed(page, harbour());
    const snap = async (theme: string) => {
      await page.goto(`/?step=${stop}&theme=${theme}`);
      await expect(page.locator("[data-v-root]").first()).toBeVisible();
      await expect(page.getByText("Loading fonts…")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
      return page.evaluate(() =>
        [...document.querySelectorAll("[data-v-root]")].map((root) =>
          [...root.querySelectorAll("*")].map((el) => {
            const s = getComputedStyle(el);
            return [s.color, s.backgroundColor, s.borderTopColor, s.borderLeftColor, s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.borderRadius, s.padding, s.boxShadow, s.outlineColor].join("|");
          }),
        ),
      );
    };
    const rootBorders = () =>
      page.evaluate(() => [...document.querySelectorAll("[data-v-root]")].map((r) => { const s = getComputedStyle(r); return [s.borderTopWidth, s.borderTopStyle, s.outlineStyle, s.boxShadow].join("|"); }));
    const dark = await snap("dark");
    const darkRoot = await rootBorders();
    const light = await snap("light");
    // The root's own border colour is the chrome line colour (globals.css *:not([data-v-root] *)); it must not paint.
    expect(darkRoot.every((r) => r.startsWith("0px|"))).toBe(true);
    expect(await rootBorders()).toEqual(darkRoot);
    expect(dark.length).toBeGreaterThan(0);
    expect(light).toEqual(dark);
  });
}

// ---- 4 + 13: the keyboard walk in light, with requests recorded ----
for (const theme of ["dark", "light"] as const) {
  test(`C4/C13 (${theme}): an empty project to an enabled Download all by keyboard alone, zero non-localhost requests`, async ({ page }) => {
    const foreign: string[] = [];
    page.on("request", (r) => {
      const host = new URL(r.url()).hostname;
      if (!["localhost", "127.0.0.1"].includes(host) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) foreign.push(r.url());
    });
    await page.goto(`/?theme=${theme}`);
    const step = async (name: string | RegExp) => {
      await expect(h1(page)).toHaveText(name);
      await expect(h1(page)).toBeFocused();
    };
    await expect(page.getByLabel("Project name", { exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    await page.keyboard.type("Pier Clinic");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Clinic booking");
    await page.keyboard.press("Enter");
    await step("Platform");
    await pick(page, 1);
    await step("Component library");
    await pick(page, 1);
    await step("Brand colour");
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.activeElement?.id === "brand-hex")); i++) await page.keyboard.press("Tab");
    await page.keyboard.type("#0F766E");
    await page.keyboard.press("Enter");
    await expect(h1(page)).toHaveText(/palette/i);
    await pick(page, 1);
    await step(/^Font pair/);
    await pick(page, 2);
    await step(/^Spacing/);
    await pick(page, 2);
    await step(/^Radius/);
    await pick(page, 3);
    await step(/^Density/);
    await pick(page, 2);
    await step("UX principles");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await page.keyboard.press("Enter");
    await step("Live preview");
    await page.keyboard.press("Enter");
    await step("Export");
    await expect(page.getByRole("button", { name: "Download all 4 files" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    expect(foreign).toEqual([]);
  });
}
