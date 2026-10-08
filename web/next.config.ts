import type { NextConfig } from "next";

// Local-only static app: `next build` writes out/, and any server-only feature fails the build.
const nextConfig: NextConfig = {
  output: "export",
  // `pnpm serve` (the user's daily instance on 3210) exports to out-daily/ instead, so agent builds into out/ never
  // touch it. With output: "export", a distDir other than ".next" is the export folder; the build cache stays in .next.
  distDir: process.env.npm_lifecycle_event === "serve" ? "out-daily" : ".next",
  images: { unoptimized: true },
  // The dev badge sits over the rail's shortcut legend and would show up in run-web screenshots.
  devIndicators: false,
};

export default nextConfig;
