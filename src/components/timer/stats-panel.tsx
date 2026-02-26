"use client"

import { useState, useEffect, useCallback } from "react"
import { BarChart3 } from "lucide-react"
import { formatTimeMs } from "@/lib/timer/averages"
import type { SessionStats } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TimeDistributionChart } from "@/components/shared/time-distribution-chart"
import { TimeTrendChart } from "@/components/shared/time-trend-chart"
import { getSolvesByEvent } from "@/lib/actions/timer"
import type { Solve } from "@/lib/types"

type StatsPanelProps = {
  stats: SessionStats
  mode: "normal" | "comp_sim"
  currentCompSimProgress?: { current: number; total: number }
  solves?: Solve[]
  event?: string
}

type ChartScope = "session" | "all"

export function StatsPanel({
  stats,
  mode,
  currentCompSimProgress,
  solves = [],
  event,
}: StatsPanelProps) {
  const [showCharts, setShowCharts] = useState(false)
  const [chartScope, setChartScope] = useState<ChartScope>("session")
  const [allTimeSolves, setAllTimeSolves] = useState<Solve[] | null>(null)
  const [loadingAllTime, setLoadingAllTime] = useState(false)

  const fetchAllTime = useCallback(async () => {
    if (!event) return
    setLoadingAllTime(true)
    const result = await getSolvesByEvent(event)
    setAllTimeSolves(result.solves)
    setLoadingAllTime(false)
  }, [event])

  // Fetch all-time solves when switching to "all" scope
  useEffect(() => {
    if (chartScope === "all" && allTimeSolves === null) {
      fetchAllTime()
    }
  }, [chartScope, allTimeSolves, fetchAllTime])

  // Reset all-time cache when event changes
  useEffect(() => {
    setAllTimeSolves(null)
    setChartScope("session")
  }, [event])

  const chartSolves = chartScope === "session" ? solves : (allTimeSolves ?? [])

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Session Stats
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {stats.count} solve{stats.count !== 1 ? "s" : ""}
          </span>
          {solves.length > 0 && (
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={cn(
                "p-1 rounded hover:bg-secondary/80 transition-colors",
                showCharts && "bg-secondary text-foreground"
              )}
              title={showCharts ? "Hide charts" : "Show charts"}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {mode === "comp_sim" && currentCompSimProgress && (
        <div className="rounded-md bg-secondary/50 p-2 text-center">
          <span className="text-xs text-muted-foreground">Current Ao5: </span>
          <span className="text-sm font-mono font-medium tabular-nums">
            Solve {currentCompSimProgress.current}/
            {currentCompSimProgress.total}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Best" value={stats.best} />
        <StatCard label="Worst" value={stats.worst} />
        <StatCard label="Mean" value={stats.mean} />
        <StatCard
          label="Ao5"
          value={stats.ao5}
          highlight={stats.count >= 5}
        />
        <StatCard
          label="Ao12"
          value={stats.ao12}
          highlight={stats.count >= 12}
        />
        <StatCard label="Ao50" value={stats.ao50} />
        <StatCard label="Ao100" value={stats.ao100} />
        <StatCard label="Best Ao5" value={stats.bestAo5} accent />
        <StatCard label="Best Ao12" value={stats.bestAo12} accent />
      </div>

      {/* Charts section */}
      {showCharts && (
        <div className="space-y-3 pt-1">
          <div className="flex gap-1">
            <Button
              variant={chartScope === "session" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setChartScope("session")}
            >
              This Session
            </Button>
            <Button
              variant={chartScope === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setChartScope("all")}
            >
              All Time
            </Button>
          </div>

          {loadingAllTime && chartScope === "all" ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Loading solve data...
            </p>
          ) : (
            <>
              <TimeDistributionChart solves={chartSolves} />
              <TimeTrendChart solves={chartSolves} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
  accent,
}: {
  label: string
  value: number | null
  highlight?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/50 bg-card p-2",
        highlight && "border-primary/30",
        accent && "border-accent/30"
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-sm tabular-nums font-medium",
          value === null && "text-muted-foreground/50"
        )}
      >
        {value !== null ? formatTimeMs(value) : "–"}
      </p>
    </div>
  )
}
