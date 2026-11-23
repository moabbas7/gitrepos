"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentProps, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "./slot";
import { allowsPointerFx } from "./use-fine-pointer";

/**
 * GitRepos button (DESIGN.md §4). Magnetic hover + press scale are transform-only (CSS vars on
 * .gr-magnetic); the primary glow animates opacity only. All disabled under reduced motion.
 */
export const grButton = cva(
  "gr-magnetic group relative isolate inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-medium disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The fill lives on a child layer so the glow can sit behind it inside the stacking
        // context created by the magnetic transform (asChild falls back to a direct fill).
        primary: "text-fg",
        secondary: "gr-glass text-fg transition-colors hover:border-fg/16 hover:bg-fg/6",
        ghost: "text-fg/64 transition-colors hover:bg-fg/6 hover:text-fg",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof grButton> & { asChild?: boolean };

const MAX_PULL = 6; // px

export function Button({ className, variant, size, asChild, children, onPointerMove, onPointerLeave, ...props }: ButtonProps) {
  const ref = useRef<HTMLElement | null>(null);
  const Comp = asChild ? Slot : "button";
  const v = variant ?? "primary";

  const move = (e: PointerEvent<HTMLElement>) => {
    onPointerMove?.(e as PointerEvent<HTMLButtonElement>);
    const el = ref.current;
    if (!el || !allowsPointerFx()) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.setProperty("--mag-x", `${(dx * MAX_PULL).toFixed(2)}px`);
    el.style.setProperty("--mag-y", `${(dy * MAX_PULL * 0.6).toFixed(2)}px`);
    el.setAttribute("data-magnet-active", "");
  };
  const leave = (e: PointerEvent<HTMLElement>) => {
    onPointerLeave?.(e as PointerEvent<HTMLButtonElement>);
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--mag-x");
    el.style.removeProperty("--mag-y");
    el.removeAttribute("data-magnet-active");
  };

  return (
    <Comp
      ref={ref as never}
      className={cn(
        grButton({ variant, size }),
        "[&:focus-visible>.gr-focus]:opacity-100",
        asChild && v === "primary" && "[background:var(--gr-grad-veiled)] focus-visible:outline-2 focus-visible:outline-g1",
        className,
      )}
      onPointerMove={move}
      onPointerLeave={leave}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {v === "primary" && (
            <>
              <span aria-hidden className="gr-glow" />
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full shadow-[inset_0_0_0_1px_rgb(250_250_250/0.16)] [background:var(--gr-grad-veiled)]"
              />
            </>
          )}
          <span aria-hidden className="gr-ring gr-focus rounded-full opacity-0 transition-opacity" style={{ inset: -3, padding: 2 }} />
          {children}
        </>
      )}
    </Comp>
  );
}
