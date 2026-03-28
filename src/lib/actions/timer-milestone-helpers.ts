/**
 * Pure helper functions for timer milestone computation.
 * Extracted from timer-analytics.ts because "use server" files
 * cannot export non-async functions.
 */

import type {
  Solve,
  TimerMilestoneKey,
  TimerMilestoneSummaryRow,
} from "@/lib/types"

const FIXED_TIMER_MILESTONE_SIZES = [5, 12, 25, 50, 100, 200, 500, 1000] as const

type FixedMilestoneSize = (typeof FIXED_TIMER_MILESTONE_SIZES)[number]
type SummarySolveShape = Pick<Solve, "time_ms" | "penalty">

const INFINITY_TIME = Number.POSITIVE_INFINITY

function milestoneKey(size: FixedMilestoneSize): TimerMilestoneKey {
  return `ao${size}` as TimerMilestoneKey
}

function effectiveSolveMs(solve: SummarySolveShape): number {
  if (solve.penalty === "DNF") return INFINITY_TIME
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

function insertSorted(sorted: number[], value: number): void {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (sorted[mid] <= value) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  sorted.splice(low, 0, value)
}

function removeSorted(sorted: number[], value: number): void {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (sorted[mid] < value) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  if (sorted[low] === value) {
    sorted.splice(low, 1)
  }
}

function computeAverageFromSortedWindow(sorted: number[]): number | null {
  let dnfCount = 0
  for (let index = sorted.length - 1; index >= 0 && !Number.isFinite(sorted[index]); index--) {
    dnfCount += 1
    if (dnfCount > 1) return null
  }

  let sum = 0
  for (let index = 1; index < sorted.length - 1; index += 1) {
    const value = sorted[index]
    if (!Number.isFinite(value)) return null
    sum += value
  }

  return Math.round(sum / (sorted.length - 2))
}

export function computeFixedMilestoneRows(
  solves: SummarySolveShape[]
): TimerMilestoneSummaryRow[] {
  if (solves.length === 0) return []

  const effectiveTimes = solves.map(effectiveSolveMs)

  return FIXED_TIMER_MILESTONE_SIZES
    .filter((size) => effectiveTimes.length >= size)
    .map((size) => {
      const sortedWindow = effectiveTimes.slice(0, size).sort((a, b) => a - b)
      let current = computeAverageFromSortedWindow(sortedWindow)
      let best = current

      for (let index = size; index < effectiveTimes.length; index += 1) {
        removeSorted(sortedWindow, effectiveTimes[index - size])
        insertSorted(sortedWindow, effectiveTimes[index])
        current = computeAverageFromSortedWindow(sortedWindow)
        if (current !== null && (best === null || current < best)) {
          best = current
        }
      }

      return {
        key: milestoneKey(size),
        cur: current,
        best,
      }
    })
}

export function milestoneRowsToSessionPatch(
  rows: TimerMilestoneSummaryRow[]
): Record<string, number | null> {
  const patch: Record<string, number | null> = {}
  for (const size of FIXED_TIMER_MILESTONE_SIZES) {
    const row = rows.find((candidate) => candidate.key === milestoneKey(size)) ?? null
    patch[`best_ao${size}`] = row?.best !== null && row?.best !== undefined
      ? Math.max(0, Math.trunc(row.best / 10)) / 100
      : null
  }
  return patch
}
