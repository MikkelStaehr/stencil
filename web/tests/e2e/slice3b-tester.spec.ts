// Tester checks for slice 3b (step 2) against the built export (no ?fixture=): localStorage is seeded.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { parse as parseYaml } from "yaml";
import type { ProjectFile } from "@/contracts/project";
import { exportAll } from "@/export";

const KEY = "design-wizard:v1:project";

async function seed(page: Page, edit: (p: Record<string, unknown>) => void = () => {}) {
  const p = JSON.parse(readFileSync(resolve("fixtures/harbour.project.json"), "utf8"));
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

const savedText = (page: Page): Promise<string> => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).file, KEY);
const saved = async (page: Page): Promise<ProjectFile> => JSON.parse(await savedText(page));
const law = (page: Page, id: string) => page.locator(`li[data-law="${id}"]`);
const box = (page: Page, id: string) => page.locator(`#law-${id}`);
const LAW_IDS = ["fitts", "hick", "wcag-contrast", "wcag-focus-visible", "response-limits", "recognition-recall", "proximity", "error-recovery", "peak-end",
  "reduced-motion", "motion-purpose", "motion-frequency", "apps-native-scroll", "apps-still-background", "website-motion-fallback", "website-still-hero"];

test("all 16 ticked laws, with edited params, show the exact rule lines of exportAll's ux-rules.yaml", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  for (const id of LAW_IDS) await box(page, id).check();
  await page.getByLabel("Minimum target size").fill("48px");
  await page.getByLabel("Minimum target size").blur();
  await page.getByLabel("Primary actions per screen").fill("2");
  await page.getByLabel("Primary actions per screen").blur();
  await page.getByLabel("Minimum contrast ratio").fill("5,5");
  await page.getByLabel("Minimum contrast ratio").blur();
  await expect.poll(async () => (await saved(page)).principles?.find((p) => p.lawId === "wcag-contrast")?.params).toEqual({ minRatio: 5.5 });
  const file = await saved(page);
  expect(file.principles?.map((p) => p.lawId)).toEqual(LAW_IDS);
  const yamlRules = (parseYaml(exportAll(file)["ux-rules.yaml"]) as { rules: { id: string; rule: string }[] }).rules;
  expect(yamlRules).toHaveLength(LAW_IDS.length);
  for (const [i, id] of LAW_IDS.entries()) {
    const sentence = law(page, id).locator("[data-rule-id]");
    await expect(sentence).toHaveAttribute("data-rule-id", yamlRules[i].id);
    await expect(sentence).toHaveText(yamlRules[i].rule, { useInnerText: false });
    expect(await sentence.textContent()).toBe(file.resolved!.rules[i].rule);
  }
  expect(yamlRules[2].rule).toContain("5.5:1");
});

test("bad param input: error next to the field (aria-describedby), input kept, store unchanged", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  const cases: [string, string, Record<string, number>][] = [
    ...["44,5", "80", "lots", "", "-1", "1e3", "0"].map((v) => ["Minimum target size", v, { minPx: 44 }] as [string, string, Record<string, number>]),
    ["Minimum contrast ratio", "3", { minRatio: 4.5 }],
    ["Minimum contrast ratio", "0", { minRatio: 4.5 }],
    ["Primary actions per screen", "0", { max: 1 }],
  ];
  for (const [label, bad, kept] of cases) {
    const before = await savedText(page);
    const field = page.getByLabel(label);
    await field.fill(bad);
    await field.blur();
    await field.blur();
    await expect(field).toHaveValue(bad);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const msgId = `${await field.getAttribute("id")}-msg`;
    await expect(field).toHaveAttribute("aria-describedby", new RegExp(`\\b${msgId}\\b`));
    await expect(page.locator(`[id="${msgId}"]`)).toContainText(/^Enter (a|a whole) number from .+ The rule still says /);
    expect(await savedText(page)).toBe(before);
    const lawId = label === "Minimum target size" ? "fitts" : label === "Minimum contrast ratio" ? "wcag-contrast" : "hick";
    expect((await saved(page)).principles?.find((p) => p.lawId === lawId)?.params).toEqual(kept);
    // Restore a valid value so the next case starts clean; the error clears on input.
    await field.fill(String(Object.values(kept)[0]));
    await field.blur();
    await expect(field).not.toHaveAttribute("aria-invalid", "true");
  }
});

test("good param input commits: 48, 48px, 4,5 and 7:1", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  const fitts = page.getByLabel("Minimum target size");
  const ratio = page.getByLabel("Minimum contrast ratio");
  const params = async (id: string) => (await saved(page)).principles?.find((p) => p.lawId === id)?.params;
  await fitts.fill("48");
  await fitts.blur();
  await expect.poll(() => params("fitts")).toEqual({ minPx: 48 });
  await fitts.fill("50px");
  await fitts.blur();
  await expect.poll(() => params("fitts")).toEqual({ minPx: 50 });
  await fitts.fill("48px");
  await fitts.blur();
  await fitts.blur();
  await expect.poll(() => params("fitts")).toEqual({ minPx: 48 });
  await expect(fitts).not.toHaveAttribute("aria-invalid", "true");
  await ratio.fill("7:1");
  await ratio.blur();
  await expect.poll(() => params("wcag-contrast")).toEqual({ minRatio: 7 });
  await ratio.fill("4,5");
  await ratio.blur();
  await ratio.blur();
  await expect.poll(() => params("wcag-contrast")).toEqual({ minRatio: 4.5 });
  await expect(law(page, "wcag-contrast").locator("[data-rule-id]")).toContainText("4.5:1");
});

