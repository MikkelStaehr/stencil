// Slice 3a tester checks for step 1 (design/specs/step-1-profile.md §7), against the built export.
// Seeds the autosave the same way as profile-step.spec.ts (the export ignores ?fixture=).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const isMobile = () => test.info().project.name === "mobile-390";
const KEY = "design-wizard:v1:project";
const NOTICE = "Stored values differ from the current algorithm: keep or recompute";
const STALE = "tests/fixtures/harbour-stale.project.json"; // stored colours differ on purpose (task 3f)

const h1 = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

type Saved = {
  profile: { name: string | null; productType: string | null; platform: string | null; notes: string; componentLibrary: string };
  resolved: { color: { light: Record<string, string> }; radius: number } | null;
};

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

async function saved(page: Page): Promise<Saved | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(JSON.parse(raw).file);
  }, KEY);
}
const resolvedBytes = async (page: Page) => JSON.stringify((await saved(page))?.resolved);

test("new project: decisions stay null until committed; componentLibrary starts at shadcn and is shown Chosen", async ({ page }) => {
  await page.goto("/");
  const name = page.getByLabel("Project name", { exact: true });
  await expect(name).toBeFocused();
  await name.fill("Harbour");
  await name.press("Tab");
  await expect.poll(async () => (await saved(page))?.profile.name).toBe("Harbour");
  expect((await saved(page))?.profile).toMatchObject({ productType: null, platform: null, componentLibrary: "shadcn" });
  expect((await saved(page))?.resolved).toBeNull();

  await page.goto("/?step=profile.library");
  const group = page.getByRole("radiogroup", { name: "Component library options" });
  await expect(group.getByRole("radio")).toHaveCount(2);
  await expect(group.getByRole("radio", { name: /^Option 1, shadcn/ })).toHaveAttribute("aria-checked", "true");
  await expect(group.locator("section").first().getByText("Chosen", { exact: true })).toBeVisible();
  // Before the palette is chosen there is no snapshot, so every value reads "set in the Color lab".
  await expect(group.getByText("set in the Color lab")).toHaveCount(10);
});

test("AC10: Harbour / Clinic booking / Mobile / None survive a reload in the fields, the selection and the rail", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Project name", { exact: true }).fill("Harbour");
  await page.getByLabel("Product type", { exact: true }).fill("Clinic booking");
  await page.getByRole("button", { name: /Continue to platform/ }).click();
  await expect(h1(page, "Platform")).toBeVisible();
  await page.getByRole("radio", { name: /Mobile/ }).click();
  await page.keyboard.press("Enter");
  await expect(h1(page, "Component library")).toBeVisible();
  await page.getByRole("radio", { name: /None/ }).click();
  await page.keyboard.press("Enter");
  await expect(h1(page, "Brand colour")).toBeVisible();

  await page.goto("/?step=profile.identity");
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Harbour");
  await expect(page.getByLabel("Product type", { exact: true })).toHaveValue("Clinic booking");
  const nav = isMobile() ? page.getByRole("navigation", { name: "All labs" }) : page.locator("aside");
  await expect(nav).toContainText("Harbour");
  await expect(nav).toContainText("Mobile");
  await expect(nav).toContainText("None");
  await page.goto("/?step=profile.platform");
  await expect(page.getByRole("radio", { name: /Mobile/ })).toHaveAttribute("aria-checked", "true");
  await page.goto("/?step=profile.library");
  await expect(page.getByRole("radio", { name: /None/ })).toHaveAttribute("aria-checked", "true");
});

test("name: 80 characters plus a trailing space is saved trimmed and the counter reads 80 / 80", async ({ page }) => {
  await page.goto("/");
  const name = page.getByLabel("Project name", { exact: true });
  await name.fill("H".repeat(80) + " ");
  await name.press("Tab");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("80 / 80", { exact: true })).toBeVisible();
  await expect.poll(async () => (await saved(page))?.profile.name).toBe("H".repeat(80));
});

