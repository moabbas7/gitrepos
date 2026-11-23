/**
 * Fails the deploy if the static asset bundle is close to the Workers Free limit
 * (20,000 files per version, 25 MiB per file). We stop at 18,000 to keep headroom.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = ".open-next/assets";
const MAX_FILES = Number(process.env.MAX_ASSET_FILES ?? 18_000);
const MAX_FILE_BYTES = 25 * 1024 * 1024;

let count = 0;
let total = 0;
const tooBig: string[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else {
      count++;
      const size = statSync(p).size;
      total += size;
      if (size > MAX_FILE_BYTES) tooBig.push(p);
    }
  }
}

walk(DIR);
// `opennextjs-cloudflare deploy` copies .open-next/cache into assets/cdn-cgi/_next_cache
// (one file per prerendered route). Count it too unless it's already been copied.
const CACHE = ".open-next/cache";
if (existsSync(CACHE) && !existsSync(join(DIR, "cdn-cgi/_next_cache"))) walk(CACHE);
console.log(`[check-assets] ${count} files, ${(total / 1024 / 1024).toFixed(1)} MiB (assets + prerender cache, limit ${MAX_FILES})`);
if (tooBig.length) {
  console.error(`[check-assets] files over 25 MiB:\n${tooBig.join("\n")}`);
  process.exit(1);
}
if (count > MAX_FILES) {
  console.error(`[check-assets] too many asset files: ${count} > ${MAX_FILES}. Lower MAX_PREBUILT_REPOS.`);
  process.exit(1);
}
