import type { Metadata } from "next";
import { THEME_BOOT } from "@/lib/theme";
import { geist, geistMono } from "./fonts";
import "./globals.css";

// No request may leave the origin (CLAUDE.md). Dev needs eval and the HMR socket; production does not.
const isDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export const metadata: Metadata = {
  title: "Stencil",
  description: "Make a project's design and UX decisions, then export them for the dev team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Dark in the static HTML; THEME_BOOT applies the stored choice before first paint (no flicker), so the
    // attribute may differ from the server's at hydration.
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
