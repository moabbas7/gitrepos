"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copies `text`; announces success to screen readers. Fixed width so the label swap causes no shift. */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: the text stays selectable */
        }
      }}
      className={cn(
        "gr-glass inline-flex h-10 min-w-[96px] items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-fg transition-colors hover:border-fg/16 hover:bg-fg/6",
        className,
      )}
    >
      {done ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      <span>{done ? "Copied" : label}</span>
      <span className="sr-only" aria-live="polite">
        {done ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
