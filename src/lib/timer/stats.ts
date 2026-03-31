import {
  insertSorted,
  removeSorted,
  computeAverageFromSortedWindow,
  computeMeanFromSortedWindow,
} from "@/lib/timer/sorted-window"

export type Penalty = "+2" | "DNF" | null
export type TimerSolve = {
  id: string
  time_ms: number
  penalty: Penalty
  scramble: string
  group?: string | null
  notes?: string | null
  phases?: number[] | null
  solve_number?: number
  solved_at?: string
  created_at?: string
}

export const STAT_OPTIONS = ["mo3", "ao5", "ao10", "ao12", "ao25", "ao50", "ao100", "ao200", "ao500", "ao1000"]

function effectiveTime(solve: TimerSolve): number {
  if (solve.penalty === "DNF") return Infinity
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

/** Compute current AoN (last N solves). O(n log n) for the slice sort. */
function computeAo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  const times = solves.slice(-n).map(effectiveTime)
  if (times.filter((t) => t === Infinity).length > 1) return null
  const trimmed = [...times].sort((a, b) => a - b).slice(1, -1)
  if (trimmed.some((t) => t === Infinity)) return null
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
}

/** Best AoN across all windows using sliding sorted window. O(n log n). */
function bestAo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  const times = solves.map(effectiveTime)
  const sorted = times.slice(0, n).sort((a, b) => a - b)
  let best = computeAverageFromSortedWindow(sorted)
  for (let i = n; i < times.length; i++) {
    removeSorted(sorted, times[i - n])
    insertSorted(sorted, times[i])
    const cur = computeAverageFromSortedWindow(sorted)
    if (cur !== null && (best === null || cur < best)) best = cur
  }
  return best
}

/** Compute current MoN (last N solves). */
function computeMo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  const times = solves.slice(-n).map(effectiveTime)
  if (times.some((t) => t === Infinity)) return null
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

/** Best MoN across all windows using sliding sorted window. O(n log n). */
function bestMo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  const times = solves.map(effectiveTime)
  const sorted = times.slice(0, n).sort((a, b) => a - b)
  let best = computeMeanFromSortedWindow(sorted)
  for (let i = n; i < times.length; i++) {
    removeSorted(sorted, times[i - n])
    insertSorted(sorted, times[i])
    const cur = computeMeanFromSortedWindow(sorted)
    if (cur !== null && (best === null || cur < best)) best = cur
  }
  return best
}

export function computeStat(solves: TimerSolve[], key: string): number | null {
  const n = parseInt(key.slice(2))
  return key.startsWith("mo") ? computeMo(solves, n) : computeAo(solves, n)
}

export function bestStat(solves: TimerSolve[], key: string): number | null {
  const n = parseInt(key.slice(2))
  return key.startsWith("mo") ? bestMo(solves, n) : bestAo(solves, n)
}

export type MilestoneRow = { key: string; cur: number | null; best: number | null }

/**
 * Compute all milestone rows in a single pass through the solve array.
 * Maintains one sorted window per milestone size simultaneously.
 * Total complexity: O(n * sum(log k_i)) where k_i are milestone sizes.
 */
export function computeAllMilestonesSliding(
  solves: TimerSolve[],
  milestones: number[]
): MilestoneRow[] {
  if (solves.length === 0) return []

  const times = solves.map(effectiveTime)
  const maxMilestone = Math.max(...milestones)

  // Pre-sort milestones by size for efficient window management
  const activeMilestones = milestones
    .filter((n) => times.length >= n)
    .sort((a, b) => a - b)

  if (activeMilestones.length === 0) return []

  // State per milestone: sorted window, current best, current value
  const state = activeMilestones.map((n) => ({
    size: n,
    key: `ao${n}`,
    sorted: [] as number[],
    best: null as number | null,
    cur: null as number | null,
  }))

  // Single pass through all solves
  for (let i = 0; i < times.length; i++) {
    for (const s of state) {
      if (i < s.size) {
        // Still building initial window
        insertSorted(s.sorted, times[i])
        if (i === s.size - 1) {
          // Initial window complete
          const avg = computeAverageFromSortedWindow(s.sorted)
          s.cur = avg
          s.best = avg
        }
      } else {
        // Slide window forward
        removeSorted(s.sorted, times[i - s.size])
        insertSorted(s.sorted, times[i])
        const avg = computeAverageFromSortedWindow(s.sorted)
        s.cur = avg
        if (avg !== null && (s.best === null || avg < s.best)) {
          s.best = avg
        }
      }
    }

    // Early exit: if we've passed the largest milestone and processed all solves we need
    if (i >= maxMilestone && i >= times.length - 1) break
  }

  return state.map((s) => ({ key: s.key, cur: s.cur, best: s.best }))
}

/**
 * Build rolling stat arrays using a sliding sorted window. O(n log k) per column.
 */
export function buildRollingArraySliding(
  solves: TimerSolve[],
  statKey: string
): (number | null)[] {
  const n = parseInt(statKey.slice(2))
  const isMean = statKey.startsWith("mo")
  const times = solves.map(effectiveTime)
  const rolling: (number | null)[] = []
  const sorted: number[] = []

  for (let i = 0; i < times.length; i++) {
    insertSorted(sorted, times[i])
    if (i >= n) {
      removeSorted(sorted, times[i - n])
    }
    if (i + 1 >= n) {
      rolling.push(
        isMean
          ? computeMeanFromSortedWindow(sorted)
          : computeAverageFromSortedWindow(sorted)
      )
    } else {
      rolling.push(null)
    }
  }

  return rolling
}
