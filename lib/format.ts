/** 1234 -> "1.2k", 1_250_000 -> "1.3M". Always deterministic (no locale) to keep SSG output stable. */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 1000) return `${sign}${abs}`;
  if (abs < 1_000_000) {
    const v = abs / 1000;
    return `${sign}${v >= 100 ? Math.round(v) : trim(v.toFixed(1))}k`;
  }
  const v = abs / 1_000_000;
  return `${sign}${v >= 100 ? Math.round(v) : trim(v.toFixed(1))}M`;
}

function trim(s: string) {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** Thousands separator without locale dependence: 12345 -> "12,345". */
export function groupedNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type Period = "today" | "week" | "month";
export const PERIOD_LABEL: Record<Period, string> = { today: "today", week: "this week", month: "this month" };
