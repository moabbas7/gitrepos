import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { accentFor, accentVar, type Accent } from "@/lib/accents";
import type { SponsorCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "./badges";

/**
 * Sponsor card shell. Paid units are always labelled "Sponsored" and use
 * rel="sponsored nofollow". Click tracking (/go/[id]) arrives in prompt 2.
 */
export function SponsorCard({
  sponsor,
  accent,
  className,
}: {
  sponsor: SponsorCardData;
  accent?: Accent;
  className?: string;
}) {
  const color = accentVar(accent ?? accentFor(sponsor.company));
  return (
    <article
      className={cn("gr-lift relative flex items-start gap-3 rounded-md bg-surface p-4 shadow-hard", className)}
      style={{ border: `var(--gr-frame-width) solid color-mix(in oklab, ${color} 60%, transparent)` }}
    >
      {sponsor.logoUrl ? (
        <Image
          src={sponsor.logoUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="size-10 shrink-0 rounded-sm border border-hairline bg-surface-raised object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-sm font-heading text-lg font-bold"
          style={{ color, backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
        >
          {sponsor.company.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="m-0 font-sans text-[15px] font-semibold text-ink">
            <a
              href={sponsor.url}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none"
            >
              {sponsor.company}
            </a>
          </h3>
          <Badge kind="sponsored" />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-body">{sponsor.tagline}</p>
      </div>
    </article>
  );
}

/** Empty placement: dashed frame inviting advertisers. */
export function SponsorCardEmpty({ href = "/promote?tab=advertise", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[92px] items-center gap-3 rounded-md border-[length:var(--gr-frame-width)] border-dashed border-frame p-4 text-mute transition-colors hover:bg-surface-hover hover:text-ink",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-frame">
        <Plus className="size-4" aria-hidden />
      </span>
      <span>
        <span className="block text-[15px] font-semibold text-ink">Advertise here</span>
        <span className="block text-sm">Put your product in front of developers</span>
      </span>
    </Link>
  );
}
