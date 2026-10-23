// Step 1, project profile (design/specs/step-1-profile.md), against the built export (no ?fixture=).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const isMobile = () => test.info().project.name === "mobile-390";
const KEY = "design-wizard:v1:project";

/** Seeds Harbour into the autosave once per tab, so a reload reads what the app saved. */
async function seedHarbour(page: Page, file = "fixtures/harbour.project.json") {
  const p = JSON.parse(readFileSync(resolve(file), "utf8"));
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

/** The saved file, or null when nothing has been saved yet. */
async function saved(page: Page): Promise<{ profile: { name: string | null }; resolved: unknown } | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(JSON.parse(raw).file);
  }, KEY);
}

const h1 = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

test("name validation: the error sits next to the field, the input is kept and the store is unchanged", async ({ page }) => {
  await page.goto("/");
  await expect(h1(page, "Name and product type")).toBeVisible();
  const name = page.getByLabel("Project name", { exact: true });
  await expect(name).toBeFocused();

  // Tabbing through an untouched empty field shows nothing.
  await page.keyboard.press("Tab");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");

  const long = "H".repeat(81);
  await name.fill(long);
  await name.press("Tab");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/This name is 81 characters; the limit is 80\. Shorten it by 1\./);
  await expect(name).toHaveValue(long);
  await expect(page.getByText("81 / 80 · 1 over")).toBeVisible();
  expect((await saved(page))?.profile.name ?? null).toBeNull();

  // Fixing the value clears the error on input, before blur.
  await name.fill("H".repeat(80));
  await expect(name).not.toHaveAttribute("aria-invalid", "true");

  await name.fill("   ");
  await name.press("Tab");
  await expect(name).toHaveAccessibleDescription(/Enter a project name, 1 to 80 characters\. Until you do, the name stays open\./);
  await expect(name).toHaveValue("   ");
  expect((await saved(page))?.profile.name ?? null).toBeNull();

  // A line break never reaches the store: the text input drops it, and the validator rejects any that remain.
  await name.fill("Har\nbour");
  await name.press("Tab");
  expect(await name.inputValue()).not.toContain("\n");
  const stored = (await saved(page))?.profile.name ?? null;
  expect(stored === null || !/[\r\n]/.test(stored)).toBe(true);
});

test("the Profile lab by keyboard alone, and J/K/E across stops", async ({ page }) => {
  await page.goto("/");
  await expect(h1(page, "Name and product type")).toBeVisible();
  await expect(page.getByLabel("Project name", { exact: true })).toBeFocused();
  await page.keyboard.type("Harbour");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Clinic booking jk123");
  await expect(page.getByLabel("Product type", { exact: true })).toHaveValue("Clinic booking jk123");
  await page.keyboard.press("Enter");

  await expect(h1(page, "Platform")).toBeVisible();
  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  await expect(h1(page, "Component library")).toBeVisible();
  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  // The library moves on to the next stop on the path: the brand colour, first stop of the Color lab.
  await expect(h1(page, "Brand colour")).toBeVisible();

  await page.keyboard.press("e");
  await expect(h1(page, "Component library")).toBeVisible();
  await page.keyboard.press("k");
  await page.keyboard.press("k");
  await expect(h1(page, "Name and product type")).toBeVisible();
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await expect(h1(page, "Brand colour")).toBeVisible();

  const file = await saved(page);
  expect(file?.profile).toMatchObject({ name: "Harbour", productType: "Clinic booking jk123", platform: "mobile", componentLibrary: "none" });
});

test("platform: 3 live plates side by side at 1280, stacked at 390, no overflow", async ({ page }) => {
  await seedHarbour(page);
  await page.goto("/?step=profile.platform");
  await expect(h1(page, "Platform")).toBeVisible();
  const radios = page.getByRole("radiogroup", { name: "Platform variants" }).getByRole("radio");
  await expect(radios).toHaveCount(3);
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);
  const boxes = await radios.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
  if (isMobile()) {
    expect(boxes[1].top).toBeGreaterThan(boxes[0].bottom);
    expect(boxes[2].top).toBeGreaterThan(boxes[1].bottom);
  } else {
    expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThan(1);
    expect(Math.abs(boxes[1].top - boxes[2].top)).toBeLessThan(1);
    expect(boxes[1].left).toBeGreaterThan(boxes[0].right);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("harbour snapshot notice: Keep stored values dismisses it and leaves resolved unchanged", async ({ page }) => {
  // Stored colours that differ on purpose (task 3f).
  await seedHarbour(page, "tests/fixtures/harbour-stale.project.json");
  await page.goto("/?step=profile.identity");
  const title = page.getByRole("heading", { name: "Stored values differ from the current algorithm: keep or recompute" });
  await expect(title).toBeVisible();
  await expect(page.getByRole("button", { name: "Recompute now" })).toBeVisible();
  const before = JSON.stringify((await saved(page))?.resolved);
  await page.getByRole("button", { name: "Keep stored values" }).click();
  await expect(title).toBeHidden();
  await expect(page.getByText("Kept the stored values. This notice returns when the file is opened again.")).toBeVisible();
  expect(JSON.stringify((await saved(page))?.resolved)).toBe(before);
});

test("AC5: a platform plate box is the same before and after the fonts load", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/fonts/**", async (route) => {
    await gate;
    await route.continue();
  });
  await seedHarbour(page);
  await page.goto("/?step=profile.platform", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Loading fonts…").first()).toBeVisible();
  const radios = page.getByRole("radiogroup", { name: "Platform variants" }).getByRole("radio");
  const boxes = () => radios.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
  // Let the grid's first size sync settle (it runs on a ResizeObserver) before taking the "loading" boxes,
  // so the comparison isolates the font load itself.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const loading = await boxes();
  release();
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await boxes()).toEqual(loading);
});

test("step 2 placeholder: a visible button reopens the profile (touch has no rail and no E key)", async ({ page }) => {
  await seedHarbour(page);
  await page.goto("/?step=principles");
  const back = page.getByRole("button", { name: /Reopen the profile/ });
  await expect(back).toBeVisible();
  const box = await back.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await back.click();
  await expect(h1(page, "Component library")).toBeVisible();
});

test("filling name and type never moves the user away from the form mid-step", async ({ page }) => {
  await page.goto("/");
  await expect(h1(page, "Name and product type")).toBeVisible();
  await page.getByLabel("Project name", { exact: true }).fill("Harbour");
  await page.keyboard.press("Tab");
  await page.getByLabel("Product type", { exact: true }).fill("Clinic booking");
  await page.keyboard.press("Tab");
  // Both are now saved, so platform is the first open stop; the user must still be on the form, in notes.
  await expect(h1(page, "Name and product type")).toBeVisible();
  await expect(page.getByLabel(/Notes/)).toBeFocused();
});
