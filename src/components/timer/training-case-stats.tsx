"use client"

import { useMemo, useState } from "react"
import { BarChart3, ArrowDown, ArrowUp, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTimeMs, getEffectiveTime } from "@/lib/timer/averages"
import { getCaseSet, type AlgorithmCaseSet } from "@/lib/timer/algorithm-cases"
import type { Solve } from "@/lib/types"

type CaseStat = {
  caseIndex: number
  caseName: string
  count: number
  bestMs: number
  meanMs: number
  times: number[]
}

type SortField = "name" | "count" | "best" | "mean"
type SortDir = "asc" | "desc"

type TrainingCaseStatsProps = {
  /** Map of solve ID → case index, tracked during session */
  solveCaseMap: Map<string, number>
  /** All solves in the current session */
  solves: Solve[]
  /** The cstimer type to get case names from */
  cstimerType: string
}

/**
 * Training Case Statistics panel.
 * Shows per-algorithm-case performance for the current session.
 * Only visible when using a training scramble type with case filtering.
 */
export function TrainingCaseStats({
  solveCaseMap,
  solves,
  cstimerType,
}: TrainingCaseStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [sortField, setSortField] = useState<SortField>("mean")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const caseSet = getCaseSet(cstimerType)

  const caseStats = useMemo(() => {
    if (!caseSet) return []

    // Group solves by case index
    const grouped = new Map<number, number[]>()
    for (const solve of solves) {
      const caseIdx = solveCaseMap.get(solve.id)
      if (caseIdx === undefined) continue
      if (solve.penalty === "DNF") continue

      const effectiveMs = getEffectiveTime(solve)
      if (effectiveMs === Infinity) continue

      const arr = grouped.get(caseIdx) ?? []
      arr.push(effectiveMs)
      grouped.set(caseIdx, arr)
    }

    // Build stat objects
    const stats: CaseStat[] = []
    for (const [caseIdx, times] of grouped) {
      const caseDef = caseSet.cases.find((c) => c.index === caseIdx)
      if (!caseDef) continue

      const bestMs = Math.min(...times)
      const meanMs = times.reduce((a, b) => a + b, 0) / times.length

      stats.push({
        caseIndex: caseIdx,
        caseName: caseDef.name,
        count: times.length,
        bestMs,
        meanMs,
        times,
      })
    }

    return stats
  }, [solves, solveCaseMap, caseSet])

  const sortedStats = useMemo(() => {
    const sorted = [...caseStats]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name": cmp = a.caseName.localeCompare(b.caseName); break
        case "count": cmp = a.count - b.count; break
        case "best": cmp = a.bestMs - b.bestMs; break
        case "mean": cmp = a.meanMs - b.meanMs; break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [caseStats, sortField, sortDir])

  // Don't render if no case data exists
  if (!caseSet || caseStats.length === 0) return null

  // Find weakest and strongest cases
  const weakest = caseStats.length > 1
    ? caseStats.reduce((a, b) => (a.meanMs > b.meanMs ? a : b))
    : null
  const strongest = caseStats.length > 1
    ? caseStats.reduce((a, b) => (a.meanMs < b.meanMs ? a : b))
    : null

  // Max mean for bar chart scaling
  const maxMean = Math.max(...caseStats.map((s) => s.meanMs))

  const totalSolves = caseStats.reduce((sum, s) => sum + s.count, 0)
  const casesAttempted = caseStats.length
  const overallMean = totalSolves > 0
    ? caseStats.reduce((sum, s) => sum + s.meanMs * s.count, 0) / totalSolves
    : 0

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir(field === "name" ? "asc" : "desc")
    }
  }

  return (
    <div className="border-t border-border">
      {/* Collapse toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
          <span>Case Stats</span>
          <span className="text-xs text-muted-foreground">
            {casesAttempted} cases · {totalSolves} solves
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {isExpanded ? "▾" : "▸"}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Summary row */}
          <div className="flex gap-3 text-xs">
            {strongest && (
              <div className="flex items-center gap-1 text-green-400">
                <Trophy className="h-3 w-3" />
                <span>Best: {strongest.caseName}</span>
                <span className="font-mono">{formatTimeMs(strongest.meanMs)}</span>
              </div>
            )}
            {weakest && (
              <div className="flex items-center gap-1 text-red-400">
                <ArrowDown className="h-3 w-3" />
                <span>Weakest: {weakest.caseName}</span>
                <span className="font-mono">{formatTimeMs(weakest.meanMs)}</span>
              </div>
            )}
          </div>

          {/* Visual bar chart */}
          <div className="space-y-1">
            {sortedStats.map((stat) => {
              const barWidth = maxMean > 0 ? (stat.meanMs / maxMean) * 100 : 0
              const isWeakest = weakest?.caseIndex === stat.caseIndex
              const isStrongest = strongest?.caseIndex === stat.caseIndex

              return (
                <div key={stat.caseIndex} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "w-14 text-right font-medium shrink-0",
                    isWeakest && "text-red-400",
                    isStrongest && "text-green-400"
                  )}>
                    {stat.caseName}
                  </span>
                  <div className="flex-1 h-4 bg-secondary/30 rounded overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded transition-all duration-300",
                        isWeakest ? "bg-red-500/40" :
                        isStrongest ? "bg-green-500/40" :
                        "bg-cyan-500/30"
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute inset-y-0 right-1 flex items-center font-mono text-[10px] text-muted-foreground">
                      {formatTimeMs(stat.meanMs)}
                    </span>
                  </div>
                  <span className="w-6 text-right text-muted-foreground shrink-0">
                    {stat.count}×
                  </span>
                </div>
              )
            })}
          </div>

          {/* Sort controls */}
          <div className="flex gap-1 pt-1">
            {(["name", "mean", "best", "count"] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                  sortField === field
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                )}
              >
                {field === "name" ? "Name" : field === "mean" ? "Mean" : field === "best" ? "Best" : "Count"}
                {sortField === field && (
                  sortDir === "asc" ? " ↑" : " ↓"
                )}
              </button>
            ))}
          </div>

          {/* Overall mean */}
          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            Overall mean: <span className="font-mono">{formatTimeMs(overallMean)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
