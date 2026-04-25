import { format } from "date-fns"
import type { Solve } from "@/lib/types"
import type { DateRange, CustomDateRange } from "@/components/dashboard/filters"
import {
  computeAoNStdDev,
  computeSessionStats,
  getEffectiveTime,
  type SessionStats,
} from "@/lib/timer/averages"

export type RangeWindow = {
  fromIso: string | null
  toIso: string | null
}

export type RangeSummaryStats = SessionStats & {
  sessions: number
  dnfCount: number
  dnfRate: number
  ao5StdDev: number | null
  ao12StdDev: number | null
  firstSolveAt: string | null
  lastSolveAt: string | null
}

export function resolveRangeWindow(
  range: DateRange,
  custom: CustomDateRange | null,
): RangeWindow {
  if (range === "all") {
    return { fromIso: null, toIso: null }
  }

  if (range === "custom" && custom) {
    const from = new Date(custom.from)
    from.setHours(0, 0, 0, 0)
    const to = new Date(custom.to)
    to.setHours(23, 59, 59, 999)
    return { fromIso: from.toISOString(), toIso: to.toISOString() }
  }

  const now = new Date()

  if (range === "1y") {
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    return { fromIso: yearStart.toISOString(), toIso: null }
  }

  let days: number
  switch (range) {
    case "1d":
      days = 1
      break
    case "7d":
      days = 7
      break
    case "30d":
      days = 30
      break
    case "90d":
      days = 90
      break
    case "365d":
      days = 365
      break
    default:
      days = 30
  }

  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { fromIso: start.toISOString(), toIso: null }
}

export function rangeLabel(
  range: DateRange,
  custom: CustomDateRange | null,
): string {
  switch (range) {
    case "1d":
      return "Today"
    case "7d":
      return "Last 7 days"
    case "30d":
      return "Last 30 days"
    case "90d":
      return "Last 90 days"
    case "365d":
      return "Last 365 days"
    case "1y":
      return "Year to date"
    case "all":
      return "All time"
    case "custom":
      if (custom) {
        return `${format(custom.from, "MMM d")} – ${format(custom.to, "MMM d, yyyy")}`
      }
      return "Custom range"
    default:
      return "All time"
  }
}

export function computeRangeStats(solves: Solve[]): RangeSummaryStats {
  const base = computeSessionStats(solves)

  if (solves.length === 0) {
    return {
      ...base,
      sessions: 0,
      dnfCount: 0,
      dnfRate: 0,
      ao5StdDev: null,
      ao12StdDev: null,
      firstSolveAt: null,
      lastSolveAt: null,
    }
  }

  const sessionIds = new Set<string>()
  let dnfCount = 0
  let firstSolveAt: string | null = null
  let lastSolveAt: string | null = null

  for (const solve of solves) {
    if (solve.solve_session_id) {
      sessionIds.add(solve.solve_session_id)
    }
    if (getEffectiveTime(solve) === Infinity) {
      dnfCount += 1
    }
    if (!firstSolveAt || solve.solved_at < firstSolveAt) {
      firstSolveAt = solve.solved_at
    }
    if (!lastSolveAt || solve.solved_at > lastSolveAt) {
      lastSolveAt = solve.solved_at
    }
  }

  return {
    ...base,
    sessions: sessionIds.size,
    dnfCount,
    dnfRate: solves.length > 0 ? (dnfCount / solves.length) * 100 : 0,
    ao5StdDev: computeAoNStdDev(solves, 5),
    ao12StdDev: computeAoNStdDev(solves, 12),
    firstSolveAt,
    lastSolveAt,
  }
}
