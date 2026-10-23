// Slice 3c: the live preview column (every step) and step 4, against the built export (no ?fixture=).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const isMobile = () => test.info().project.name === "mobile-390";
const KEY = "design-wizard:v1:project";

/** Seeds Harbour (radius 8, Tinted, compact) into the autosave once per tab. */
async function seedHarbour(page: Page) {
  const p = JSON.parse(readFileSync(resolve("fixtures/harbour.project.json"), "utf8"));
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

const h1 = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });
const column = (page: Page) => page.locator('section[aria-labelledby="preview-label"]');
const previewRoot = (page: Page) => column(page).locator("[data-v-root]");
const previewVar = (page: Page, name: string) => previewRoot(page).evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
const frames = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

test("selecting a variant updates the preview within 100 ms, before Choose; choosing keeps it; leaving clears the candidate", async ({ page }) => {
  await seedHarbour(page);
  await page.goto("/?step=visual.radius");
  await expect(h1(page, "Radius")).toBeVisible();
  await expect(page.locator("#preview-label")).toHaveText(/Live preview · Your choices/i);
  expect(await previewVar(page, "--v-radius")).toBe("8px");

  const plate = page.getByRole("radio", { name: /14 px/ });
  const elapsed = await plate.evaluate((el) => {
    const root = document.querySelector('section[aria-labelledby="preview-label"] [data-v-root]') as HTMLElement;
    const t0 = performance.now();
    (el as HTMLElement).click();
    return new Promise<number>((done) => {
      const poll = () => (getComputedStyle(root).getPropertyValue("--v-radius").trim() === "14px" ? done(performance.now() - t0) : requestAnimationFrame(poll));
      poll();
    });
  });
  expect(elapsed).toBeLessThan(100);
  await expect(page.locator("#preview-label")).toHaveText(/Live preview · 14 px/i);
  await expect(column(page).locator("figcaption")).toContainText("radius 14 px");

  // Choosing moves on to the next stop (Density); the side panel's preview keeps the chosen radius.
  await page.getByRole("button", { name: /Choose 14 px/ }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(JSON.parse(localStorage.getItem(key)!).file).visual.radius, KEY)).toBe(14);
  expect(await previewVar(page, "--v-radius")).toBe("14px");
  await expect(page.locator("#preview-label")).toHaveText(/Live preview · Your choices/i);
});

test("leaving the step without choosing clears the candidate", async ({ page }) => {
  await seedHarbour(page);
  await page.goto("/?step=visual.radius");
  await page.getByRole("radio", { name: /0 px/ }).click();
  await expect(page.locator("#preview-label")).toHaveText(/Live preview · 0 px/i);
  await page.keyboard.press("j");
  await expect(page.locator("#preview-label")).toHaveText(/Live preview · Your choices/i);
  expect(await previewVar(page, "--v-radius")).toBe("8px");
});

test("AC4: previewing a dark palette leaves the chrome h1 and body font and colour unchanged", async ({ page }) => {
  await seedHarbour(page);
  await page.goto("/?step=visual.paletteVariant");
  await expect(page.getByRole("radio", { name: /Deep/ })).toBeVisible();
  const chrome = () =>
    page.evaluate(() => {
      const pick = (el: Element) => { const s = getComputedStyle(el); return [s.fontFamily, s.color, s.backgroundColor]; };
      return { h1: pick(document.querySelector("main h1")!), body: pick(document.body) };
    });
  const before = await chrome();
  await page.getByRole("radio", { name: /Deep/ }).click();
  await expect(page.locator("#preview-label")).toHaveText(/Live preview · Deep/i);
  expect(await chrome()).toEqual(before);
});

test("AC5: the preview plate box is the same before and after its fonts load", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/fonts/**", async (route) => {
    await gate;
    await route.continue();
  });
  await seedHarbour(page);
  await page.goto("/?step=profile.platform", { waitUntil: "domcontentloaded" });
  await expect(column(page).getByText("Loading fonts…")).toBeVisible();
  const box = () => column(page).getByRole("img").evaluate((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  await frames(page);
  const loading = await box();
  release();
  await expect(column(page).getByText("Loading fonts…")).toHaveCount(0);
  await frames(page);
  expect(await box()).toEqual(loading);
});

test("AC2: the preview makes no request outside localhost", async ({ page }) => {
  const all: string[] = [];
  page.on("request", (r) => all.push(r.url()));
  await seedHarbour(page);
  await page.goto("/?step=visual.fontPair");
  await page.getByRole("radiogroup", { name: "Font pair variants" }).getByRole("radio").nth(1).click();
  await page.goto("/?step=preview");
  await expect(h1(page, "Live preview")).toBeVisible();
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  expect(all.filter((u) => !u.startsWith("http://localhost:") && !u.startsWith("data:") && !u.startsWith("blob:"))).toEqual([]);
});

test("preview: J from Laws and ?step=preview land there, and each decision row reopens its stop", async ({ page }) => {
  await seedHarbour(page);
  // Laws is the stop before the sample screen on the path.
  await page.goto("/?step=principles");
  await expect(h1(page, "UX principles")).toBeVisible();
  await page.locator("main h1").focus();
  await page.keyboard.press("j");
  await expect(h1(page, "Live preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to export Enter" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Sample screen rendered with Sora \+ Inter/ })).toBeVisible();

  const rows: [RegExp, string][] = [
    [/^Change Product name/, "Name and product type"],
    [/^Change Font pair/, "Font pair"],
    [/^Change Spacing/, "Spacing"],
    [/^Change Radius/, "Radius"],
    [/^Change Palette/, "Palette"],
    [/^Change Density/, "Density"],
  ];
  for (const [row, title] of rows) {
    await page.goto("/?step=preview");
    await expect(h1(page, "Live preview")).toBeVisible();
    const button = page.getByRole("main").getByRole("button", { name: row });
    expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await button.click();
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(`^${title}`) })).toBeVisible();
  }
});

test("at 390 the preview sits below main and nothing overflows", async ({ page }) => {
  test.skip(!isMobile(), "390 only");
  await seedHarbour(page);
  for (const step of ["visual.radius", "preview", "profile.identity"]) {
    await page.goto(`/?step=${step}`);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    if (step !== "preview") {
      const main = await page.getByRole("main").boundingBox();
      const col = await column(page).boundingBox();
      expect(col!.y).toBeGreaterThanOrEqual(main!.y + main!.height - 1);
    }
  }
});
