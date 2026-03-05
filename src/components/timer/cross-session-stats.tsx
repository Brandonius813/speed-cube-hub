"use client"

import { useMemo, useState } from "react"
import { formatTimeMs, getEffectiveTime, computeAoN, bestAoN } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import type { Solve } from "@/lib/types"

type DateRange = "7d" | "30d" | "90d" | "all"

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  all: "All",
}

function filterByDateRange(solves: Solve[], range: DateRange): Solve[] {
  if (range === "all") return solves
  const now = Date.now()
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return solves.filter((s) => new Date(s.solved_at).getTime() >= cutoff)
}

function getSessionNames(solves: Solve[]): Map<string, string> {
  // Build a map of solve_session_id → display name from solve data
  // Since we don't have session names here, we group by solve_session_id
  // and label them numerically
  const ids = new Set<string>()
  for (const s of solves) {
    if (s.solve_session_id) ids.add(s.solve_session_id)
  }
  const map = new Map<string, string>()
  let i = 1
  for (const id of ids) {
    map.set(id, `Session ${i}`)
    i++
  }
  return map
}

type CrossSessionStatsProps = {
  solves: Solve[]
  sessionNames?: Map<string, string>
}

export function CrossSessionStats({ solves, sessionNames }: CrossSessionStatsProps) {
  const [dateRange, setDateRange] = useState<DateRange>("all")
  const [sessionFilter, setSessionFilter] = useState<string | null>(null)

  // Build session list from solves
  const sessions = useMemo(() => {
    const names = sessionNames ?? getSessionNames(solves)
    const ids = new Set<string>()
    for (const s of solves) {
      if (s.solve_session_id) ids.add(s.solve_session_id)
    }
    return Array.from(ids).map((id) => ({
      id,
      name: names.get(id) ?? id.slice(0, 8),
    }))
  }, [solves, sessionNames])

  const filteredSolves = useMemo(() => {
    let result = filterByDateRange(solves, dateRange)
    if (sessionFilter) {
      result = result.filter((s) => s.solve_session_id === sessionFilter)
    }
    return result
  }, [solves, dateRange, sessionFilter])

  // Compute aggregate stats
  const stats = useMemo(() => {
    const count = filteredSolves.length
    if (count === 0) return null

    const times = filteredSolves.map(getEffectiveTime)
    const validTimes = times.filter((t) => t !== Infinity)
    const best = validTimes.length > 0 ? Math.min(...validTimes) : null
    const mean =
      validTimes.length > 0
        ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
        : null
    const dnfCount = times.filter((t) => t === Infinity).length

    return {
      count,
      best,
      mean,
      dnfCount,
      bestAo5: bestAoN(filteredSolves, 5),
      bestAo12: bestAoN(filteredSolves, 12),
      currentAo5: computeAoN(filteredSolves, 5),
      currentAo12: computeAoN(filteredSolves, 12),
    }
  }, [filteredSolves])

  if (solves.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-xs text-muted-foreground font-medium px-1">
        Cross-Session Stats
      </h4>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {/* Date range filter */}
        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={cn(
              "px-2 py-0.5 text-[10px] rounded transition-colors",
              dateRange === range
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
            )}
          >
            {DATE_RANGE_LABELS[range]}
          </button>
        ))}

        {/* Session filter — only show if there are multiple sessions */}
        {sessions.length > 1 && (
          <>
            <span className="text-muted-foreground/30 text-[10px] self-center">|</span>
            <button
              onClick={() => setSessionFilter(null)}
              className={cn(
                "px-2 py-0.5 text-[10px] rounded transition-colors",
                sessionFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
              )}
            >
              All Sessions
            </button>
            {sessions.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => setSessionFilter(s.id)}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded transition-colors truncate max-w-[80px]",
                  sessionFilter === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                )}
                title={s.name}
              >
                {s.name}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Stats grid */}
      {stats ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-1 font-mono text-xs tabular-nums">
          <StatItem label="Total" value={`${stats.count}`} raw />
          <StatItem label="DNFs" value={`${stats.dnfCount}`} raw muted={stats.dnfCount === 0} />
          <StatItem label="Best" value={stats.best} />
          <StatItem label="Mean" value={stats.mean} />
          <StatItem label="Best Ao5" value={stats.bestAo5} />
          <StatItem label="Best Ao12" value={stats.bestAo12} />
          <StatItem label="Cur Ao5" value={stats.currentAo5} />
          <StatItem label="Cur Ao12" value={stats.currentAo12} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/50 px-1">No solves in this range</p>
      )}
    </div>
  )
}

function StatItem({
  label,
  value,
  raw,
  muted,
}: {
  label: string
  value: number | string | null
  raw?: boolean
  muted?: boolean
}) {
  const display =
    value === null
      ? "-"
      : raw
        ? String(value)
        : formatTimeMs(value as number)

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-[10px]">{label}</span>
      <span className={cn(muted && "text-muted-foreground/40")}>{display}</span>
    </div>
  )
}
