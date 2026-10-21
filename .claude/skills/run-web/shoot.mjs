// Exact-width, real-time screenshot of the web app through Edge's DevTools protocol (CDP).
// node .claude/skills/run-web/shoot.mjs --out <file.png> [--path /load] [--width 390]
//   [--open] [--dark] [--reduce-motion] [--zoom200] [--base http://localhost:<agent port>]
// Prints one JSON line; exits 1 on horizontal overflow, console errors or a page that never got ready.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values: opt } = parseArgs({
  options: {
    out: { type: "string" },
    path: { type: "string", default: "/" },
    width: { type: "string", default: "390" },
    base: { type: "string", default: process.env.BASE_URL ?? "http://localhost:3110" },
    open: { type: "boolean", default: false },
    dark: { type: "boolean", default: false },
    "reduce-motion": { type: "boolean", default: false },
    zoom200: { type: "boolean", default: false },
  },
});
if (!opt.out) {
  console.error("--out <file.png> is required");
  process.exit(2);
}
const width = Number(opt.width);
// Windows: Edge at its default path. macOS/Linux: the first of Edge, Chrome or Chromium that exists.
const BROWSERS = {
  win32: ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"],
  darwin: [
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: ["/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium"],
};
const candidates = BROWSERS[process.platform] ?? BROWSERS.linux;
const edgePath = process.env.EDGE_PATH ?? candidates.find((p) => existsSync(p)) ?? candidates[0];
const profile = mkdtempSync(join(tmpdir(), "run-web-"));
const port = 9800 + Math.floor(Math.random() * 100);
const edge = spawn(
  edgePath,
  ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank"],
  { stdio: "ignore" },
);
// A missing browser is a clear message and exit 1, not an unhandled spawn error.
edge.on("error", () => {
  console.error(`no browser at ${edgePath}; install Edge or Chrome, or set EDGE_PATH`);
  rmSync(profile, { recursive: true, force: true });
  process.exit(1);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let exitCode = 0;

try {
  let target;
  for (let i = 0; i < 75 && !target; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
    } catch {}
    if (!target) await sleep(200);
  }
  if (!target) throw new Error(`Edge did not start (${edgePath}); set EDGE_PATH`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result ?? {});
      pending.delete(msg.id);
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
    }
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;

  await send("Runtime.enable");
  await send("Page.enable");
  // Exact viewport: --window-size is clamped to ~516 px on Windows; device metrics are not.
  const metrics = (height) =>
    send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }); // mobile emulation repeats the first screen in beyond-viewport captures
  await metrics(844);
  // The scheme is always set: without it headless Chrome follows the OS, so a "light" shot on a dark-mode OS comes out dark.
  const media = [
    { name: "prefers-color-scheme", value: opt.dark ? "dark" : "light" },
    ...(opt["reduce-motion"] ? [{ name: "prefers-reduced-motion", value: "reduce" }] : []),
  ];
  await send("Emulation.setEmulatedMedia", { features: media });
  await send("Page.navigate", { url: new URL(opt.path, opt.base).href });

  // Real time, no --virtual-time-budget: React hydrates on an animation frame virtual time never fires.
  // Ready = a heading is rendered, no loading status (English or Danish) and no skeleton shows
  // (skeletons pulse; client parts like the chart render one until hydration), and every chart
  // has drawn its lines.
  let ready = false;
  for (let i = 0; i < 150 && !ready; i++) {
    await sleep(200);
    ready = await evaluate(
      `!!document.querySelector('main h1')` +
        ` && ![...document.querySelectorAll('[role=status]')].some((e) => /^\\s*(Loading|Henter|Indlæser)/.test(e.textContent))` +
        ` && !document.querySelector('[class*="animate-pulse"]')` +
        ` && [...document.querySelectorAll('.recharts-wrapper')].every((w) => w.querySelector('.recharts-line-curve'))`,
    );
  }
  if (!ready) {
    console.error("page did not become ready within 30 s");
    exitCode = 1;
  }
  await sleep(400);
  if (opt.open) await evaluate(`document.querySelectorAll('details').forEach((d) => { d.open = true; }); true`);
  // A stylesheet, not a style attribute on <html>: React owns that element's attributes.
  if (opt.zoom200) {
    await evaluate(
      `document.head.append(Object.assign(document.createElement('style'), { textContent: 'html { font-size: 200% !important; }' })); true`,
    );
  }
  await sleep(200);

  const page = await evaluate(
    `({ height: Math.ceil(document.documentElement.scrollHeight),` +
      ` scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`,
  );
  // Full page without resizing the viewport: a resize makes headless Edge return tiled images.
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height: page.height, scale: 1 },
  });
  writeFileSync(opt.out, Buffer.from(shot.data, "base64"));

  const horizontalOverflow = page.scrollWidth > page.clientWidth;
  console.log(JSON.stringify({ out: opt.out, width, height: page.height, horizontalOverflow, consoleErrors: errors }));
  if (horizontalOverflow || errors.length > 0) exitCode = 1;
  ws.close();
} finally {
  edge.kill();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}
process.exit(exitCode);
