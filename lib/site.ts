/** Public site URL (canonical/OG). Override with NEXT_PUBLIC_SITE_URL, e.g. once a custom domain exists. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://gitrepos.gitrepos.workers.dev").replace(/\/$/, "");
