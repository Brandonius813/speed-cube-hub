"use client"

import { cn } from "@/lib/utils"
import type { PaneContentProps, TimerPaneTextSize } from "@/components/timer/panes/types"

const SCRAMBLE_LABEL_SIZE_CLASSES: Record<TimerPaneTextSize, string> = {
  md: "text-[11px]",
  lg: "text-xs",
  xl: "text-[13px]",
}

const SCRAMBLE_VALUE_SIZE_CLASSES: Record<TimerPaneTextSize, string> = {
  md: "text-sm",
  lg: "text-base sm:text-lg",
  xl: "text-lg sm:text-xl",
}

export function PaneScrambleText({ context }: PaneContentProps) {
  const textSize = context.scramblePaneTextSize

  return (
    <div className="h-full rounded-md border border-border/70 bg-muted/20 p-3">
      <p
        className={cn(
          "mb-2 font-sans uppercase tracking-wide text-muted-foreground",
          SCRAMBLE_LABEL_SIZE_CLASSES[textSize]
        )}
      >
        Scramble
      </p>
      <p
        className={cn(
          "font-mono leading-relaxed break-words whitespace-pre-wrap text-foreground",
          SCRAMBLE_VALUE_SIZE_CLASSES[textSize]
        )}
      >
        {context.scramble}
      </p>
    </div>
  )
}
