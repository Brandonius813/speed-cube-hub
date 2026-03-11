"use client"

import { ScrambleImage } from "@/components/timer/scramble-image"
import type { PaneContentProps } from "@/components/timer/panes/types"

export function PaneDraw({ context }: PaneContentProps) {
  return (
    <div className="h-full rounded-md border border-border/70 bg-muted/20 p-2">
      <ScrambleImage
        scramble={context.scramble}
        event={context.event}
        size={context.scramblePaneTextSize}
      />
    </div>
  )
}
