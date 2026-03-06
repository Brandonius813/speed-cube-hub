import type { Solve } from "@/lib/types"

/**
 * Get the effective time for a solve, applying penalties.
 * - No penalty: raw time_ms
 * - +2: time_ms + 2000
 * - DNF: Infinity (excluded from averages)
 */
export function getEffectiveTime(solve: Solve): number {
  if (solve.penalty === "DNF") return Infinity
  if (solve.penalty === "+2") return solve.time_ms + 2000
  return solve.time_ms
}

/**
 * Compute a trimmed average of N (AoN).
 * Drops the best and worst times, then computes the mean of the rest.
 * Used for Ao5, Ao12, etc.
 *
 * Returns null if there aren't enough solves, or if too many DNFs
 * (more than 1 DNF in the window makes it a DNF average).
 */
export function computeAoN(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null

  const window = solves.slice(-n)
  const times = window.map(getEffectiveTime)
  const dnfCount = times.filter((t) => t === Infinity).length

  // More than 1 DNF = DNF average
  if (dnfCount > 1) return null

  // Sort and trim best + worst
  const sorted = [...times].sort((a, b) => a - b)
  const trimmed = sorted.slice(1, -1)

  // If any trimmed time is Infinity, something went wrong
  if (trimmed.some((t) => t === Infinity)) return null

  const sum = trimmed.reduce((acc, t) => acc + t, 0)
  return Math.round(sum / trimmed.length)
}

/**
 * Compute a mean of N (MoN).
 * Straight mean — no trimming. Used for Mo3, Mo100.
 * Any DNF in the window makes the entire mean a DNF (returns null).
 */
export function computeMoN(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null

  const window = solves.slice(-n)
  const times = window.map(getEffectiveTime)

  if (times.some((t) => t === Infinity)) return null

  const sum = times.reduce((acc, t) => acc + t, 0)
  return Math.round(sum / times.length)
}

/**
 * Find the best AoN across all possible windows in the solve list.
 */
export function bestAoN(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null

  let best: number | null = null
  for (let i = n; i <= solves.length; i++) {
    const window = solves.slice(i - n, i)
    const times = window.map(getEffectiveTime)
    const dnfCount = times.filter((t) => t === Infinity).length

    if (dnfCount > 1) continue

    const sorted = [...times].sort((a, b) => a - b)
    const trimmed = sorted.slice(1, -1)
    if (trimmed.some((t) => t === Infinity)) continue

    const avg = Math.round(trimmed.reduce((acc, t) => acc + t, 0) / trimmed.length)
    if (best === null || avg < best) best = avg
  }

  return best
}

/**
 * Compute BPA (Best Possible Average) for the current AoN window.
 * Assumes the remaining solves in the window will be the best possible (0ms).
 * Only meaningful when we have fewer than N solves in the current window.
 */
export function computeBPA(
  solves: Solve[],
  n: number
): number | null {
  if (solves.length === 0) return null
  if (solves.length >= n) return computeAoN(solves, n)

  // Fill remaining slots with 0ms (best possible)
  const remaining = n - solves.length
  const fakeSolves: Solve[] = Array.from({ length: remaining }, (_, i) => ({
    id: `bpa-${i}`,
    timer_session_id: "",
    user_id: "",
    solve_number: 0,
    time_ms: 0,
    penalty: null,
    scramble: "",
    event: "",
    comp_sim_group: null,
    notes: null,
    solve_session_id: null,
    solved_at: "",
    created_at: "",
  }))

  return computeAoN([...fakeSolves, ...solves], n)
}

/**
 * Compute WPA (Worst Possible Average) for the current AoN window.
 * Assumes the remaining solves will all be DNFs.
 */