test("name: Danish letters and emoji are saved as typed and shown on the sample", async ({ page }) => {
  await page.goto("/");
  const name = page.getByLabel("Project name", { exact: true });
  await name.fill("Nørrebro Fysioterapi");
  await expect(page.getByRole("img", { name: /Nørrebro Fysioterapi/ }).or(page.getByLabel(/Name check: the sample header reads Nørrebro Fysioterapi/))).toBeVisible();
  await name.press("Tab");
  await expect.poll(async () => (await saved(page))?.profile.name).toBe("Nørrebro Fysioterapi");
  await name.fill("Havn 🚢 Æblegård");
  await name.press("Tab");
  await expect.poll(async () => (await saved(page))?.profile.name).toBe("Havn 🚢 Æblegård");
});

test("name: an inserted line break never reaches the store", async ({ page }) => {
  await page.goto("/");
  const name = page.getByLabel("Project name", { exact: true });
  await name.focus();
  await page.keyboard.insertText("Har\nbour");
  await name.press("Tab");
  expect(await name.inputValue()).not.toMatch(/[\r\n]/);
  const stored = (await saved(page))?.profile.name ?? null;
  expect(stored === null || !/[\r\n]/.test(stored)).toBe(true);
});

test("product type: 61 characters shows the error next to the field, keeps the input, store unchanged; message is aria-live", async ({ page }) => {
  await page.goto("/");
  const type = page.getByLabel("Product type", { exact: true });
  const long = "T".repeat(61);
  await type.fill(long);
  await type.press("Tab");
  await expect(type).toHaveAttribute("aria-invalid", "true");
  await expect(type).toHaveAccessibleDescription(/61 characters; the limit is 60\. Shorten it by 1\./);
  await expect(type).toHaveValue(long);
  await expect(page.getByText("61 / 60 · 1 over")).toBeVisible();
  expect((await saved(page))?.profile.productType ?? null).toBeNull();
  const msgId = await type.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${msgId}"]`)).toHaveAttribute("aria-live", "polite");
});

test("submit validates untouched fields: Enter on an empty form shows both errors and focuses the name", async ({ page }) => {
  await page.goto("/");
  const name = page.getByLabel("Project name", { exact: true });
  await expect(name).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(h1(page, "Name and product type")).toBeVisible();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Product type", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(name).toBeFocused();
  expect((await saved(page))?.profile.name ?? null).toBeNull();
});

test("harbour: editing notes, name, type, platform and library leaves resolved byte-identical and the notice stays", async ({ page }) => {
  await seedHarbour(page, STALE);
  await page.goto("/?step=profile.identity");
  const title = page.getByRole("heading", { name: NOTICE });
  await expect(title).toBeVisible();
  const before = await resolvedBytes(page);

  await page.getByLabel("Notes (optional)").fill("New notes");
  await page.getByLabel("Notes (optional)").press("Tab");
  await expect.poll(async () => (await saved(page))?.profile.notes).toBe("New notes");
  await expect(title).toBeVisible();
  await page.getByLabel("Project name", { exact: true }).fill("Nørrebro Fysioterapi");
  await page.getByLabel("Product type", { exact: true }).fill("Clinic booking app");
  await page.getByRole("button", { name: /Continue to platform/ }).click();
  await expect(h1(page, "Platform")).toBeVisible();
  await page.getByRole("radio", { name: /Both/ }).click();
  await page.keyboard.press("Enter");
  await expect(h1(page, "Component library")).toBeVisible();
  await page.getByRole("radio", { name: /None/ }).click();
  await page.keyboard.press("Enter");
  await expect(h1(page, "Brand colour")).toBeVisible();

  expect((await saved(page))?.profile).toMatchObject({ name: "Nørrebro Fysioterapi", productType: "Clinic booking app", platform: "both", componentLibrary: "none", notes: "New notes" });
  expect(await resolvedBytes(page)).toBe(before);
  await expect(title).toBeVisible();
});

