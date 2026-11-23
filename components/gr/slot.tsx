import { cloneElement, isValidElement, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal `asChild` slot: merges className, style, event handlers and ref onto the single child.
 * Replaces radix-ui's Slot to keep the initial bundle small.
 */
export function Slot({
  children,
  ref,
  ...props
}: HTMLAttributes<HTMLElement> & { children?: ReactNode; ref?: Ref<HTMLElement> }) {
  if (!isValidElement(children)) return null;
  const child = children as ReactElement<Record<string, unknown>>;
  const merged: Record<string, unknown> = { ...props, ...child.props };
  for (const key of Object.keys(props)) {
    const ours = (props as Record<string, unknown>)[key];
    const theirs = child.props[key];
    if (/^on[A-Z]/.test(key) && typeof ours === "function" && typeof theirs === "function") {
      merged[key] = (...args: unknown[]) => {
        (theirs as (...a: unknown[]) => void)(...args);
        (ours as (...a: unknown[]) => void)(...args);
      };
    }
  }
  merged.className = cn(props.className, child.props.className as string | undefined);
  merged.style = { ...(props.style ?? {}), ...((child.props.style as object) ?? {}) };
  if (ref) merged.ref = ref;
  return cloneElement(child, merged);
}
