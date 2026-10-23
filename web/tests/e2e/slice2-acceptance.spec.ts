// Slice 2 acceptance (docs/PLAN.md AC2–AC7, step 3 only), written by tester against the built export.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const isMobile = () => test.info().project.name === "mobile-390";
const KEY = "design-wizard:v1:project";
type Proj = { visual: Record<string, unknown>; resolved: unknown };

/** Seeds the autosave once per tab (sessionStorage guard), so a reload reads what the app saved, not the seed. */
async function seed(page: Page, edit: (p: Proj) => void) {
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
const openVisual = (p: Proj) => {
  p.visual = { ...p.visual, fontPair: null, spacingBase: null, radius: null, density: null, brandHex: null, paletteVariant: null };
  p.resolved = null;
};

async function chrome(page: Page) {
  return page.evaluate(() => {
    const h1 = document.querySelector("main h1")!;
    const cs = getComputedStyle(h1);
    return { font: cs.fontFamily, color: cs.color, body: getComputedStyle(document.body).backgroundColor, bodyFont: getComputedStyle(document.body).fontFamily };
  });
}

/** Rendered-font proof: text measured as `"dwv-x", serif` and `"dwv-x", monospace` only match if dwv-x itself renders. */
async function platesRenderOwnFonts(page: Page) {
  return page.locator("main [data-v-root]").evaluateAll((roots) =>
    roots.map((root) => {
      const out: string[] = [];
      for (const part of ["title", "body"]) {
        const el = root.querySelector(`[data-v-part="${part}"]`) as HTMLElement;
        const cs = getComputedStyle(el);
        const fam = cs.fontFamily.split(",")[0].trim().replace(/"/g, "");
        if (!fam.startsWith("dwv-")) {
          out.push(`${part}: family ${cs.fontFamily}`);
          continue;
        }
        const face = [...document.fonts].find((f) => f.family.replace(/"/g, "") === fam && f.weight === cs.fontWeight);
        if (!face || face.status !== "loaded") out.push(`${part}: ${fam} ${cs.fontWeight} ${face?.status ?? "no face"}`);
        const c = document.createElement("canvas").getContext("2d")!;
        const w = (fallback: string) => {
          c.font = `${cs.fontWeight} 40px "${fam}", ${fallback}`;
          return c.measureText("Hamburgefonstiv 0123 WMQ").width;
        };
        if (Math.abs(w("serif") - w("monospace")) > 0.01) out.push(`${part}: ${fam} ${cs.fontWeight} not rendered`);
      }
      return out;
    }),
  );
}

async function expectLayout(page: Page, group: string, n: number) {
  const radios = page.getByRole("radiogroup", { name: group }).getByRole("radio");
  await expect(radios).toHaveCount(n);
  const b = await radios.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
  for (let i = 1; i < b.length; i++) {
    if (isMobile()) expect(b[i].top).toBeGreaterThan(b[i - 1].bottom);
    else {
      expect(Math.abs(b[i].top - b[0].top)).toBeLessThan(1);
      expect(b[i].left).toBeGreaterThan(b[i - 1].right);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
}

/** Every visible clickable control in main/rail is at least 44px tall (and wide). */
async function smallTargets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, a[href], input, [role=radio], [tabindex]:not([tabindex='-1'])")]
      .filter((e) => e.offsetParent !== null && !e.closest("[data-v-root]"))
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
      .map(({ e, r }) => `${e.tagName} "${(e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 40)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`),
  );
}

test("AC2/AC3/AC4: every font pair and every sub-decision, only localhost requests, own fonts rendered, chrome untouched", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith("http") && !["localhost", "127.0.0.1"].includes(u.hostname)) external.push(r.url());
  });
  await page.goto("/?step=visual.fontPair");
  await expect(page.getByRole("heading", { level: 1, name: "Font pair" })).toBeVisible();
  await expect(page.locator("main [data-v-root]").first()).toBeVisible();
  const before = await chrome(page);
  expect(before.font).not.toContain("dwv-");

  const pairsSeen = new Set<string>();
  const counts: number[] = [];
  for (let p = 0; p < 3; p++) {
    const status = page.getByText(/^Pairs \d+–\d+ of 7$/);
    const m = /Pairs (\d+)–(\d+)/.exec((await status.textContent())!)!;
    const n = Number(m[2]) - Number(m[1]) + 1;
    counts.push(n);
    await expect(page.locator("main [data-v-root]")).toHaveCount(n);
    await expect(page.getByText("Loading fonts…")).toHaveCount(0);
    await expectLayout(page, "Font pair variants", n);
    expect(await platesRenderOwnFonts(page)).toEqual(Array(n).fill([]));
    for (const l of await page.getByRole("radiogroup", { name: "Font pair variants" }).getByRole("radio").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")))) pairsSeen.add(l!);
    expect(await chrome(page)).toEqual(before);
    await page.getByRole("button", { name: "More pairs" }).click();
  }
  expect(pairsSeen.size).toBe(7);

  // Font pair: choose the 2nd on page 1, then spacing, radius, density and palette with a non-default variant.
  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  for (const [h1, group] of [["Spacing", "Spacing variants"], ["Radius", "Radius variants"]] as const) {
    await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
    await expect(page.getByText("Loading fonts…")).toHaveCount(0);
    await expectLayout(page, group, 3);
    expect(await platesRenderOwnFonts(page)).toEqual([[], [], []]);
    await page.keyboard.press("3");
    await page.keyboard.press("Enter");
    expect(await chrome(page)).toEqual(before);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Density" })).toBeVisible();
  await expectLayout(page, "Density variants", 3);
  expect(await platesRenderOwnFonts(page)).toEqual([[], [], []]);
  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  expect(await chrome(page)).toEqual(before);
  // The palette comes before the font pair on the path (Color lab), after the brand colour's own stop.
  await page.goto("/?step=visual.brandHex");
  await page.locator("#brand-hex").fill("#FFFF00");
  await page.locator("#brand-hex").press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: /palette/i })).toBeVisible();
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);
  await expectLayout(page, "Palette variants", 3);
  expect(await platesRenderOwnFonts(page)).toEqual([[], [], []]);
  await page.keyboard.press("3");
  await page.keyboard.press("Enter");
  expect(await chrome(page)).toEqual(before);
  expect(external).toEqual([]);
  test.info().annotations.push({ type: "pairs-per-page", description: counts.join(",") });
});

