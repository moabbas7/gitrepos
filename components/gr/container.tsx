import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** DESIGN.md §5: max 1120px, 16px gutter on mobile, 24px from md. */
export function Container({ as: Tag = "div", className, children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return <Tag className={cn("mx-auto w-full max-w-[1120px] px-4 md:px-6", className)}>{children}</Tag>;
}