test("a new project is open (null); ticking then unticking one law returns to null, never []", async ({ page }) => {
  await page.goto("/?step=principles");
  await expect(page.getByText("NO RULES YET")).toBeVisible();
  await expect(page.getByRole("button", { name: "Decide on no rules" })).toBeVisible();
  await box(page, "hick").check();
  await expect.poll(async () => (await saved(page)).principles?.map((p) => p.lawId)).toEqual(["hick"]);
  await box(page, "hick").uncheck();
  await expect.poll(async () => (await saved(page)).principles).toBeNull();
  await expect(page.getByText("NO RULES YET")).toBeVisible();
});

test("legend says Enter: Continue; keyboard focus is visible and never under the sticky bar", async ({ page }) => {
  await seed(page, (p) => void (p.principles = null));
  await page.goto("/?step=principles");
  const legend = page.locator(":is(ul,ol,dl,div):has(> * :text-is('Add or remove law'))").last();
  await expect(legend).toContainText("Continue");
  await expect(legend).not.toContainText("Pick variant");
  await page.locator("main h1").focus();
  await page.keyboard.press("Tab");
  await expect(box(page, "fitts")).toBeFocused();
  for (let i = 1; i < LAW_IDS.length; i++) {
    await page.keyboard.press("ArrowDown");
    const id = LAW_IDS[i];
    await expect(box(page, id)).toBeFocused();
    const r = await page.evaluate((cid) => {
      const el = document.getElementById(cid)!;
      const row = el.closest("label")!;
      let bar: HTMLElement | null = [...document.querySelectorAll<HTMLElement>("main button")].find((b) => /Continue|Choose at least/.test(b.textContent ?? "")) ?? null;
      while (bar && getComputedStyle(bar).position !== "sticky") bar = bar.parentElement;
      const cs = getComputedStyle(el); // the checkbox covers the whole row (absolute inset-0) and carries the ring
      return { rowBottom: row.getBoundingClientRect().bottom, barTop: bar?.getBoundingClientRect().top ?? null, outline: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
    }, `law-${id}`);
    expect(r.barTop, "sticky bar found").not.toBeNull();
    expect(r.rowBottom, `${id} row not under the bar`).toBeLessThanOrEqual(r.barTop! + 0.5);
    expect(r.outline, `${id} focus outline`).not.toBe("none");
    expect(r.width).toBeGreaterThanOrEqual(2);
  }
  // ArrowDown on the last law does not wrap.
  await page.keyboard.press("ArrowDown");
  await expect(box(page, LAW_IDS[LAW_IDS.length - 1])).toBeFocused();
});

test("do/don't plates are inert images: not focusable, no click effect, nothing in tab order", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  const plates = page.locator("li[data-law] figure [role=img]");
  await expect(plates).toHaveCount(18);
  const info = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("li[data-law] figure")].map((f) => ({
      focusables: f.querySelectorAll("a[href],button,input,select,textarea,[tabindex]:not([tabindex='-1'])").length,
      radio: f.querySelectorAll("[role=radio]").length,
    })),
  );
  expect(info.every((i) => i.focusables === 0 && i.radio === 0)).toBe(true);
  const before = await savedText(page);
  await plates.nth(0).click({ force: true });
  await plates.nth(5).click({ force: true });
  expect(await savedText(page)).toBe(before);
  await expect(box(page, "fitts")).toBeChecked();
});

test("demo plate boxes are identical before and after Inter loads", async ({ page }) => {
  await seed(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/fonts/inter/**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/?step=principles", { waitUntil: "domcontentloaded" });
  const plates = page.locator("li[data-law] figure [role=img]");
  await expect(plates).toHaveCount(18);
  await expect(page.getByText("Loading fonts…").first()).toBeVisible();
  const boxes = () => page.evaluate(() => [...document.querySelectorAll("li[data-law] figure [role=img]")].map((e) => JSON.stringify(e.getBoundingClientRect())));
  const before = await boxes();
  release();
  await expect(page.getByText("Loading fonts…")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  expect(await boxes()).toEqual(before);
});

test("chrome font and colours are unchanged after ticking laws", async ({ page }) => {
  await seed(page, (p) => void (p.principles = null));
  await page.goto("/?step=principles");
  const chrome = () =>
    page.evaluate(() =>
      ["body", "main h1", "aside", "main h2"].map((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return [cs.fontFamily, cs.color, cs.backgroundColor].join("|");
      }),
    );
  await expect(page.locator("main h2").first()).toBeVisible();
  const before = await chrome();
  for (const id of ["fitts", "wcag-contrast", "peak-end"]) await box(page, id).check();
  expect(await chrome()).toEqual(before);
});

test("reload keeps the chosen laws and params; the exports are byte-identical", async ({ page }) => {
  await seed(page);
  await page.goto("/?step=principles");
  await page.getByLabel("Minimum target size").fill("48");
  await page.getByLabel("Minimum target size").blur();
  await box(page, "response-limits").check();
  await page.getByLabel("Maximum time to first response").fill("400 ms");
  await page.getByLabel("Maximum time to first response").blur();
  await expect.poll(async () => (await saved(page)).principles?.find((p) => p.lawId === "response-limits")?.params).toEqual({ maxMs: 400 });
  const text = await savedText(page);
  const sentences = await page.locator("[data-rule-id]").allTextContents();
  await page.reload();
  await expect(box(page, "response-limits")).toBeChecked();
  await expect(page.getByLabel("Minimum target size")).toHaveValue("48");
  await expect(page.getByLabel("Maximum time to first response")).toHaveValue("400");
  expect(await page.locator("[data-rule-id]").allTextContents()).toEqual(sentences);
  await expect(page.getByText("5 RULES · 4 MUST · 1 SHOULD")).toBeVisible();
  const after = await savedText(page);
  expect(after).toBe(text);
  expect(exportAll(JSON.parse(after))).toEqual(exportAll(JSON.parse(text)));
});
