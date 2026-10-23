// Slice 3c tester checks (commit 677111e): the preview candidate on every stop, neutrals, AC2/AC4/AC5 for
// every pair and palette, step 4's lead, legend and landing. Runs against the built export (localStorage seeding).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const KEY = "design-wizard:v1:project";
const isMobile = () => test.info().project.name === "mobile-390";
type Json = Record<string, unknown> & { profile: Record<string, unknown>; visual: Record<string, unknown> };
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

const column = (page: Page) => page.locator('section[aria-labelledby="preview-label"]');
const label = (page: Page) => page.locator("#preview-label");
const saved = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const chrome = (page: Page) =>
  page.evaluate(() => {
    const pick = (el: Element) => {
      const s = getComputedStyle(el);
      return [s.fontFamily, s.color, s.backgroundColor];
    };
    return { h1: pick(document.querySelector("main h1")!), body: pick(document.body) };
  });

/** Clicks the radio and returns ms until the preview plate's accessible line changes. */
async function msToPreview(page: Page, radio: ReturnType<Page["locator"]>) {
  return radio.evaluate((el) => {
    const img = document.querySelector('section[aria-labelledby="preview-label"] [role="img"]') as HTMLElement;
    const before = img.getAttribute("aria-label");
    const t0 = performance.now();
    (el as HTMLElement).click();
    return new Promise<number>((done, fail) => {
      const poll = () => {
        if (img.isConnected && img.getAttribute("aria-label") !== before) return done(performance.now() - t0);
        if (performance.now() - t0 > 1000) return fail(new Error("preview did not change within 1 s"));
        requestAnimationFrame(poll);
      };
      poll();
    });
  });
}

const VISUAL_STOPS: [string, string][] = [
  ["visual.fontPair", "Font pair variants"],
  ["visual.spacingBase", "Spacing variants"],
  ["visual.radius", "Radius variants"],
  ["visual.paletteVariant", "Palette variants"],
  ["visual.density", "Density variants"],
];

for (const [stop, group] of VISUAL_STOPS) {
  test(`${stop}: selecting an unchosen variant updates the preview within 100 ms and never touches the saved bytes`, async ({ page }) => {
    await seed(page, harbour());
    await page.goto(`/?step=${stop}`);
    await expect(label(page)).toHaveText(/Live preview · Your choices/i);
    const bytes = await saved(page);
    expect(bytes).not.toBeNull();
    const radio = page.getByRole("radiogroup", { name: group }).locator('[role="radio"][aria-checked="false"]').first();
    const name = (await radio.getAttribute("aria-label")) ?? (await radio.innerText());
    expect(await msToPreview(page, radio)).toBeLessThan(100);
    await expect(label(page)).not.toHaveText(/Your choices/i);
    expect(name.length).toBeGreaterThan(0);
    expect(await saved(page)).toBe(bytes);
    // Leaving without choosing drops the candidate and still writes nothing.
    await page.keyboard.press("k");
    await expect(label(page)).toHaveText(/Live preview · Your choices/i);
    expect(await saved(page)).toBe(bytes);
    await page.reload();
    expect(await saved(page)).toBe(bytes);
  });
}

// Platform changes no token (design/specs/step-1-profile.md: "changes no tokens"), so the preview must NOT
// change when a platform variant is selected; the platform frames on the stop itself show the difference.
test("profile.platform: selecting another platform variant leaves the preview as it is (platform changes no tokens)", async ({ page }) => {
  await seed(page, harbour());
  await page.goto("/?step=profile.platform");
  const before = await label(page).textContent();
  const caption = await column(page).locator("figcaption").textContent();
  await page.getByRole("radiogroup", { name: "Platform variants" }).locator('[role="radio"][aria-checked="false"]').first().click();
  await expect(label(page)).toHaveText(before ?? "");
  await expect(column(page).locator("figcaption")).toHaveText(caption ?? "");
});

test("an empty project previews in neutrals, every open decision pending; the first visual decision says Your choices", async ({ page }) => {
  await page.goto("/");
  await expect(label(page)).toHaveText(/Live preview · Neutrals/i);
  const caption = column(page).locator("figcaption");
  for (const part of ["font pair pending", "spacing pending", "radius pending", "palette pending", "density pending"]) await expect(caption).toContainText(part);
  await page.goto("/?step=visual.fontPair");
  await page.getByRole("radiogroup", { name: "Font pair variants" }).getByRole("radio").first().click();
  await expect(label(page)).not.toHaveText(/Neutrals/i);
  await page.getByRole("button", { name: /^Choose/ }).click();
  await expect(label(page)).toHaveText(/Live preview · Your choices/i);
  await expect(caption).toContainText("radius pending");
});

test("AC4: every palette and every font pair leaves the chrome h1 and body untouched", async ({ page }) => {
  await seed(page, harbour());
  for (const [stop, group] of [["visual.paletteVariant", "Palette variants"], ["visual.fontPair", "Font pair variants"]]) {
    await page.goto(`/?step=${stop}`);
    const radios = page.getByRole("radiogroup", { name: group }).getByRole("radio");
    await expect(radios.first()).toBeVisible();
    const before = await chrome(page);
    const n = await radios.count();
    expect(n).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < n; i++) {
      await radios.nth(i).click();
      await expect(page.getByText("Loading fonts…")).toHaveCount(0);
      expect(await chrome(page)).toEqual(before);
    }
  }
});

