"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { GitHubIcon } from "./brand-icons";

/** On a 404 under /repo/<owner>/<name>, points to the repository on GitHub (pages retired from the build). */
export function parseRepoPath(pathname: string): { owner: string; name: string } | null {
  const m = pathname.match(/^\/repo\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/);
  return m ? { owner: decodeURIComponent(m[1]), name: decodeURIComponent(m[2]) } : null;
}

export function RetiredRepo() {
  const [repo, setRepo] = useState<{ owner: string; name: string } | null>(null);
  useEffect(() => {
    // Reads the URL after hydration (the 404 page is prerendered once for every path).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRepo(parseRepoPath(window.location.pathname));
  }, []);
  return (
    <div className="min-h-[136px]">
      {repo && (
        <div className="gr-glass space-y-3 rounded-2xl p-5">
          <p className="text-[15px] leading-relaxed text-fg/64">
            We no longer keep a page for <span className="font-mono text-fg">{`${repo.owner}/${repo.name}`}</span>. Older pages are retired when
            they stop trending. The repository itself is on GitHub:
          </p>
          <a
            href={`https://github.com/${repo.owner}/${repo.name}`}
            rel="nofollow noopener"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-fg/10 px-4 font-mono text-[13px] text-fg transition-colors hover:border-fg/16 hover:bg-fg/6"
          >
            <GitHubIcon className="size-4" />
            github.com/{repo.owner}/{repo.name}
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </div>
      )}
    </div>
  );
}
