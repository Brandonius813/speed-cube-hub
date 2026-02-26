"use client"

import { useState, useEffect, useCallback } from "react"
import { BarChart3 } from "lucide-react"
import {
  formatTimeMs,
  getEffectiveTime,
  computeAoN,
  bestAoN,
  computeMoN,
  computeAoNStdDev,
  computeBPA,
  computeWPA,
} from "@/lib/timer/averages"
import type { SessionStats } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TimeDistributionChart } from "@/components/shared/time-distribution-chart"
import { TimeTrendChart } from "@/components/shared/time-trend-chart"
import { getSolvesByEvent } from "@/lib/actions/timer"
import type { Solve } from "@/lib/types"

export const DEFAULT_STAT_INDICATORS = "mo3 ao5 ao12 ao50 ao100"

type StatsPanelProps = {
  stats: SessionStats
  mode: "normal" | "comp_sim"
  currentCompSimProgress?: { current: number; total: number }
  solves?: Solve[]
  event?: string
  statIndicators?: string
  onStatClick?: (statLabel: string, column: "current" | "best") => void
}

type ChartScope = "session" | "all"

type StatRow = {
  label: string
  current: number | null
  best: number | null
  sigma: number | null
}

function computeSessionStdDev(solves: Solve[]): number | null {
  const times = solves.map(getEffectiveTime).filter((t) => t !== Infinity)
  if (times.length < 2) return null
  const mean = times.reduce((a, b) => a + b, 0) / times.length
  const variance =
    times.reduce((acc, t) => acc + (t - mean) ** 2, 0) / (times.length - 1)
  return Math.round(Math.sqrt(variance))
}

function bestMoN(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null
  let best: number | null = null
  for (let i = n; i <= solves.length; i++) {
    const window = solves.slice(i - n, i)
    const times = window.map(getEffectiveTime)
    if (times.some((t) => t === Infinity)) continue
    const avg = Math.round(
      times.reduce((acc, t) => acc + t, 0) / times.length
    )
    if (best === null || avg < best) best = avg
  }
  return best
}

function moNStdDev(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null
  const window = solves.slice(-n)
  const times = window.map(getEffectiveTime).filter((t) => t !== Infinity)
  if (times.length < 2) return null
  const mean = times.reduce((a, b) => a + b, 0) / times.length
  const variance =
    times.reduce((acc, t) => acc + (t - mean) ** 2, 0) / (times.length - 1)
  return Math.round(Math.sqrt(variance))
}

/**
 * Parse a stat indicators string (e.g., "mo3 ao5 ao12 ao50 ao100") into
 * an array of { type: "ao" | "mo", n: number } entries.
 * Invalid tokens are silently ignored.
 */
function parseIndicators(input: string): { type: "ao" | "mo"; n: number }[] {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => {
      const match = token.match(/^(ao|mo)(\d+)$/)
      if (!match) return null
      const n = parseInt(match[2], 10)
      if (n < 2 || n > 10000) return null
      return { type: match[1] as "ao" | "mo", n }
    })
    .filter((x): x is { type: "ao" | "mo"; n: number } => x !== null)
}

export function StatsPanel({
  stats,
  mode,
  currentCompSimProgress,
  solves = [],
  event,
  statIndicators = DEFAULT_STAT_INDICATORS,
  onStatClick,
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

  // Build stat rows dynamically from user's configured indicators
  const indicators = parseIndicators(statIndicators)

  const statRows: StatRow[] = [
    // Single is always first
    { label: "single", current: stats.best, best: stats.best, sigma: null },
    // Dynamic rows from user config
    ...indicators.map((ind) => {
      const label = `${ind.type}${ind.n}`
      if (ind.type === "mo") {
        return {
          label,
          current: computeMoN(solves, ind.n),
          best: bestMoN(solves, ind.n),
          sigma: moNStdDev(solves, ind.n),
        }
      }
      // ao type
      return {
        label,
        current: computeAoN(solves, ind.n),
        best: bestAoN(solves, ind.n),
        sigma: computeAoNStdDev(solves, ind.n),
      }
    }),
  ]

  const sessionStdDev = computeSessionStdDev(solves)

  // BPA/WPA for the smallest ao indicator when window is incomplete
  const smallestAo = indicators.find((i) => i.type === "ao")
  const bpaN = smallestAo && solves.length > 0 && solves.length < smallestAo.n
    ? computeBPA(solves, smallestAo.n) : null
  const wpaN = smallestAo && solves.length > 0 && solves.length < smallestAo.n
    ? computeWPA(solves, smallestAo.n) : null
  const bpaWpaLabel = smallestAo ? `ao${smallestAo.n}` : ""

  return (
    <div className="p-2 space-y-1.5">
      {/* Header: solve count + session mean + session σ */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {stats.count} solve{stats.count !== 1 ? "s" : ""}
          </span>
          {stats.mean !== null && (
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              μ {formatTimeMs(stats.mean)}
            </span>
          )}
          {sessionStdDev !== null && (
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              σ {formatTimeMs(sessionStdDev)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
        <div className="rounded-md bg-secondary/50 px-2 py-1 text-center">
          <span className="text-xs text-muted-foreground">Ao5: </span>
          <span className="text-xs font-mono font-medium tabular-nums">
            {currentCompSimProgress.current}/{currentCompSimProgress.total}
          </span>
        </div>
      )}

      {/* csTimer-style stats table: label | current | best | σ */}
      <table className="w-full text-xs font-mono tabular-nums">
        <thead>
          <tr className="text-muted-foreground/70">
            <th className="text-left font-normal py-0.5 px-1 w-10"></th>
            <th className="text-right font-normal py-0.5 px-1">current</th>
            <th className="text-right font-normal py-0.5 px-1">best</th>
            <th className="text-right font-normal py-0.5 px-1 w-14">σ</th>
          </tr>
        </thead>
        <tbody>
          {statRows.map((row) => {
            const isBestCurrent =
              row.best !== null && row.current !== null && row.best === row.current
            return (
              <tr key={row.label}>
                <td className="text-left text-muted-foreground py-0.5 px-1">
                  {row.label}
                </td>
                <td
                  className="text-right py-0.5 px-1 cursor-pointer hover:bg-secondary/30 transition-colors rounded"
                  onClick={() => row.current !== null && onStatClick?.(row.label, "current")}
                >
                  <StatValue value={row.current} />
                </td>
                <td
                  className="text-right py-0.5 px-1 cursor-pointer hover:bg-secondary/30 transition-colors rounded"
                  onClick={() => row.best !== null && onStatClick?.(row.label, "best")}
                >
                  <StatValue value={row.best} isBest={isBestCurrent} />
                </td>
                <td className="text-right py-0.5 px-1">
                  <StatValue value={row.sigma} muted />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* BPA / WPA for smallest ao when window is incomplete */}
      {(bpaN !== null || wpaN !== null) && (
        <div className="flex items-center gap-3 px-1 text-xs font-mono tabular-nums text-muted-foreground/60">
          {bpaN !== null && <span>BPA({bpaWpaLabel}): {formatTimeMs(bpaN)}</span>}
          {wpaN !== null && <span>WPA({bpaWpaLabel}): {formatTimeMs(wpaN)}</span>}
        </div>
      )}

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

function StatValue({ value, isBest, muted }: { value: number | null; isBest?: boolean; muted?: boolean }) {
  if (value === null) {
    return <span className="text-muted-foreground/30">-</span>
  }
  return (
    <span className={cn(isBest && "text-green-400", muted && "text-muted-foreground/60")}>
      {formatTimeMs(value)}
    </span>
  )
}