test("harbour: Recompute now replaces resolved and can be undone; after a recompute the notice does not return on reload", async ({ page }) => {
  await seedHarbour(page, STALE);
  await page.goto("/?step=profile.identity");
  const title = page.getByRole("heading", { name: NOTICE });
  await expect(title).toBeVisible();
  const before = await resolvedBytes(page);
  // Undo puts the stored snapshot back and brings the notice back (DESIGN.md Part A: undo over confirm).
  await page.getByRole("button", { name: "Recompute now" }).click();
  await expect(title).toBeHidden();
  await expect(page.getByText(/^Recomputed \d+ values?\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(title).toBeVisible();
  expect(await resolvedBytes(page)).toBe(before);
  await page.getByRole("button", { name: "Recompute now" }).click();
  await expect(title).toBeHidden();
  expect(await resolvedBytes(page)).not.toBe(before);
  // The restore path compares the stored snapshot with a fresh computation: equal now, so no notice.
  await page.reload();
  await expect(h1(page, "Name and product type")).toBeVisible();
  await expect(title).toHaveCount(0);
});

test("library panels show the real role mapping from resolved", async ({ page }) => {
  await seedHarbour(page);
  await page.goto("/?step=profile.library");
  const file = (await saved(page))!;
  const light = file.resolved!.color.light;
  const [shadcn, none] = [page.getByRole("radio", { name: /^Option 1, shadcn/ }), page.getByRole("radio", { name: /^Option 2, None/ })];
  const row = (panel: typeof shadcn, name: string) => panel.getByRole("row", { name: new RegExp(`^${name}(\\s|$)`) });
  await expect(row(shadcn, "--primary")).toContainText(light.accent);
  await expect(row(shadcn, "--background")).toContainText(light.bg);
  await expect(row(shadcn, "--radius")).toContainText(`${file.resolved!.radius}px`);
  await expect(row(none, "--accent")).toContainText(light.accent);
  await expect(row(none, "--bg")).toContainText(light.bg);
  await expect(row(none, "--radius")).toContainText(`${file.resolved!.radius}px`);
  await expect(page.getByText("set in the Color lab")).toHaveCount(0);
  await expect(page.locator("main [data-v-root]")).toHaveCount(0);
});

test("Esc in a field moves focus to the h1 and the field still saves", async ({ page }) => {
  await page.goto("/");
  const name = page.getByLabel("Project name", { exact: true });
  await expect(name).toBeFocused();
  await page.keyboard.type("Harbour");
  await page.keyboard.press("Escape");
  await expect(h1(page, "Name and product type")).toBeFocused();
  await expect.poll(async () => (await saved(page))?.profile.name).toBe("Harbour");
  // Shortcuts work again from the h1.
  await page.keyboard.press("j");
  await expect(h1(page, "Platform")).toBeVisible();
});

test.describe("touch", () => {
  test.use({ hasTouch: true });
  test("step 2 placeholder: Reopen the profile works by tap", async ({ page }) => {
    await seedHarbour(page);
    await page.goto("/?step=principles");
    const back = page.getByRole("button", { name: /Reopen the profile/ });
    await back.tap();
    await expect(h1(page, "Component library")).toBeVisible();
  });
});

for (const stop of ["profile.identity", "profile.platform", "profile.library", "principles"]) {
  test(`${stop}: every visible clickable control is at least 44px tall and shows a focus ring`, async ({ page }) => {
    await seedHarbour(page);
    await page.goto(`/?step=${stop}`);
    await expect(page.locator("main h1")).toBeVisible();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, [role=radio], [tabindex='0']")]
        .filter((el) => el.offsetParent !== null && !el.closest("[data-v-root]"))
        .map((el) => ({ el: `${el.tagName} ${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30)}`, h: el.getBoundingClientRect().height }))
        .filter((x) => x.h < 44),
    );
    // design/specs/lab-shell.md AC1: every lab and stop row is at least 44px.
    expect(small).toEqual([]);

    const noRing: string[] = [];
    await page.locator("body").focus();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
        return { id: `${el.tagName} ${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30)}`, ring };
      });
      if (r && !r.ring) noRing.push(r.id);
    }
    expect(noRing).toEqual([]);
  });
}
