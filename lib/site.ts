/** Public site URL (canonical/OG). Override with NEXT_PUBLIC_SITE_URL, e.g. once a custom domain exists. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://gitrepos.gitrepos.workers.dev").replace(/\/$/, "");
export const SITE_NAME = "GitRepos";
export const INSTAGRAM_HANDLE = "gitrepos.si";
export const INSTAGRAM_URL = "https://www.instagram.com/gitrepos.si/";
/** Public repo of the data branch (CC0 history). */
export const DATA_REPO_URL = "https://github.com/moabbas7/gitrepos/tree/data";
/** Cloudflare Web Analytics token (cookieless). The beacon is only added when this is set. */
export const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || "";
/** AdSense is not built yet (prompt 3+). AdSlot placeholders collapse while this is false. */
export const ADS_ENABLED = process.env.ADSENSE_ENABLED === "true";
