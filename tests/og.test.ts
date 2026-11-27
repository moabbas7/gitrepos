import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOgSafeChar, ogSafe, ogSafeText } from "@/lib/og/text";
import { buildSite } from "@/lib/site-data/load";
import { EMPTY_SNAPSHOT, type SiteSnapshot, type SnapshotRepo } from "@/lib/site-data/types";
import { emitOg, emitStatic, OG_FALLBACK, ogJobs, type OgJob } from "../scripts/emit-static";

const NOW = new Date("2026-11-27T10:00:00Z");
const PNG = (tag: string) => Buffer.from(`png:${tag}`);

function repo(id: number, description: string | null): SnapshotRepo {
  return {
    id, owner: `o${id}`, name: `r${id}`, description, language: "Rust", topics: [], stars: 1000 + id, forks: 0, issues: 0, watchers: 0,
    licence: null, homepage: null, avatarUrl: "", createdAt: null, pushedAt: null, summary: null, summarySource: null, gained24h: 0,
    gained7d: 5, gained30d: 5, isArchived: false, firstPublishedAt: null, reason: "fill",
  };
}

const site = (descs: (string | null)[]) =>
  buildSite({ ...EMPTY_SNAPSHOT, generatedAt: NOW.toISOString(), repos: descs.map((d, i) => repo(i + 1, d)) } as SiteSnapshot, NOW);

describe("OG text sanitizer", () => {
  it("keeps Latin text and drops scripts/emoji the bundled fonts can't render", () => {
    expect(ogSafe("Café — naïve façade™ …")).toBe("Café — naïve façade™ …");
    expect(ogSafe("🚀 Blazing fast bundler ✨ with zero config 🔥")).toBe("Blazing fast bundler with zero config");
    expect(ogSafe("✯ Star-studded CLI ↦ maps your shell history")).toBe("Star-studded CLI maps your shell history");
    expect(isOgSafeChar("م".codePointAt(0)!)).toBe(false);
    expect(isOgSafeChar(0x200f)).toBe(false); // RTL mark
  });

  it("drops a description that is mostly non-Latin instead of rendering fragments", () => {
    expect(ogSafeText("مكتبة سريعة لمعالجة النصوص العربية")).toBeNull();
    expect(ogSafeText("高性能的向量数据库，支持实时检索")).toBeNull();
    expect(ogSafeText("🦀")).toBeNull();
    expect(ogSafeText("Fast Rust HTTP server 🦀")).toBe("Fast Rust HTTP server");
    expect(ogSafeText(null)).toBeNull();
  });

  it("feeds only safe text into OG jobs", () => {
    const jobs = ogJobs(site(["مكتبة سريعة لمعالجة النصوص العربية", "✯ CLI ↦ maps"]));
    const repos = jobs.filter((j): j is Extract<OgJob, { kind: "repo" }> => j.kind === "repo");
    expect(repos[0].props.description).toBeNull();
    expect(repos[1].props.description).toBe("CLI maps");
    for (const j of jobs) for (const ch of JSON.stringify(j.props)) expect(isOgSafeChar(ch.codePointAt(0)!) || ch === "\n").toBe(true);
  });
});

describe("OG generation never blocks the deploy", () => {
  let out: string;
  let cache: string;
  beforeEach(() => {
    out = mkdtempSync(join(tmpdir(), "gr-og-out-"));
    cache = mkdtempSync(join(tmpdir(), "gr-og-cache-"));
  });
  afterEach(() => {
    rmSync(out, { recursive: true, force: true });
    rmSync(cache, { recursive: true, force: true });
  });

  async function run(s: ReturnType<typeof site>, render: (j: OgJob) => Promise<Buffer>, opts: { maxRenders?: number; timeBudgetMs?: number; renderTimeoutMs?: number } = {}) {
    // emitStatic sets the output dir; skip its own OG pass and call emitOg directly with options.
    await emitStatic(s, { og: false, out });
    return emitOg(s, { cacheDir: cache, render, log: () => {}, ...opts });
  }

  it("uses the shared repo image when a render throws or hangs, and still writes every file", async () => {
    const s = site(["ok", "boom", "hang", "ok too"]);
    const stats = await run(
      s,
      async (j) => {
        if (j.out.includes("o2__r2")) throw new Error("lookupType: 5 - substFormat: 3 is not yet supported");
        if (j.out.includes("o3__r3")) return new Promise<Buffer>(() => {}); // never resolves
        return PNG(j.out);
      },
      { renderTimeoutMs: 50 },
    );
    expect(stats.failed).toBe(2);
    for (const j of ogJobs(s)) expect(existsSync(join(out, j.out))).toBe(true);
    const shared = readFileSync(join(out, OG_FALLBACK.repo)).toString();
    expect(readFileSync(join(out, "og/repo/o2__r2.png")).toString()).toBe(shared);
    expect(readFileSync(join(out, "og/repo/o3__r3.png")).toString()).toBe(shared);
    expect(readFileSync(join(out, "og/repo/o1__r1.png")).toString()).toBe("png:og/repo/o1__r1.png");
    // Failures aren't cached, so they're retried next run.
    expect(readdirSync(cache)).toHaveLength(stats.rendered);
  });

  it("caps renders per run, defers the rest to the shared image, and catches up next run", async () => {
    const s = site(["a", "b", "c", "d", "e"]);
    const render = vi.fn(async (j: OgJob) => PNG(j.out));
    const first = await run(s, render, { maxRenders: 4 });
    const pages = ogJobs(s).filter((j) => j.kind === "page").length;
    // The cap counts every render; the two shared images come first and are always attempted.
    expect(first.rendered).toBe(4);
    expect(first.deferred).toBe(pages + 5 - first.rendered);
    for (const j of ogJobs(s)) expect(existsSync(join(out, j.out))).toBe(true);

    const second = await run(s, render, { maxRenders: 1000 });
    expect(second.cached).toBe(first.rendered);
    expect(second.rendered).toBe(first.deferred);
    expect(second.deferred).toBe(0);
  });

  it("stops rendering when the time budget is spent", async () => {
    const s = site(["a", "b"]);
    const stats = await run(s, async (j) => PNG(j.out), { timeBudgetMs: -1 });
    expect(stats.rendered).toBe(2); // only the two shared images
    expect(stats.deferred).toBe(stats.total - 2);
  });

  it("falls back to the committed image if even the shared images fail", async () => {
    const s = site(["a"]);
    const stats = await run(s, async () => {
      throw new Error("renderer unavailable");
    });
    expect(stats.rendered).toBe(0);
    const committed = readFileSync("lib/og/fallback.png");
    expect(readFileSync(join(out, "og/repo/o1__r1.png")).equals(committed)).toBe(true);
    expect(readFileSync(join(out, OG_FALLBACK.page)).equals(committed)).toBe(true);
  });

  it("renders real images for non-Latin descriptions without downloading fonts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const s = site(["مكتبة سريعة لمعالجة النصوص العربية", "✯ Star-studded CLI ↦ maps your shell history", "高性能的向量数据库"]);
    await emitStatic(s, { og: false, out });
    const stats = await emitOg(s, { cacheDir: cache, log: () => {}, maxRenders: 1000 });
    expect(stats.failed).toBe(0);
    // next/og loads its WASM via data: URLs; what must never happen is a network font download.
    const network = fetchSpy.mock.calls.map((c) => String(c[0] instanceof Request ? c[0].url : c[0])).filter((u) => /^https?:/.test(u));
    expect(network).toEqual([]);
    const png = readFileSync(join(out, "og/repo/o1__r1.png"));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    fetchSpy.mockRestore();
  }, 60_000);
});
