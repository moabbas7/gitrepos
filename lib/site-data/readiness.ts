/**
 * Early-days honesty (pure; unit-tested). Star gains need history: Today needs 24h of tracking,
 * Week 7 days and Month 30 days. Until then, lists show gains since tracking began, and pages say so.
 */
import type { RankPeriod } from "@/lib/types";

export const PERIOD_DAYS: Record<RankPeriod, number> = { today: 1, week: 7, month: 30 };
const PERIOD_NAME: Record<RankPeriod, string> = { today: "Today", week: "Week", month: "Month" };

export interface PeriodReadiness {
  period: RankPeriod;
  ready: boolean;
  /** Days of history so far (fractional), capped at daysNeeded. */
  daysCovered: number;
  daysNeeded: number;
  /** When the period has a full window of history. */
  readyAt: string | null;
}

export function periodReadiness(trackingSince: string | null, now: Date): Record<RankPeriod, PeriodReadiness> {
  const since = trackingSince ? Date.parse(trackingSince) : NaN;
  const out = {} as Record<RankPeriod, PeriodReadiness>;
  for (const period of Object.keys(PERIOD_DAYS) as RankPeriod[]) {
    const need = PERIOD_DAYS[period];
    if (Number.isNaN(since)) {
      out[period] = { period, ready: false, daysCovered: 0, daysNeeded: need, readyAt: null };
      continue;
    }
    const covered = Math.max(0, (now.getTime() - since) / 86_400_000);
    out[period] = {
      period,
      ready: covered >= need,
      daysCovered: Math.min(covered, need),
      daysNeeded: need,
      readyAt: new Date(since + need * 86_400_000).toISOString(),
    };
  }
  return out;
}

/** One-line note for a period that's still filling in, or null when it's ready. */
export function readinessNote(r: PeriodReadiness): string | null {
  if (r.ready) return null;
  if (r.daysNeeded === 1) {
    const hours = Math.floor(r.daysCovered * 24);
    return `Collecting star history: Today fills in after 24 hours (${hours} h so far). Gains are counted from when tracking began.`;
  }
  const day = Math.min(r.daysNeeded, Math.floor(r.daysCovered) + 1);
  return `Collecting star history: ${PERIOD_NAME[r.period]} fills in after ${r.daysNeeded} days (day ${day} of ${r.daysNeeded}). Gains are counted from when tracking began.`;
}
