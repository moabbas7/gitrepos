import { describe, expect, it } from "vitest";
import { fitPayload } from "../jobs/lib/payload";
import {
  DEFAULT_RANK_CONFIG,
  hotThreshold,
  orderList,
  percentile,
  rankAll,
  risingScore,
  topLanguages,
} from "../jobs/lib/rank-core";
import { cand, NOW } from "./helpers";

const ids = (xs: { meta: { id: number } }[]) => xs.map((x) => x.meta.id);

describe("Trending lists", () => {
  it("sorts by stars gained in the period, ties broken by total stars then id", () => {
    const c = [
      cand(1, { today: 10 }, { stars: 500 }),
      cand(2, { today: 50 }),
      cand(3, { today: 10 }, { stars: 900 }),
      cand(4, { today: 10 }, { stars: 900 }),
      cand(5, { today: 0 }),
    ];
    expect(ids(orderList(c, "trending", "today", NOW))).toEqual([2, 3, 4, 1]);
  });

  it("uses the requested window", () => {
    const c = [cand(1, { today: 5, week: 10 }), cand(2, { today: 1, week: 100 })];
    expect(ids(orderList(c, "trending", "today", NOW))).toEqual([1, 2]);
    expect(ids(orderList(c, "trending", "week", NOW))).toEqual([2, 1]);
  });

  it("excludes archived, forks, empty, missing and spam repos", () => {
    const c = [
      cand(1, { today: 9 }, { isArchived: true }),
      cand(2, { today: 9 }, { isFork: true }),
      cand(3, { today: 9 }, { isEmpty: true }),
      cand(4, { today: 9 }, { missing: true }),
      cand(5, { today: 9 }, { spam: { isSpam: true, ratio: 0.9, sampled: 50, checkedAt: NOW.toISOString() } }),
      cand(6, { today: 1 }, { spam: { isSpam: false, ratio: 0.1, sampled: 50, checkedAt: NOW.toISOString() } }),
    ];
    expect(ids(orderList(c, "trending", "today", NOW))).toEqual([6]);
  });
});

describe("Rising", () => {
  it("scores growth relative to stars at the window start, within the 50–5,000 band", () => {
    // start = stars - gained
    expect(risingScore(cand(1, { week: 100 }, { stars: 300 }), "week")).toBeCloseTo(0.5);
    expect(risingScore(cand(2, { week: 100 }, { stars: 140 }), "week")).toBeNull(); // start 40 < 50
    expect(risingScore(cand(3, { week: 100 }, { stars: 5200 }), "week")).toBeNull(); // start 5100 > 5000
    expect(risingScore(cand(4, { week: 5 }, { stars: 100 }), "week")).toBeNull(); // below min gained
  });

  it("orders by growth rate, not absolute gains", () => {
    const c = [cand(1, { week: 400 }, { stars: 4400 }), cand(2, { week: 100 }, { stars: 200 })];
    expect(ids(orderList(c, "rising", "week", NOW))).toEqual([2, 1]);
  });

  it("includes the band edges (50 and 5,000 starting stars)", () => {
    const c = [cand(1, { week: 20 }, { stars: 70 }), cand(2, { week: 20 }, { stars: 5020 })];
    expect(ids(orderList(c, "rising", "week", NOW)).sort()).toEqual([1, 2]);
  });
});

describe("New", () => {
  it("only includes repos created in the last 30 days", () => {
    const c = [
      cand(1, { today: 5 }, { createdAt: "2026-11-20T00:00:00Z" }),
      cand(2, { today: 50 }, { createdAt: "2026-10-01T00:00:00Z" }),
      cand(3, { today: 9 }, { createdAt: "2026-10-25T00:00:00Z" }),
      cand(4, { today: 9 }, { createdAt: null }),
    ];
    expect(ids(orderList(c, "new", "today", NOW))).toEqual([3, 1]);
  });
});

describe("HOT badge", () => {
  it("percentile uses nearest-rank", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
    expect(percentile([], 0.99)).toBe(Infinity);
  });

  it("marks only the top 1% of 24h velocity, never below the floor", () => {
    const c = Array.from({ length: 200 }, (_, i) => cand(i + 1, { today: i + 1 }));
    const t = hotThreshold(c);
    expect(t).toBe(198); // 99th percentile of 1..200
    const lists = rankAll(c, NOW);
    const today = lists.find((l) => l.listType === "trending" && l.period === "today" && l.language === "all")!;
    expect(today.items.filter((i) => i.isHot).map((i) => i.id)).toEqual([200, 199, 198]);
  });

  it("applies the absolute floor for small pools", () => {
    expect(hotThreshold([cand(1, { today: 3 }), cand(2, { today: 5 })])).toBe(DEFAULT_RANK_CONFIG.hotMinToday);
  });
});

describe("rankAll", () => {
  it("produces 3 list types × 3 periods for 'all' plus per-language lists with 1-based ranks", () => {
    const c = [
      cand(1, { today: 5, week: 30, month: 60 }, { language: "Rust", stars: 300 }),
      cand(2, { today: 9, week: 40, month: 90 }, { language: "Go", stars: 400, createdAt: "2026-11-15T00:00:00Z" }),
      cand(3, { today: 2, week: 20, month: 40 }, { language: "Rust", stars: 200 }),
    ];
    const lists = rankAll(c, NOW);
    const all = lists.filter((l) => l.language === "all");
    expect(all).toHaveLength(9);
    const rust = lists.find((l) => l.listType === "trending" && l.period === "today" && l.language === "rust")!;
    expect(rust.items.map((i) => [i.id, i.rank])).toEqual([[1, 1], [3, 2]]);
    const newToday = lists.find((l) => l.listType === "new" && l.period === "today" && l.language === "all")!;
    expect(newToday.items.map((i) => i.id)).toEqual([2]);
    expect(newToday.items[0].isNew).toBe(true);
  });

  it("caps list size and the number of language lists", () => {
    const c = Array.from({ length: 150 }, (_, i) => cand(i + 1, { today: i + 1, week: i + 1 }, { language: `L${i % 30}` }));
    const cfg = { ...DEFAULT_RANK_CONFIG, listSize: 100, maxLanguages: 25 };
    const lists = rankAll(c, NOW, cfg);
    expect(lists.find((l) => l.language === "all" && l.listType === "trending" && l.period === "today")!.items).toHaveLength(100);
    expect(new Set(lists.map((l) => l.language)).size).toBe(26);
    expect(topLanguages(c, 25)).toHaveLength(25);
  });

  it("truncates long descriptions and limits topics on cards", () => {
    const c = [cand(1, { today: 3 }, { description: "x".repeat(400), topics: ["a", "b", "c", "d", "e", "f"] })];
    const item = rankAll(c, NOW)[0].items[0];
    expect(item.description!.length).toBeLessThanOrEqual(180);
    expect(item.topics).toHaveLength(4);
  });
});

describe("payload size guard", () => {
  it("trims the tail until the JSON fits", () => {
    const c = Array.from({ length: 100 }, (_, i) => cand(i + 1, { today: 100 - i }, { description: "d".repeat(170) }));
    const list = rankAll(c, NOW)[0];
    const { json, count } = fitPayload(list, 10_000);
    expect(json.length).toBeLessThanOrEqual(10_000);
    expect(count).toBeLessThan(100);
    expect(JSON.parse(json)[0].rank).toBe(1);
  });
});
