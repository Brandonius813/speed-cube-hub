"use client"

import type { PaneContentProps } from "@/components/timer/panes/types"

export function PaneScrambleText({ context }: PaneContentProps) {
  return (
    <div className="h-full rounded-md border border-border/70 bg-muted/20 p-3">
      <p className="mb-2 text-[11px] font-sans uppercase tracking-wide text-muted-foreground">
        Scramble
      </p>
      <p className="font-mono text-sm leading-relaxed break-words text-foreground">
        {context.scramble}
      </p>
    </div>
  )
}
