import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Runs against the built export (no ?fixture=), so each test starts from a fresh, empty project.
const isMobile = () => test.info().project.name === "mobile-390";

async function openSpacing(page: Page) {
  // J reaches the next stop on the keyboard; on 390 the rail is hidden, so use the lab's stop list there. Font pair is
  // the Type lab's only stop (no list), so 390 starts from Radius, in the same lab as Spacing.
  const [from, title] = isMobile() ? ["visual.radius", "Radius"] : ["visual.fontPair", "Font pair"];
  await page.goto(`/?step=${from}`);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.locator("main [data-v-root]").first()).toBeVisible();
  if (isMobile()) await page.getByRole("navigation", { name: "All labs" }).getByRole("button", { name: /Spacing/ }).click();
  else await page.keyboard.press("j");
  await expect(page.getByRole("heading", { level: 1, name: "Spacing" })).toBeVisible();
}

async function chromeH1Style(page: Page) {
  return page.locator("main h1").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontFamily: cs.fontFamily, color: cs.color, bodyBg: getComputedStyle(document.body).backgroundColor };
  });
}

test("spacing shows 3 plates side by side at 1280 and stacked at 390, with no horizontal overflow", async ({ page }) => {
  await openSpacing(page);
  const radios = page.getByRole("radiogroup", { name: "Spacing variants" }).getByRole("radio");
  await expect(radios).toHaveCount(3);
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);
  const boxes = await radios.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
  if (isMobile()) {
    expect(boxes[1].top).toBeGreaterThan(boxes[0].bottom);
    expect(boxes[2].top).toBeGreaterThan(boxes[1].bottom);
    await expect(page.getByLabel("Keyboard shortcuts")).toBeHidden();
  } else {
    expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThan(1);
    expect(Math.abs(boxes[1].top - boxes[2].top)).toBeLessThan(1);
    expect(boxes[1].left).toBeGreaterThan(boxes[0].right);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("leak: choosing another palette or font pair leaves the chrome h1 font and colour unchanged", async ({ page }) => {
  await page.goto("/?step=visual.fontPair");
  await expect(page.getByRole("heading", { level: 1, name: "Font pair" })).toBeVisible();
  await expect(page.locator("main [data-v-root]").first()).toBeVisible();
  const before = await chromeH1Style(page);
  expect(before.fontFamily).not.toContain("dwv-");

  // Font pair: select and choose the second pair.
  await page.getByRole("radio").nth(1).click();
  await page.getByRole("button", { name: /^Choose / }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Spacing" })).toBeVisible();
  expect(await chromeH1Style(page)).toEqual(before);

  // Palette: enter a brand colour on its own stop (Enter moves on to the palette), then choose Deep (the most different palette).
  await page.goto("/?step=visual.brandHex");
  await page.getByLabel("Brand colour").fill("#0F766E");
  await page.getByLabel("Brand colour").press("Enter");
  const palettes = page.getByRole("radiogroup", { name: "Palette variants" }).getByRole("radio");
  await expect(palettes).toHaveCount(3);
  await expect(page.locator("main [data-v-root]").first()).toBeVisible();
  await palettes.nth(2).click();
  await page.getByRole("button", { name: /^Choose / }).click();
  expect(await chromeH1Style(page)).toEqual(before);
});

test("keyboard: 1/2/3 then Enter records a decision; J and K move between stops", async ({ page }) => {
  test.skip(isMobile(), "The keyboard flow is a desktop feature; the rail that shows it is hidden at 390.");
  await page.goto("/?step=visual.fontPair");
  await expect(page.getByRole("heading", { level: 1, name: "Font pair" })).toBeVisible();
  const radios = page.getByRole("radiogroup", { name: "Font pair variants" }).getByRole("radio");
  // The radios exist in the static HTML; a loaded plate root only appears once the client has hydrated.
  // 3 pairs at a time (the catalogue has more, behind "More pairs").
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);

  await page.keyboard.press("2");
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("1");
  await expect(radios.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Enter");

  // Recorded: the stop moved on to the next stop, and the rail shows the value (only the current lab is expanded,
  // so the Type lab reads 1 of 1 decided here and shows Font pair's value once it is the current lab again).
  await expect(page.getByRole("heading", { level: 1, name: "Spacing" })).toBeVisible();
  const rail = page.getByRole("navigation", { name: "Labs" });
  await expect(rail.locator("li", { has: page.getByRole("button", { name: /^Type \d+ of \d+ decided$/ }) })).toContainText("1 of 1 decided");
  await expect(rail.getByRole("button", { name: /Spacing\s*open/ })).toHaveAttribute("aria-current", "step");

  await page.keyboard.press("j");
  await expect(page.getByRole("heading", { level: 1, name: "Radius" })).toBeVisible();
  await page.keyboard.press("k");
  await page.keyboard.press("k");
  await expect(page.getByRole("heading", { level: 1, name: "Font pair" })).toBeVisible();
  await expect(rail.getByRole("button", { name: /Font pair\s*Sora \+ Inter/ })).toHaveAttribute("aria-current", "step");
  await page.keyboard.press("j");
  await page.keyboard.press("e");
  await expect(page.getByRole("heading", { level: 1, name: "Font pair" })).toBeVisible();
});

test("font 404: a failed variant font shows 'Font failed' and cannot be chosen", async ({ page }) => {
  await page.route("**/fonts/sora/**", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/?step=visual.fontPair");
  await expect(page.getByRole("heading", { level: 1, name: "Font pair" })).toBeVisible();
  await expect(page.getByText("Font failed: Sora + Inter")).toBeVisible();
  const failed = page.getByRole("radio", { name: /Sora \+ Inter/ });
  await expect(failed).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("1");
  await expect(failed).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: /^Choose / })).toBeDisabled();
});

test("harbour: a saved radius of 8 (not a fixed candidate) is on screen as chosen, and can be chosen again", async ({ page }) => {
  test.skip(isMobile(), "Checked at 1280.");
  // The built export ignores ?fixture= (development only), so the harbour file is seeded as the browser's autosave.
  const file = readFileSync(resolve("fixtures/harbour.project.json"), "utf8");
  const envelope = JSON.stringify({ savedAt: "2026-10-01T09:00:00.000Z", downloadedAt: null, file });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), ["design-wizard:v1:project", envelope]);

  await page.goto("/?step=visual.radius");
  await expect(page.getByRole("heading", { level: 1, name: "Radius" })).toBeVisible();
  const radios = page.getByRole("radiogroup", { name: "Radius variants" }).getByRole("radio");
  await expect(radios).toHaveCount(3);
  const eight = page.getByRole("radio", { name: /8 px/ });
  await expect(eight).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Corner radius 8px, from your file.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Choose 8 px/ })).toBeEnabled();
});
