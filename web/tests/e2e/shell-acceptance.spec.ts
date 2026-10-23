import { expect, test } from "@playwright/test";

test("AC2: loading the built shell requests only localhost (the e2e port)", async ({ page }) => {
  const all: string[] = [];
  page.on("request", (req) => all.push(req.url()));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  const foreign = all.filter((u) => !u.startsWith("http://localhost:") && !u.startsWith("data:") && !u.startsWith("blob:"));
  expect(foreign).toEqual([]);
  expect(all.length).toBeGreaterThan(0);
  test.info().annotations.push({ type: "requests", description: `${all.length} requests, all localhost` });
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("default-src 'self'");
});

test("AC6: every clickable element in the shell is at least 44px tall", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const sel = "a[href], button, input, select, textarea, [role=button], [role=radio], [role=option], [role=tab], [role=link], [tabindex]:not([tabindex='-1']), [onclick]";
  const items = await page.locator(sel).evaluateAll((els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null || getComputedStyle(e).position === "fixed")
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { tag: e.tagName, text: (e.textContent ?? "").trim().slice(0, 40), h: r.height, w: r.width };
      }),
  );
  test.info().annotations.push({ type: "clickables", description: JSON.stringify(items) });
  // design/specs/lab-shell.md AC1: every lab and stop row is at least 44px.
  for (const it of items) expect(it.h, `${it.tag} "${it.text}"`).toBeGreaterThanOrEqual(44);
});
