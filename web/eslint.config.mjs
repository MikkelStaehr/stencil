import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layer rules from docs/ARCHITECTURE.md §3: each zone lists what `target` may NOT import.
const src = (dir) => `./src/${dir}`;
const zone = (target, from, message) => ({ target: src(target), from: from.map(src), message });
const ALL = ["contracts", "lib", "content", "domain", "export", "data", "fonts", "components", "app"];
const except = (...keep) => ALL.filter((d) => !keep.includes(d));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "out-daily/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
  {
    rules: {
      // No server code and no third-party hosts (CLAUDE.md, ARCHITECTURE.md §6).
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "next/headers", message: "Static export: no server code." },
            { name: "next/server", message: "Static export: no server code." },
            { name: "server-only", message: "Static export: no server code." },
            { name: "next/font/google", message: "No third-party requests: use next/font/local." },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({
          name,
          message: "The app makes no network requests (CLAUDE.md: local only).",
        })),
      ],
      "no-restricted-properties": [
        "error",
        { object: "navigator", property: "sendBeacon", message: "The app makes no network requests." },
      ],
      "import/no-cycle": "error",
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            zone("contracts", except("contracts"), "contracts imports nothing else from src."),
            zone("lib", except("lib"), "lib imports nothing else from src."),
            zone("content", except("content", "contracts"), "content may import contracts only."),
            zone("domain", except("domain", "contracts", "content", "lib"), "domain is pure: contracts, content, lib."),
            zone("export", except("export", "contracts", "domain", "lib"), "Exporters read `resolved`, never content/."),
            zone("data", except("data", "contracts", "content", "domain", "lib"), "data never imports export or UI."),
            zone("fonts", except("fonts", "contracts", "content"), "fonts may import contracts and content only."),
            {
              target: src("components/samples"),
              from: [...ALL.filter((d) => d !== "components").map(src), src("components/ui"), src("components/wizard"), src("components/plate")],
              message: "Samples read only --v-* and their CSS module.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