test("AC5: a plate's box is identical while its fonts load and after they loaded", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/fonts/**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/?step=visual.radius", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Loading fonts…").first()).toBeVisible();
  const radios = page.getByRole("radiogroup", { name: "Radius variants" }).getByRole("radio");
  const boxes = () => radios.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
  const loading = await boxes();
  test.info().annotations.push({ type: "loading", description: JSON.stringify(loading) });
  release();
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await boxes()).toEqual(loading);
});

test("AC6: every clickable row in step 3 is at least 44px, on every sub-decision", async ({ page }) => {
  await seed(page, () => {});
  const found: Record<string, string[]> = {};
  for (const s of ["fontPair", "spacing", "radius", "palette", "density"]) {
    await page.goto(`/?step=visual.${s}`);
    await expect(page.locator("main [data-v-root]").first()).toBeVisible();
    const small = await smallTargets(page);
    if (small.length) found[s] = small;
  }
  // design/specs/lab-shell.md AC1: every lab and stop row, and every button, is >= 44px.
  expect(found).toEqual({});
});

test("AC6/AC7/saved: step 3 by keyboard alone with visible focus, brand typed; decisions autosave, resolve and survive reload", async ({ page }) => {
  await seed(page, openVisual);
  // The Color lab comes first on the path: the brand colour's own stop, then the palette.
  await page.goto("/?step=visual.brandHex");
  await expect(page.getByRole("heading", { level: 1, name: "Brand colour" })).toBeVisible();

  // Reach the brand field with Tab only; every stop must show a focus indicator.
  const unfocused: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
      const wrap = el.parentElement ? getComputedStyle(el.parentElement) : null;
      const within = !!wrap && ((wrap.outlineStyle !== "none" && parseFloat(wrap.outlineWidth) > 0) || wrap.boxShadow !== "none");
      return { id: el.id, desc: `${el.tagName} ${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}`, visible: ring || within };
    });
    if (!f.visible) unfocused.push(f.desc);
    if (f.id === "brand-hex") break;
  }
  await expect(page.locator("#brand-hex")).toBeFocused();
  expect.soft(unfocused).toEqual([]);
  await page.keyboard.type(" #abc ");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: /palette/i })).toBeVisible();
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);
  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Font pair" })).toBeVisible();
  await expect(page.locator("main [data-v-root]")).toHaveCount(3);
  await page.keyboard.press("3");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Spacing" })).toBeVisible();
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Radius" })).toBeVisible();
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Density" })).toBeVisible();
  await page.keyboard.press("3");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "UX principles" })).toBeVisible();

  const saved = await page.evaluate((k) => JSON.parse(JSON.parse(localStorage.getItem(k)!).file), KEY);
  expect(saved.visual).toMatchObject({ spacingBase: 4, radius: 0, brandHex: "#AABBCC", paletteVariant: "tinted", density: "airy" });
  expect(saved.visual.fontPair).not.toBeNull();
  expect(saved.resolved).not.toBeNull();
  expect(saved.resolved.color.light ?? saved.resolved.color).toBeTruthy();

  // E goes back to the last decided stop; J/K move.
  await page.keyboard.press("e");
  await expect(page.getByRole("heading", { level: 1, name: "Density" })).toBeVisible();
  await page.keyboard.press("k");
  await expect(page.getByRole("heading", { level: 1, name: "Radius" })).toBeVisible();
  await page.keyboard.press("j");
  await expect(page.getByRole("heading", { level: 1, name: "Density" })).toBeVisible();

  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await page.goto("/?step=visual.brandHex");
  await expect(page.locator("#brand-hex")).toHaveValue("#AABBCC");
  await page.goto("/?step=visual.palette");
  await expect(page.getByText("From brand colour #AABBCC.")).toBeVisible();
  await expect(page.getByRole("radio", { checked: true })).toHaveAccessibleName(/Tinted/);
  const after = await page.evaluate((k) => JSON.parse(JSON.parse(localStorage.getItem(k)!).file), KEY);
  expect(after.visual).toEqual(saved.visual);
  expect(after.resolved).toEqual(saved.resolved);
  await page.goto("/?step=visual.spacing");
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
});

test("AC7: brand field validates on blur, keeps the input, puts the error next to it, accepts valid forms", async ({ page }) => {
  // The field is on the brand colour's own stop and the palettes on the next one, so the saved value is the proof.
  const savedBrand = () =>
    page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw === null ? null : (JSON.parse(JSON.parse(raw).file).visual.brandHex as string | null);
    }, KEY);
  await page.goto("/?step=visual.brandHex");
  const field = page.locator("#brand-hex");
  await field.fill("teal");
  await expect(page.locator("#brand-hex-error")).toHaveCount(0); // not while typing, before the first blur
  for (const bad of ["teal", "#12", "12345", "#GGGGGG", "#0F766E1"]) {
    await field.fill(bad);
    await field.blur();
    const alert = page.locator("#brand-hex-error");
    await expect(alert).toBeVisible();
    await expect(field).toHaveValue(bad);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAttribute("aria-describedby", "brand-hex-error");
    const [fb, ab] = [await field.boundingBox(), await alert.boundingBox()];
    expect(ab!.y - (fb!.y + fb!.height)).toBeLessThan(24);
    expect(await savedBrand()).toBeNull();
  }
  for (const [ok, norm] of [["0f766e", "#0F766E"], [" #ABC ", "#AABBCC"], ["#000", "#000000"], ["#FFF", "#FFFFFF"], ["#777", "#777777"], ["#FFFF00", "#FFFF00"]]) {
    await field.fill(ok);
    await field.blur();
    await expect(field).toHaveValue(norm);
    await expect(page.locator("#brand-hex-error")).toHaveCount(0);
    await expect.poll(savedBrand).toBe(norm);
  }
});

test("saved: a spacing base of 5 (not a fixed candidate) shows as chosen", async ({ page }) => {
  await seed(page, (p) => {
    p.visual.spacingBase = 5;
    p.resolved = null;
  });
  await page.goto("/?step=visual.spacing");
  await expect(page.getByRole("heading", { level: 1, name: "Spacing" })).toBeVisible();
  const radios = page.getByRole("radiogroup", { name: "Spacing variants" }).getByRole("radio");
  await expect(radios).toHaveCount(3);
  const checked = page.getByRole("radio", { checked: true });
  await expect(checked).toHaveCount(1);
  await expect(checked).toHaveAccessibleName(/5-pt/);
});

test("AC6: the brand colour field shows a visible focus indicator when reached by keyboard", async ({ page }) => {
  await page.goto("/?step=visual.brandHex");
  const field = page.locator("#brand-hex");
  await expect(field).toBeVisible();
  const look = () =>
    field.evaluate((el) => {
      const pick = (e: Element) => {
        const cs = getComputedStyle(e);
        return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} | ${cs.boxShadow} | ${cs.borderColor} ${cs.borderWidth}`;
      };
      return { input: pick(el), wrap: pick(el.parentElement!) };
    });
  const idle = await look();
  for (let i = 0; i < 40 && !(await field.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(field).toBeFocused();
  expect(await field.evaluate((e) => e.matches(":focus-visible"))).toBe(true);
  const focused = await look(); test.info().annotations.push({ type: "focus", description: JSON.stringify({ idle, focused }) }); expect(focused.input.startsWith("solid") || focused.wrap !== idle.wrap).toBe(true);
});
