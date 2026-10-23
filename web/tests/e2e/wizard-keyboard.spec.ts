// Task 3e (AC6): the whole wizard by keyboard alone, from an empty project to the four downloads, at 1280
// and 390. Only key presses and typing drive the app; the test reads the page but never clicks.
import { expect, test, type Page } from "@playwright/test";

const h1 = (page: Page) => page.locator("main h1");

async function step(page: Page, name: string | RegExp) {
  await expect(h1(page)).toHaveText(name);
  await expect(h1(page)).toBeFocused();
}

/** Picks variant `n` with its digit and chooses it with Enter, once the plates' fonts are in. */
async function pick(page: Page, n: number) {
  // The variants first: before they mount there is no "Loading fonts…" to wait for.
  await expect(page.locator('main [role="radiogroup"] [role="radio"]').nth(n - 1)).toBeVisible();
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  await page.keyboard.press(String(n));
  await page.keyboard.press("Enter");
}

/** Tabs until the element with `id` has focus (keyboard only; fails after `max` presses). */
async function tabToId(page: Page, id: string, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((x) => document.activeElement?.id === x, id)) return;
  }
  throw new Error(`#${id} never got focus`);
}

test("an empty project to the four exported files by keyboard alone", async ({ page }) => {
  await page.goto("/");

  // Profile: the name field has focus on arrival.
  await expect(page.getByLabel("Project name", { exact: true })).toBeFocused();
  await page.keyboard.type("Pier Clinic");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Clinic booking");
  await page.keyboard.press("Enter");
  await step(page, "Platform");
  await pick(page, 1);
  await step(page, "Component library");
  await pick(page, 1);

  // Color: the brand colour is typed on its own stop; Enter in the field records it and moves on to the palette.
  await step(page, "Brand colour");
  await tabToId(page, "brand-hex");
  await page.keyboard.type("#0F766E");
  await page.keyboard.press("Enter");
  await expect(h1(page)).toHaveText(/palette/i);
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);
  await pick(page, 1);

  // Type, Space & shape: every visual decision.
  await step(page, /^Font pair/);
  await pick(page, 2);
  await step(page, /^Spacing/);
  await pick(page, 2);
  await step(page, /^Radius/);
  await pick(page, 3);
  await step(page, /^Density/);
  await pick(page, 2);

  // Laws: one law, ticked with Space; Enter continues.
  await step(page, "UX principles");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(page.locator("main input[type=checkbox]").first()).toBeChecked();
  await page.keyboard.press("Enter");

  // Preview → Export: Continue to export is the primary (Enter).
  await step(page, "Live preview");
  await page.keyboard.press("Enter");
  await step(page, "Export");

  // Enter on the page downloads all four files, project file first.
  const names: string[] = [];
  const texts: Record<string, string> = {};
  page.on("download", async (d) => {
    names.push(d.suggestedFilename());
    const path = await d.path();
    texts[d.suggestedFilename()] = path ? (await import("node:fs")).readFileSync(path, "utf8") : "";
  });
  await page.keyboard.press("Enter");
  await expect.poll(() => names.length).toBe(4);
  expect(names).toEqual(["pier-clinic.dwproj.json", "DESIGN.md", "tokens.json", "ux-rules.yaml"]);
  await expect.poll(() => Object.keys(texts).length).toBe(4);

  // Every decision is made, none filled in for the user: the file holds exactly what was chosen.
  const file = JSON.parse(texts["pier-clinic.dwproj.json"]);
  expect(file.profile).toMatchObject({ name: "Pier Clinic", productType: "Clinic booking" });
  expect(file.principles).toHaveLength(1);
  expect(file.visual.brandHex).toBe("#0F766E");
  expect(file.resolved).not.toBeNull();
  expect(texts["DESIGN.md"]).toContain("# Design system – Pier Clinic");
  await expect(page.getByText("PROJECT FILE UP TO DATE")).toBeVisible();
});
