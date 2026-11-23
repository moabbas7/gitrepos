import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Accent } from "@/lib/accents";
import type { SponsorCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "./badges";
import { SpotlightCard } from "./spotlight";

/**
 * Sponsor card shell: same glass frame + spotlight as RepoCard. Paid units are always labelled
 * "Sponsored" and use rel="sponsored nofollow". `accent` is accepted for compatibility (v2 has no
 * accent colours). Click tracking (/go/[id]) arrives in prompt 2.
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
  void accent;
  return (
    <SpotlightCard as="article" className={cn("flex items-start gap-3 rounded-2xl p-4", className)}>
      {sponsor.logoUrl ? (
        <Image
          src={sponsor.logoUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="size-10 shrink-0 rounded-xl border border-fg/8 bg-fg/6 object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-fg/8 bg-fg/6 font-heading text-base font-semibold text-fg"
        >
          {sponsor.company.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="m-0 font-sans text-[15px] font-medium text-fg">
            <a
              href={sponsor.url}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
            >
              {sponsor.company}
            </a>
          </h3>
          <Badge kind="sponsored" />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-fg/64">{sponsor.tagline}</p>
      </div>
    </SpotlightCard>
  );
}

/** Empty placement: dashed hairline frame inviting advertisers. */
export function SponsorCardEmpty({ href = "/promote?tab=advertise", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[92px] items-center gap-3 rounded-2xl border border-dashed border-fg/10 p-4 text-fg/50 transition-colors hover:border-fg/16 hover:bg-fg/3 hover:text-fg",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-fg/16">
        <Plus className="size-4" aria-hidden />
      </span>
      <span>
        <span className="block text-[15px] font-medium text-fg">Advertise here</span>
        <span className="block text-sm">Put your product in front of developers</span>
      </span>
    </Link>
  );
}
