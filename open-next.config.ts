import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * No-card hosting model (see README "Hosting model"):
 * - Every public page is prerendered at build time (SSG) and served from Workers static assets.
 * - The incremental cache is read-only; freshness comes from the hourly CI rebuild + deploy.
 * - Cache interception serves prerendered routes without booting Next.js (minimal CPU on Free).
 * To move to ISR later: switch to the R2 incremental cache + DO queue (needs R2 enabled).
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
