import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Cache Components / Partial Prefetching are intentionally OFF:
// OpenNext's static-assets incremental cache (our no-card hosting model) only serves
// fully prerendered pages and does not support PPR. Pages are SSG, rebuilt hourly by CI.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Avatars are served straight from GitHub; no image optimisation worker needed on Free.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Gives `next dev` access to Cloudflare bindings (D1) via wrangler's local platform proxy.
initOpenNextCloudflareForDev();
