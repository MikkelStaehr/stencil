// Step 2, UX principles (design/specs/step-2-principles.md), against the built export (no ?fixture=).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const KEY = "design-wizard:v1:project";
type Saved = { principles: { lawId: string; params: Record<string, number> }[] | null; resolved: { color: unknown; rules: { id: string; rule: string }[] } | null };

async function seed(page: Page, edit: (p: Record<string, unknown>) => void = () => {}, file = "fixtures/harbour.project.json") {
  const p = JSON.parse(readFileSync(resolve(file), "utf8"));
  edit(p);
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

const saved = (page: Page): Promise<Saved> =>
  page.evaluate((key) => JSON.parse(JSON.parse(localStorage.getItem(key)!).file), KEY);

const law = (page: Page, id: string) => page.locator(`li[data-law="${id}"]`);
const box = (page: Page, id: string) => page.locator(`#law-${id}`);

test("ticking a law stores its suggested params and the sentence equals the exported rule", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  await expect(box(page, "fitts")).toBeChecked();
  await box(page, "response-limits").check();
  await expect.poll(async () => (await saved(page)).principles?.find((p) => p.lawId === "response-limits")?.params).toEqual({ maxMs: 100 });
  const file = await saved(page);
  for (const id of ["fitts", "response-limits"]) {
    const sentence = await law(page, id).locator("[data-rule-id]").textContent();
    const rid = await law(page, id).locator("[data-rule-id]").getAttribute("data-rule-id");
    expect(file.resolved?.rules.find((r) => r.id === rid)?.rule).toBe(sentence);
  }
});

test("param errors stay next to the field, keep the input and leave the store unchanged; 48px commits", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  const field = page.getByLabel("Minimum target size");
  for (const bad of ["44,5", "80", "lots"]) {
    await field.fill(bad);
    await field.blur();
    await field.blur();
    await expect(field).toHaveValue(bad);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(law(page, "fitts").getByText(/The rule still says 44px\./)).toBeVisible();
    expect((await saved(page)).principles?.find((p) => p.lawId === "fitts")?.params).toEqual({ minPx: 44 });
  }
  await field.fill("48px");
  await field.blur();
  await expect(field).not.toHaveAttribute("aria-invalid", "true");
  await expect.poll(async () => (await saved(page)).principles?.find((p) => p.lawId === "fitts")?.params).toEqual({ minPx: 48 });
  await expect(law(page, "fitts").locator("[data-rule-id]")).toHaveText("Make every interactive element at least 48px by 48px.");
});

test("open vs decided: unticking the last law is open (null); Decide on no rules is [] and Undo returns to null", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  for (const id of ["fitts", "hick", "wcag-contrast"]) await box(page, id).uncheck();
  await expect.poll(async () => (await saved(page)).principles?.map((p) => p.lawId)).toEqual(["peak-end"]);
  await box(page, "peak-end").uncheck();
  await expect(page.getByText("NO RULES YET")).toBeVisible();
  await expect.poll(async () => (await saved(page)).principles).toBeNull();
  await page.getByRole("button", { name: "Decide on no rules" }).click();
  await expect(page.getByText("NO RULES · DECIDED")).toBeVisible();
  await expect.poll(async () => (await saved(page)).principles).toEqual([]);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await saved(page)).principles).toBeNull();
});

test("keyboard only through the Laws stop; rows are at least 44px and nothing overflows", async ({ page }) => {
  await seed(page, (p) => void (p.principles = null));
  // Laws come after Density on the path (Space & shape is the lab before Laws).
  await page.goto("/?step=visual.density");
  await page.locator("main h1").focus();
  await page.keyboard.press("j");
  await expect(page.locator("main h1")).toBeFocused();
  await expect(page.locator("main h1")).toHaveText("UX principles");
  await page.keyboard.press("Tab");
  await expect(box(page, "fitts")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(box(page, "fitts")).toBeChecked();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Control+a");
  await page.keyboard.type("48");
  await page.keyboard.press("Enter");
  await expect(box(page, "fitts")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(box(page, "wcag-contrast")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(box(page, "wcag-contrast")).toBeChecked();

  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main button, main input, main label")]
      .filter((el) => el.offsetParent !== null && !el.closest("[data-v-root]") && !el.matches("[data-law] label[for]"))
      .map((el) => ({ el: el.id || el.textContent?.trim().slice(0, 30), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h < 44),
  );
  expect(small).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.keyboard.press("Enter");
  await expect(page.locator("main h1")).not.toHaveText("UX principles");
  await page.keyboard.press("k");
  await expect(page.locator("main h1")).toHaveText("UX principles");
  // This seed (principles null beside a stored snapshot) is rejected by the parser, so the visual decisions are open
  // and the last decided stop before Laws is the component library (never open).
  await page.keyboard.press("e");
  await expect(page.locator("main h1")).toHaveText("Component library");
  expect((await saved(page)).principles?.map((p) => p.lawId)).toEqual(["fitts", "wcag-contrast"]);
});

test("the kept snapshot survives a param change", async ({ page }) => {
  // Stored colours that differ on purpose (task 3f), so there is a snapshot to keep.
  await seed(page, undefined, "tests/fixtures/harbour-stale.project.json");
  await page.goto("/?step=profile.identity");
  await page.getByRole("button", { name: "Keep stored values" }).click();
  const before = JSON.stringify((await saved(page)).resolved?.color);
  await page.goto("/?step=principles");
  await page.getByLabel("Minimum target size").fill("48");
  await page.getByLabel("Minimum target size").blur();
  await expect.poll(async () => (await saved(page)).principles?.find((p) => p.lawId === "fitts")?.params).toEqual({ minPx: 48 });
  expect(JSON.stringify((await saved(page)).resolved?.color)).toBe(before);
});
