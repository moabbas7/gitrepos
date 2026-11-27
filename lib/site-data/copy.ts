/**
 * Titles, descriptions and OG text for every page type, in one place so page metadata and the
 * pre-generated OG images always agree. Our own copy — never copied from other sites.
 */
export interface PageCopy {
  /** Shown in <title> (the layout appends " · GitRepos" unless absolute). */
  title: string;
  description: string;
  /** OG image: eyebrow + headline + lead. */
  eyebrow: string;
  headline: string;
  lead: string | null;
  /** /og/page/<ogKey>.png */
  ogKey: string;
}

export const STATIC_COPY = {
  home: {
    title: "GitRepos: trending GitHub repositories, ranked hourly",
    description:
      "The GitHub repositories developers are starring right now. Ranked every hour from real star counts: today, this week and this month, by language and topic.",
    eyebrow: "Trending on GitHub",
    headline: "What developers are starring right now",
    lead: "Ranked every hour from real star counts.",
    ogKey: "home",
  },
  rising: {
    title: "Rising GitHub repositories: fastest relative growth",
    description:
      "Smaller GitHub repositories (50–5,000 stars) growing fastest relative to their size. Spot projects before they hit the front page. Updated hourly.",
    eyebrow: "Rising",
    headline: "Rising repositories",
    lead: "Fastest growth relative to size, for repos with 50–5,000 stars.",
    ogKey: "rising",
  },
  new: {
    title: "New GitHub repositories gaining stars",
    description:
      "GitHub repositories created in the last 30 days, ranked by stars gained. Fresh launches developers are already starring. Updated hourly.",
    eyebrow: "New",
    headline: "New repositories",
    lead: "Created in the last 30 days, ranked by stars gained.",
    ogKey: "new",
  },
  languages: {
    title: "Trending GitHub repositories by language",
    description: "Browse trending GitHub repositories by programming language: TypeScript, Python, Rust, Go and more. Updated every hour.",
    eyebrow: "Languages",
    headline: "Trending by language",
    lead: "The top repositories in each language, updated hourly.",
    ogKey: "languages",
  },
  topics: {
    title: "Trending GitHub topics",
    description: "GitHub topics with the most stars gained this week, from AI agents to databases. Each topic lists its trending repositories.",
    eyebrow: "Topics",
    headline: "Trending topics",
    lead: "Topics ranked by stars gained this week.",
    ogKey: "topics",
  },
  digests: {
    title: "Weekly and monthly GitHub trending digests",
    description: "An archive of the top trending GitHub repositories of each week and month, with a short written intro for every digest.",
    eyebrow: "Digests",
    headline: "Trending digests",
    lead: "The top repositories of every week and month.",
    ogKey: "digests",
  },
  methodology: {
    title: "Methodology: how GitRepos ranks repositories",
    description:
      "How GitRepos measures star growth, ranks Today, Week, Month, Rising and New, awards the HOT badge and filters spam. Sources: GitHub API and GH Archive.",
    eyebrow: "Methodology",
    headline: "How we rank repositories",
    lead: "Real star counts, measured hourly. No paid placement in the rankings.",
    ogKey: "methodology",
  },
  about: {
    title: "About GitRepos",
    description: "GitRepos is the website of the @gitrepos.si Instagram account: trending GitHub repositories, ranked every hour from real star counts.",
    eyebrow: "About",
    headline: "About GitRepos",
    lead: "The website of @gitrepos.si on Instagram.",
    ogKey: "about",
  },
  data: {
    title: "Open data: daily GitHub trending rankings (CC0)",
    description:
      "Download GitRepos' daily trending rankings as JSON or CSV. Our computed rankings and star counts are public domain (CC0). Free to reuse.",
    eyebrow: "Open data",
    headline: "Trending data, CC0",
    lead: "Daily rankings as JSON and CSV. Free to reuse.",
    ogKey: "data",
  },
  privacy: {
    title: "Privacy policy",
    description: "What GitRepos collects (very little), the cookieless analytics we use, and your choices.",
    eyebrow: "Privacy",
    headline: "Privacy policy",
    lead: null,
    ogKey: "default",
  },
  terms: {
    title: "Terms of use",
    description: "The terms for using GitRepos, its data and its README badge.",
    eyebrow: "Terms",
    headline: "Terms of use",
    lead: null,
    ogKey: "default",
  },
  search: {
    title: "Search repositories, topics and languages",
    description: "Search the GitHub repositories, topics and languages tracked by GitRepos.",
    eyebrow: "Search",
    headline: "Search GitRepos",
    lead: null,
    ogKey: "default",
  },
} satisfies Record<string, PageCopy>;

export const DEFAULT_OG_COPY: Pick<PageCopy, "eyebrow" | "headline" | "lead"> = {
  eyebrow: "Trending on GitHub",
  headline: "GitRepos",
  lead: "The repositories developers are starring right now, ranked hourly.",
};

export function languageCopy(name: string, slug: string): PageCopy {
  return {
    title: `Trending ${name} repositories on GitHub`,
    description: `The ${name} repositories on GitHub gaining the most stars today, this week and this month. Ranked hourly from real star counts.`,
    eyebrow: "Language",
    headline: `Trending ${name} repositories`,
    lead: "Today, this week and this month. Updated hourly.",
    ogKey: `language-${slug}`,
  };
}

export function topicCopy(topic: string, count: number): PageCopy {
  return {
    title: `Trending #${topic} repositories on GitHub`,
    description: `${count} GitHub repositories tagged #${topic}, ranked by stars gained this week. Updated hourly.`,
    eyebrow: "Topic",
    headline: `#${topic}`,
    lead: `${count} repositories, ranked by stars gained this week.`,
    ogKey: `topic-${topic}`,
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-W48" -> "Week 48, 2026"; "2026-11" -> "November 2026". */
export function digestLabel(kind: "weekly" | "monthly", key: string): string {
  if (kind === "weekly") {
    const [y, wk] = key.split("-W");
    return `Week ${Number(wk)}, ${y}`;
  }
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

export function digestCopy(kind: "weekly" | "monthly", key: string): PageCopy {
  const label = digestLabel(kind, key);
  return {
    title: `Top trending GitHub repositories: ${label}`,
    description: `The GitHub repositories that gained the most stars in ${label.replace(/^Week/, "week")}, with a short written roundup.`,
    eyebrow: kind === "weekly" ? "Weekly digest" : "Monthly digest",
    headline: label,
    lead: "The top trending repositories, with a short roundup.",
    ogKey: `${kind}-${key}`,
  };
}
