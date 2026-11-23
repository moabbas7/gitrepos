import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cn("gr-shimmer rounded-sm", className)} />;
}

/** Same footprint as RepoCard, so swapping in real content causes no layout shift. */
export function RepoCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading repository"
      className={cn("gr-frame flex flex-col gap-3 rounded-md p-4 sm:p-5", className)}
    >
      <div className="flex items-start gap-3">
        <SkeletonBlock className="mt-1.5 h-4 w-8" />
        <SkeletonBlock className="size-8" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-1/2" />
          <SkeletonBlock className="h-4 w-4/5" />
        </div>
      </div>
      <div className="flex gap-1.5 pl-11 sm:pl-[5.25rem]">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
        <SkeletonBlock className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex items-center gap-4 pl-11 sm:pl-[5.25rem]">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-4 w-12" />
        <SkeletonBlock className="h-6 w-24 rounded-full" />
        <SkeletonBlock className="ml-auto hidden h-7 w-24 sm:block" />
      </div>
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="gr-frame space-y-2 rounded-md p-4">
      <SkeletonBlock className="h-3 w-16" />
      <SkeletonBlock className="h-7 w-24" />
    </div>
  );
}
