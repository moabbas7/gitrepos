import { cn } from "@/lib/utils";

/** white/4 block with a translated shimmer band (transform only). */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cn("gr-skeleton rounded-md", className)} />;
}

/** Same footprint as RepoCard, so swapping in real content causes no layout shift. */
export function RepoCardSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading repository" className={cn("gr-glass flex flex-col gap-3 rounded-2xl p-4 sm:p-5", className)}>
      <div className="flex items-start gap-3">
        <SkeletonBlock className="mt-1.5 h-3.5 w-7" />
        <SkeletonBlock className="size-8 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-1/2" />
          <SkeletonBlock className="h-4 w-4/5" />
        </div>
      </div>
      <div className="flex gap-1.5 pl-10 sm:pl-[4.75rem]">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
        <SkeletonBlock className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex items-center gap-4 pl-10 sm:pl-[4.75rem]">
        <SkeletonBlock className="h-4 w-16" />
        <SkeletonBlock className="h-4 w-12" />
        <SkeletonBlock className="h-6 w-24 rounded-full" />
        <SkeletonBlock className="ml-auto hidden h-7 w-24 sm:block" />
      </div>
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="gr-glass space-y-2 rounded-2xl p-5">
      <SkeletonBlock className="h-3 w-16" />
      <SkeletonBlock className="h-7 w-24" />
    </div>
  );
}
