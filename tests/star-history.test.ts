import { describe, expect, it } from "vitest";
import { buildDailyFile } from "../jobs/lib/daily";
import { addPoint, compactSeries, dayGain, seriesGains, starsAt, type StarHistory, type StarPoint } from "../jobs/lib/star-history";
import { meta, NOW } from "./helpers";

const s = (iso: string) => Date.parse(iso) / 1000;
const H = 3600;

describe("starsAt", () => {
  const pts: StarPoint[] = [
    [s("2026-11-22T00:00:00Z"), 100],
    [s("2026-11-23T00:00:00Z"), 200],
  ];
  it("interpolates linearly between points", () => {
    expect(starsAt(pts, s("2026-11-22T12:00:00Z"))).toBe(150);
  });
  it("returns the last point after the series and the first before it", () => {
    expect(starsAt(pts, s("2026-11-24T00:00:00Z"))).toBe(200);
    expect(starsAt(pts, s("2026-11-01T00:00:00Z"))).toBe(100);
  });
  it("uses 0 before creation for brand-new repos", () => {
    expect(starsAt(pts, s("2026-11-21T00:00:00Z"), "2026-11-21T06:00:00Z")).toBe(0);
  });
  it("returns null for an empty series", () => {
    expect(starsAt([], 0)).toBeNull();
  });
});

describe("seriesGains", () => {
  it("computes today/week/month from real star counts", () => {
    const pts: StarPoint[] = [
      [s("2026-10-24T12:00:00Z"), 1000], // 30d ago
      [s("2026-11-16T12:00:00Z"), 1500], // 7d ago
      [s("2026-11-22T12:00:00Z"), 1900], // 24h ago
      [s("2026-11-23T12:00:00Z"), 2000], // now
    ];
    const g = seriesGains(pts, NOW)!;
    expect(g.gains).toEqual({ today: 100, week: 500, month: 1000 });
    expect(g.stars).toBe(2000);
    expect(g.spark).toHaveLength(7);
    expect(g.spark[6]).toBe(100);
  });

  it("is conservative when history is shorter than the window", () => {
    const pts: StarPoint[] = [
      [s("2026-11-23T06:00:00Z"), 500],
      [s("2026-11-23T12:00:00Z"), 560],
    ];
    expect(seriesGains(pts, NOW)!.gains).toEqual({ today: 60, week: 60, month: 60 });
  });

  it("counts from zero for repos created inside the window", () => {
    const pts: StarPoint[] = [[s("2026-11-23T12:00:00Z"), 300]];
    expect(seriesGains(pts, NOW, "2026-11-23T01:00:00Z")!.gains.today).toBe(300);
  });

  it("never reports negative gains (unstars)", () => {
    const pts: StarPoint[] = [
      [s("2026-11-22T12:00:00Z"), 100],
      [s("2026-11-23T12:00:00Z"), 90],
    ];
    expect(seriesGains(pts, NOW)!.gains.today).toBe(0);
  });
});

describe("addPoint / compactSeries", () => {
  it("appends in order and ignores out-of-order points", () => {
    const h: StarHistory = {};
    addPoint(h, 1, new Date("2026-11-23T10:00:00Z"), 10);
    addPoint(h, 1, new Date("2026-11-23T11:00:00Z"), 12);
    addPoint(h, 1, new Date("2026-11-23T09:00:00Z"), 1);
    expect(h[1].map((p) => p[1])).toEqual([10, 12]);
  });

  it("keeps every point from the last 48h and one per day for 35 days", () => {
    const now = s("2026-11-23T12:00:00Z");
    const pts: StarPoint[] = [];
    for (let t = now - 40 * 24 * H; t <= now; t += 6 * H) pts.push([t, t]);
    const c = compactSeries(pts, NOW);
    const recent = c.filter((p) => p[0] >= now - 48 * H);
    expect(recent).toHaveLength(9); // 48h / 6h + 1
    const older = c.filter((p) => p[0] < now - 48 * H);
    const days = new Set(older.map((p) => Math.floor(p[0] / 86400)));
    expect(days.size).toBe(older.length); // one per day
    expect(Math.min(...c.map((p) => p[0]))).toBeGreaterThanOrEqual(now - 35 * 86400);
    expect(c).toEqual([...c].sort((a, b) => a[0] - b[0]));
  });
});

describe("daily rollup", () => {
  it("computes true gains for a complete day and keeps repos with >= minStars", () => {
    const hist: StarHistory = {
      1: [
        [s("2026-11-21T18:00:00Z"), 100],
        [s("2026-11-22T18:00:00Z"), 124],
        [s("2026-11-23T00:41:00Z"), 130],
      ],
      2: [
        [s("2026-11-21T23:00:00Z"), 50],
        [s("2026-11-23T01:00:00Z"), 51],
      ],
      3: [[s("2026-11-22T10:00:00Z"), 10]], // no point near day end -> not covered
    };
    const cache = { 1: meta(1), 2: meta(2), 3: meta(3) };
    // start: 100→124 interpolated at 00:00 = 106; end: 124→130 at 00:00 next day ≈ 129.4 → 23
    expect(dayGain(hist[1], "2026-11-22")).toBe(23);
    const { file, all } = buildDailyFile("2026-11-22", hist, cache, 3);
    expect(file.reposCovered).toBe(2);
    expect(Object.keys(file.repos)).toEqual(["1"]);
    expect(file.repos[1][1]).toBe(23);
    expect(all.get(2)).toEqual({ gained: 1, stars: 51 });
    expect(all.has(3)).toBe(false);
  });
});
