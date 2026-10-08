// Static server for the built export in out/. e2e: --port 3110; the user's daily instance (pnpm serve): --port 3210 --host 127.0.0.1.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { parseArgs } from "node:util";

// No --host keeps Node's default bind, so e2e behaves as before.
const { values } = parseArgs({ options: { port: { type: "string", default: "3110" }, host: { type: "string" } } });
const root = join(import.meta.dirname, "..", "out");
if (!existsSync(join(root, "index.html"))) {
  console.error("out/index.html is missing: run pnpm build first");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root + sep) && file !== root) return void res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) return void res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(Number(values.port), values.host, () => console.log(`serving out/ on http://${values.host ?? "localhost"}:${values.port}`));
