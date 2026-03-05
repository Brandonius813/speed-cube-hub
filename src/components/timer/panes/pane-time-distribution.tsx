"use client"

import { TimeDistributionChart } from "@/components/shared/time-distribution-chart"
import type { PaneContentProps, TimerPaneScope } from "@/components/timer/panes/types"

export function PaneTimeDistribution({ pane, context, updatePaneOptions }: PaneContentProps) {
  const scope: TimerPaneScope = pane.options?.scope === "all" ? "all" : "session"
  const solves = scope === "all" ? context.chartSolvesAll : context.chartSolvesSession

  return (
    <div className="h-full min-h-0">
      <TimeDistributionChart
        solves={solves}
        scope={scope}
        onScopeChange={(nextScope) =>
          updatePaneOptions(pane.id, { ...pane.options, scope: nextScope })
        }
      />
    </div>
  )
}