test("AC2: every font pair through the preview and step 4 makes 0 requests outside localhost", async ({ page }) => {
  const all: string[] = [];
  page.on("request", (r) => all.push(r.url()));
  await seed(page, harbour());
  await page.goto("/?step=visual.fontPair");
  const radios = page.getByRole("radiogroup", { name: "Font pair variants" }).getByRole("radio");
  const n = await radios.count();
  for (let i = 0; i < n; i++) {
    await radios.nth(i).click();
    await expect(column(page).getByText("Loading fonts…")).toHaveCount(0);
  }
  await page.goto("/?step=preview");
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  expect(all.some((u) => u.includes("/fonts/"))).toBe(true);
  expect(all.filter((u) => !u.startsWith("http://localhost:") && !u.startsWith("data:") && !u.startsWith("blob:"))).toEqual([]);
});

test("AC5: an 80-character product name ends in an ellipsis and the plate box does not grow", async ({ page }) => {
  const long = "Harbour Clinic Booking and Patient Records for the Nørrebro and Vesterbro Sites!";
  expect(long.length).toBe(80);
  const p = harbour();
  p.profile.name = long;
  await seed(page, p);
  await page.goto("/?step=preview");
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  await page.locator('[data-preview-plate] [data-v-part="header"]').first().screenshot({ path: test.info().outputPath("long-name-header.png") });
  const name = page.locator('[data-preview-plate] [data-v-part="product-name"]').first();
  const m = await name.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, overflow: s.overflowX, textOverflow: s.textOverflow, sw: el.scrollWidth, cw: el.clientWidth };
  });
  expect(m.sw).toBeGreaterThan(m.cw); // really truncated
  expect(m.textOverflow).toBe("ellipsis");
  // text-overflow only renders on a block container; a flex container clips silently.
  expect(m.display).not.toMatch(/flex|grid/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("step 4 lead: all decided vs open decisions; the Harbour stand-in only while the name is open", async ({ page }) => {
  await seed(page, harbour());
  await page.goto("/?step=preview");
  const lead = page.getByRole("main").locator("h1 + p");
  await expect(lead).toContainText("Select a row below to change it.");
  await expect(lead).not.toContainText("Harbour stands in");
  await expect(lead).not.toContainText("Open decisions");
});

test("step 4 lead with an open name and an open radius mentions both", async ({ page }) => {
  const p = harbour();
  p.profile.name = null;
  p.visual.radius = null;
  await seed(page, p);
  await page.goto("/?step=preview");
  const lead = page.getByRole("main").locator("h1 + p");
  await expect(lead).toContainText("Open decisions show in neutral placeholders");
  await expect(lead).toContainText("Harbour stands in until you name the project.");
  await expect(page.getByRole("main").getByRole("button", { name: /^Change Radius/ })).toContainText("pending");
});

test("step 4: the legend lists only J/K and E, and main's only primary is Continue to export (3d)", async ({ page }) => {
  await seed(page, harbour());
  await page.goto("/?step=preview");
  await expect(page.getByRole("heading", { level: 1, name: "Live preview" })).toBeVisible();
  // The ≤760px lab overview (5b2) is navigation, not the stop's own controls.
  const own_ = page.getByRole("main").locator('button:not(nav[aria-label="All labs"] button)');
  const buttons = await own_.allInnerTexts();
  const names = await own_.evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ""));
  // The 3a snapshot notice (Keep stored values / Recompute now) is not part of step 4.
  const own = names.filter((n) => !/^(Keep stored values|Recompute now|Continue to exportEnter)$/.test(n));
  expect(names.filter((n) => n === "Continue to exportEnter")).toHaveLength(1);
  expect(buttons.length - own.length).toBeLessThanOrEqual(3);
  expect(own.length).toBe(6);
  for (const n of own) expect(n).toMatch(/^Change /);
  test.skip(isMobile(), "the legend is hidden at ≤760px");
  const keys = await page.locator('dl[aria-label="Keyboard shortcuts"]:visible kbd').allInnerTexts();
  expect(keys).toEqual(["J", "K", "E"]);
});

test("every decision made: the wizard opens on step 4", async ({ page }) => {
  await seed(page, harbour());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Live preview" })).toBeVisible();
});

test("390: a Change row shows a visible focus ring under keyboard focus", async ({ page }) => {
  test.skip(!isMobile(), "390 only");
  await seed(page, harbour());
  await page.goto("/?step=preview");
  await expect(page.getByRole("heading", { level: 1, name: "Live preview" })).toBeFocused();
  const row = page.getByRole("main").getByRole("button", { name: /^Change Product name/ });
  for (let i = 0; i < 30 && !(await row.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(row).toBeFocused();
  const ring = await row.evaluate((e) => {
    const s = getComputedStyle(e);
    return { fv: e.matches(":focus-visible"), outline: s.outlineStyle, ow: s.outlineWidth, shadow: s.boxShadow };
  });
  expect(ring.fv).toBe(true);
  expect(ring.outline !== "none" && ring.ow !== "0px" || ring.shadow !== "none").toBe(true);
});
