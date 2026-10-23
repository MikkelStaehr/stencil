// Slice 5b2: the preview caption says whether a candidate is in use; at ≤760px every lab is listed, the current one
// with its stops (also one-stop labs); the 390 header names the stop. Runs against the built export (seeded harbour).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

type Json = Record<string, unknown>;
const KEY = "design-wizard:v1:project";
const isMobile = () => test.info().project.name === "mobile-390";
const harbour = (): Json => JSON.parse(readFileSync(resolve("fixtures/harbour.project.json"), "utf8"));

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

test("the preview caption says in use for the project's value and not used yet for another candidate", async ({ page }) => {
  await seed(page, harbour());
  await page.goto("/?step=visual.paletteVariant");
  await expect(page.locator("main h1")).toHaveText("Palette");
  const caption = page.locator("#preview-label");
  await expect(page.locator('main [role="radiogroup"] [role="radio"]').nth(2)).toBeVisible();
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  await page.keyboard.press("3");
  await expect(caption).toHaveText(/Live preview · Deep, not used yet/i);
  await page.keyboard.press("2");
  await expect(caption).toHaveText(/Live preview · Tinted, in use/i);
});

test("≤760px: every lab is listed and the current one shows its stops, also a one-stop lab; the header names the stop", async ({ page }) => {
  test.skip(!isMobile(), "The rail covers this at 1280.");
  await seed(page, harbour());
  await page.goto("/?step=visual.fontPair");
  await expect(page.locator("header")).toContainText("Stop 6 of 12 · Font pair");
  const all = page.getByRole("navigation", { name: "All labs" });
  await expect(all.locator(":scope > ol > li")).toHaveCount(7);
  await expect(all.locator('li[aria-current="true"]')).toContainText("Type");
  await expect(all.locator('[aria-current="step"]')).toContainText("Font pair");
  for (const b of await all.getByRole("button").all()) expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  // A lab elsewhere on the path is one tap away: Laws opens its stop.
  await all.getByRole("button", { name: /^05 Laws/ }).click();
  await expect(page.locator("main h1")).toHaveText("UX principles");
  await expect(page.locator("header")).toContainText("Stop 10 of 12 · Laws");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
