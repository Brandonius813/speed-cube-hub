"use client"

import { TimeTrendChart } from "@/components/shared/time-trend-chart"
import type { PaneContentProps, TimerPaneScope } from "@/components/timer/panes/types"

export function PaneTimeTrend({ pane, context, updatePaneOptions }: PaneContentProps) {
  const scope: TimerPaneScope = pane.options?.scope === "all" ? "all" : "session"
  const solves = scope === "all" ? context.chartSolvesAll : context.chartSolvesSession
  const points = scope === "all" ? context.chartTrendAll : undefined

  return (
    <div className="h-full min-h-0">
      <TimeTrendChart
        solves={solves}
        points={points}
        statCols={context.statCols}
        scope={scope}
        embedded
        onScopeChange={(nextScope) =>
          updatePaneOptions(pane.id, { ...pane.options, scope: nextScope })
        }
        {...(scope === "all" ? { line1Label: "Daily Mean" } : {})}
      />
    </div>
  )
}
