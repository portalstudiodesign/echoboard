import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM Postgres build that must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],

  async headers() {
    return [
      {
        // Clickjacking protection: the app may not be framed by other sites…
        source: "/:path((?!embed/).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // …except the read-only embed pages, which exist to be framed by customers' sites.
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        // The loader is tiny and changes rarely; let browsers cache it but revalidate daily.
        source: "/widget.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
