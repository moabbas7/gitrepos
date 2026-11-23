import { ArrowUpRight, GitFork, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { compactNumber, type Period } from "@/lib/format";
import type { RepoCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "./badges";
import { GrowthPill, LanguageChip, RepoName, TopicTag } from "./chips";
import { Sparkline } from "./sparkline";
import { SpotlightCard } from "./spotlight";

/**
 * Repo card (DESIGN.md §4): glass frame, 1px hairline, cursor spotlight, gradient border on hover.
 * #1 gets a slowly rotating gradient border + the TRENDING badge. Whole card is a stretched link.
 * Wrap lists in <Reveal stagger> for the scroll fade-up (sparklines draw in at the same time).
 */
export function RepoCard({
  repo,
  period = "today",
  className,
}: {
  repo: RepoCardData;
  period?: Period;
  className?: string;
}) {
  const isFirst = repo.rank === 1;
  const href = `/repo/${repo.owner}/${repo.name}`;
  const ghUrl = `https://github.com/${repo.owner}/${repo.name}`;

  return (
    <SpotlightCard as="article" ringHover={!isFirst} className={cn("flex flex-col gap-3 rounded-2xl p-4 sm:p-5", className)}>
      {isFirst && <span aria-hidden className="gr-ring-spin" />}
      <div className="flex items-start gap-3">
        <span className="gr-num w-7 shrink-0 pt-1.5 text-xs text-fg/50">
          <span className="sr-only">Rank </span>
          {String(repo.rank).padStart(2, "0")}
        </span>
        <Image
          src={repo.avatarUrl}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="size-8 shrink-0 rounded-lg border border-fg/8 bg-fg/6"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="m-0 text-base">
              <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
                <RepoName owner={repo.owner} name={repo.name} />
              </Link>
            </h3>
            {isFirst && <Badge kind="trending" />}
            {repo.isNew && <Badge kind="new" />}
            {repo.isHot && <Badge kind="hot" />}
          </div>
          {repo.description && <p className="mt-1 line-clamp-1 text-sm text-fg/64">{repo.description}</p>}
        </div>
        <a
          href={ghUrl}
          target="_blank"
          rel="noopener"
          className="relative z-10 -m-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-fg/50 transition-colors hover:bg-fg/6 hover:text-fg"
          aria-label={`Open ${repo.owner}/${repo.name} on GitHub`}
          title="View on GitHub"
        >
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </div>

      {repo.topics.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1.5 pl-10 sm:pl-[4.75rem]">
          {repo.topics.slice(0, 4).map((t, i) => (
            <TopicTag key={t} topic={t} className={cn(i >= 2 && "hidden sm:inline-flex", i >= 3 && "sm:hidden md:inline-flex")} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-10 sm:pl-[4.75rem]">
        <LanguageChip language={repo.language} />
        <span className="gr-num inline-flex items-center gap-1 text-xs text-fg/50" title={`${repo.stars} stars`}>
          <Star className="size-3.5" aria-hidden />
          <span className="sr-only">Stars: </span>
          {compactNumber(repo.stars)}
        </span>
        <span className="gr-num inline-flex items-center gap-1 text-xs text-fg/50" title={`${repo.forks} forks`}>
          <GitFork className="size-3.5" aria-hidden />
          <span className="sr-only">Forks: </span>
          {compactNumber(repo.forks)}
        </span>
        <GrowthPill gained={repo.gained} period={period} />
        <Sparkline values={repo.spark} className="ml-auto hidden sm:block" />
      </div>
    </SpotlightCard>
  );
}