export function computeWPA(
  solves: Solve[],
  n: number
): number | null {
  if (solves.length === 0) return null
  if (solves.length >= n) return computeAoN(solves, n)

  // Fill remaining slots with DNF
  const remaining = n - solves.length
  const fakeSolves: Solve[] = Array.from({ length: remaining }, (_, i) => ({
    id: `wpa-${i}`,
    timer_session_id: "",
    user_id: "",
    solve_number: 0,
    time_ms: 0,
    penalty: "DNF" as const,
    scramble: "",
    event: "",
    comp_sim_group: null,
    notes: null,
    solve_session_id: null,
    solved_at: "",
    created_at: "",
  }))

  return computeAoN([...solves, ...fakeSolves], n)
}

/**
 * Compute standard deviation of the current AoN window's trimmed times (in ms).
 * Returns null if there aren't enough solves or too many DNFs.
 */
export function computeAoNStdDev(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null

  const window = solves.slice(-n)
  const times = window.map(getEffectiveTime)
  const dnfCount = times.filter((t) => t === Infinity).length
  if (dnfCount > 1) return null

  const sorted = [...times].sort((a, b) => a - b)
  const trimmed = sorted.slice(1, -1)
  if (trimmed.some((t) => t === Infinity)) return null
  if (trimmed.length < 2) return null

  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
  const variance =
    trimmed.reduce((acc, t) => acc + (t - mean) ** 2, 0) / (trimmed.length - 1)
  return Math.round(Math.sqrt(variance))
}

export type SessionStats = {
  count: number
  best: number | null
  worst: number | null
  mean: number | null
  ao5: number | null
  ao12: number | null
  ao50: number | null
  ao100: number | null
  bestAo5: number | null
  bestAo12: number | null
}

/**
 * Compute all session stats from an array of solves.
 * All times are in milliseconds.
 */
export function computeSessionStats(solves: Solve[]): SessionStats {
  if (solves.length === 0) {
    return {
      count: 0,
      best: null,
      worst: null,
      mean: null,
      ao5: null,
      ao12: null,
      ao50: null,
      ao100: null,
      bestAo5: null,
      bestAo12: null,
    }
  }

  const effectiveTimes = solves.map(getEffectiveTime)
  const nonDnfTimes = effectiveTimes.filter((t) => t !== Infinity)

  const best = nonDnfTimes.length > 0 ? Math.min(...nonDnfTimes) : null
  const worst = nonDnfTimes.length > 0 ? Math.max(...nonDnfTimes) : null
  const mean =
    nonDnfTimes.length > 0
      ? Math.round(
          nonDnfTimes.reduce((acc, t) => acc + t, 0) / nonDnfTimes.length
        )
      : null

  return {
    count: solves.length,
    best,
    worst,
    mean,
    ao5: computeAoN(solves, 5),
    ao12: computeAoN(solves, 12),
    ao50: computeAoN(solves, 50),
    ao100: computeAoN(solves, 100),
    bestAo5: bestAoN(solves, 5),
    bestAo12: bestAoN(solves, 12),
  }
}

export function truncateMsToCentiseconds(ms: number): number {
  if (ms === Infinity) return Infinity
  return Math.max(0, Math.trunc(ms / 10)) * 10
}

export function msToTruncatedSeconds(ms: number): number {
  return Math.max(0, Math.trunc(ms / 10)) / 100
}

export function formatTimeMsCentiseconds(ms: number): string {
  if (ms === Infinity) return "DNF"

  const totalCentiseconds = Math.max(0, Math.trunc(ms / 10))
  const minutes = Math.floor(totalCentiseconds / 6000)
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
  const centiseconds = totalCentiseconds % 100

  if (minutes === 0) {
    return `${seconds}.${String(centiseconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`
}

/**
 * Format milliseconds to cubing display format.
 * - Under 60s: "12.326"
 * - 60s+: "1:30.326"
 */
export function formatTimeMs(ms: number): string {
  if (ms === Infinity) return "DNF"
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) {
    return totalSeconds.toFixed(3)
  }
  const min = Math.floor(totalSeconds / 60)
  const sec = (totalSeconds % 60).toFixed(3)
  return `${min}:${sec.padStart(6, "0")}`
}
