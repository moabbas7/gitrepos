/**
 * Weekly / monthly digests (pure; unit-tested). Built from ranking_history: the Trending "week"
 * list on the last day of an ISO week, and the "month" list on the last day of a month.
 */
import { digestLabel } from "@/lib/site-data/copy";
import type { RepoCardData } from "@/lib/types";

const DAY = 86_400_000;
export const DIGEST_SIZE = 25;

export interface DigestPeriod {
  kind: "weekly" | "monthly";
  key: string; // "2026-W48" | "2026-11"
  start: string; // YYYY-MM-DD (inclusive)
  end: string; // YYYY-MM-DD (inclusive)
}

const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

/** ISO-8601 week key for a UTC date, e.g. 2026-11-23 -> "2026-W48". */
export function isoWeekKey(d: Date): string {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Mon = 0
  const thursday = t + (3 - dow) * DAY; // the week belongs to the year of its Thursday
  const year = new Date(thursday).getUTCFullYear();
  const week = 1 + Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The last complete ISO week and calendar month before `now`. */
export function lastCompletePeriods(now: Date): { weekly: DigestPeriod; monthly: DigestPeriod } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dow = (new Date(today).getUTCDay() + 6) % 7;
  const thisMonday = today - dow * DAY;
  const lastMonday = thisMonday - 7 * DAY;
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const monthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - DAY;
  return {
    weekly: { kind: "weekly", key: isoWeekKey(new Date(lastMonday)), start: ymd(lastMonday), end: ymd(thisMonday - DAY) },
    monthly: { kind: "monthly", key: ymd(monthStart).slice(0, 7), start: ymd(monthStart), end: ymd(monthEnd) },
  };
}

/**
 * A digest is only honest if tracking covered (almost) the whole period: tracking must have begun
 * within 1 day of the start of a week, or 3 days of the start of a month.
 */
export function periodCovered(p: DigestPeriod, trackingSince: string | null): boolean {
  if (!trackingSince) return false;
  const grace = (p.kind === "weekly" ? 1 : 3) * DAY;
  return Date.parse(trackingSince) <= Date.parse(`${p.start}T00:00:00Z`) + grace;
}

/** When the first digest of each kind can appear, for the empty archive state. */
export function firstDigestDates(trackingSince: string | null): { weekly: string | null; monthly: string | null } {
  if (!trackingSince) return { weekly: null, monthly: null };
  const s = new Date(trackingSince);
  const day = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const dow = (new Date(day).getUTCDay() + 6) % 7;
  // A week whose Monday is within 1 day of tracking start counts; otherwise the next full week.
  let monday = day - dow * DAY;
  if (Date.parse(trackingSince) > monday + DAY) monday += 7 * DAY;
  let month = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1);
  if (Date.parse(trackingSince) > month + 3 * DAY) month = Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1);
  const nextMonth = new Date(month);
  return {
    weekly: ymd(monday + 7 * DAY), // published the Monday after the week ends
    monthly: ymd(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1)),
  };
}

export interface HistoryRow {
  date: string;
  rank: number;
  repo_id: number;
  gained: number;
}

/** Picks the latest day's list inside the period and returns its top rows in rank order. */
export function pickDigestRows(rows: readonly HistoryRow[], p: DigestPeriod, size = DIGEST_SIZE): HistoryRow[] {
  const inside = rows.filter((r) => r.date >= p.start && r.date <= p.end);
  if (!inside.length) return [];
  const last = inside.reduce((m, r) => (r.date > m ? r.date : m), inside[0].date);
  return inside
    .filter((r) => r.date === last && r.gained > 0)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, size);
}

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function topCounts(values: (string | null)[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([k]) => k);
}

/** Original, data-driven intro used when Gemini is unavailable. */
export function templateIntro(p: DigestPeriod, items: readonly RepoCardData[]): string {
  const label = digestLabel(p.kind, p.key);
  const span = p.kind === "weekly" ? `${label.replace(/^Week/, "week")} (${p.start} to ${p.end})` : label;
  if (!items.length) return `No repositories qualified for ${span}.`;
  const [a, b, c] = items;
  const parts = [`The top repository of ${span} was ${a.owner}/${a.name}, which gained ${fmt(a.gained)} stars.`];
  if (b && c) parts.push(`It was followed by ${b.owner}/${b.name} (+${fmt(b.gained)}) and ${c.owner}/${c.name} (+${fmt(c.gained)}).`);
  else if (b) parts.push(`Next came ${b.owner}/${b.name} (+${fmt(b.gained)}).`);
  const langs = topCounts(items.map((i) => i.language), 2);
  const topics = topCounts(items.flatMap((i) => i.topics), 1);
  if (langs.length) {
    const langText = langs.length === 2 ? `${langs[0]} and ${langs[1]} were` : `${langs[0]} was`;
    parts.push(`${langText} the most common ${langs.length === 2 ? "languages" : "language"} in the top ${items.length}${topics[0] ? `, and #${topics[0]} the most frequent topic` : ""}.`);
  }
  return parts.join(" ");
}

export const DIGEST_SYSTEM = [
  "You write a short, original roundup paragraph for a weekly or monthly list of trending GitHub repositories.",
  "Write 2 to 4 plain sentences in your own words: name the top two or three repositories, say what kind of",
  "projects dominated, and mention a notable language or topic. Use only the data given. No hype, no emojis,",
  "no markdown, no links.",
].join(" ");

export function digestPrompt(p: DigestPeriod, items: readonly RepoCardData[]): string {
  const lines = items
    .slice(0, 10)
    .map((i) => `#${i.rank} ${i.owner}/${i.name} (+${i.gained} stars, ${i.language ?? "unknown language"}; topics: ${i.topics.join(", ") || "none"}): ${i.description ?? ""}`);
  return [`Period: ${digestLabel(p.kind, p.key)} (${p.start} to ${p.end})`, "Top repositories:", ...lines].join("\n");
}

/** Cleans model output into a 2–4 sentence paragraph, or null if unusable. */
export function cleanIntro(raw: string): string | null {
  let t = raw.replace(/[*_#`>]/g, "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  const sentences = t.match(/[^.!?]+[.!?]+/g) ?? [t];
  t = sentences.slice(0, 4).map((x) => x.trim()).join(" ");
  return t.length >= 80 && t.length <= 900 ? t : null;
}

export function digestTitle(p: DigestPeriod): string {
  return p.kind === "weekly" ? `Top trending repositories of ${digestLabel("weekly", p.key).toLowerCase()}` : `Top trending repositories of ${digestLabel("monthly", p.key)}`;
}
