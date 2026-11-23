import { describe, expect, it } from "vitest";
import { evaluateStargazers, verdictIsFresh, type StargazerSample } from "../jobs/lib/spam";
import { NOW } from "./helpers";

const DAY = 86_400_000;
function sample(young: number, old: number): StargazerSample[] {
  const starred = new Date(NOW.getTime() - DAY).toISOString();
  return [
    ...Array.from({ length: young }, () => ({ starredAt: starred, userCreatedAt: new Date(NOW.getTime() - 3 * DAY).toISOString() })),
    ...Array.from({ length: old }, () => ({ starredAt: starred, userCreatedAt: "2019-01-01T00:00:00Z" })),
  ];
}

describe("spam guard", () => {
  it("flags repos where more than 80% of sampled stargazers are < 7-day-old accounts", () => {
    const v = evaluateStargazers(sample(45, 5), NOW);
    expect(v).toMatchObject({ isSpam: true, ratio: 0.9, sampled: 50 });
  });

  it("does not flag at exactly 80% (strictly greater than)", () => {
    expect(evaluateStargazers(sample(40, 10), NOW).isSpam).toBe(false);
  });

  it("does not flag organic repos", () => {
    expect(evaluateStargazers(sample(5, 45), NOW).isSpam).toBe(false);
  });

  it("needs a minimum sample before flagging", () => {
    expect(evaluateStargazers(sample(10, 0), NOW)).toMatchObject({ isSpam: false, sampled: 10, ratio: 1 });
  });

  it("measures account age at star time, not now", () => {
    // Account created 10 days before starring, star given a year ago -> not young.
    const s = Array.from({ length: 30 }, () => ({ starredAt: "2025-11-20T00:00:00Z", userCreatedAt: "2025-11-10T00:00:00Z" }));
    expect(evaluateStargazers(s, NOW).isSpam).toBe(false);
    // Created 2 days before starring -> young.
    const y = Array.from({ length: 30 }, () => ({ starredAt: "2025-11-20T00:00:00Z", userCreatedAt: "2025-11-18T00:00:00Z" }));
    expect(evaluateStargazers(y, NOW).isSpam).toBe(true);
  });

  it("ignores invalid dates", () => {
    const s = [...sample(25, 0), { starredAt: "nope", userCreatedAt: "nope" }];
    expect(evaluateStargazers(s, NOW).sampled).toBe(25);
  });

  it("reuses verdicts for 7 days", () => {
    const v = evaluateStargazers(sample(0, 30), new Date(NOW.getTime() - 6 * DAY));
    expect(verdictIsFresh(v, NOW)).toBe(true);
    const old = evaluateStargazers(sample(0, 30), new Date(NOW.getTime() - 8 * DAY));
    expect(verdictIsFresh(old, NOW)).toBe(false);
    expect(verdictIsFresh(undefined, NOW)).toBe(false);
  });
});
