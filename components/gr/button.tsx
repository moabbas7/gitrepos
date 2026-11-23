import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** GitRepos button — DESIGN.md §4. Hover lift is CSS-only (.gr-lift). */
export const grButton = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-sans font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "gr-lift border-[length:var(--gr-frame-width)] border-[#02030a] text-white shadow-hard [background:var(--gr-grad-strong)]",
        secondary: "gr-frame gr-lift text-ink hover:bg-surface-hover",
        ghost: "text-body transition-colors hover:bg-surface-hover hover:text-ink",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof grButton> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(grButton({ variant, size }), className)} {...props} />;
}
