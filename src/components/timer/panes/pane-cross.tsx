"use client"

import { CrossSolverPanel } from "@/components/timer/cross-solver-panel"
import type { PaneContentProps } from "@/components/timer/panes/types"

export function PaneCross({ context }: PaneContentProps) {
  return (
    <div className="h-full rounded-md border border-border/70 bg-muted/20 p-2">
      {context.canShowCrossTrainer ? (
        <CrossSolverPanel scramble={context.scramble} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Cross trainer is available for 3x3 and 3x3 OH once a scramble is ready.
        </p>
      )}
    </div>
  )
}
