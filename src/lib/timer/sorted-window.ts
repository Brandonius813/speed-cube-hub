/**
 * Shared sliding-window utilities for O(n log n) average computation.
 * Used by both client-side stats (stats.ts, stats-worker.ts) and
 * server-side analytics (timer-analytics.ts).
 */

/** Binary-search insert into a sorted array. O(log n). */
export function insertSorted(sorted: number[], value: number): void {
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

/** Binary-search remove from a sorted array. O(log n). */
export function removeSorted(sorted: number[], value: number): void {
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

/**
 * Compute trimmed average from a sorted window (AoN).
 * Trims best and worst, returns null if >1 DNF (Infinity).
 */
export function computeAverageFromSortedWindow(sorted: number[]): number | null {
  if (sorted.length < 3) return null

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

/**
 * Compute mean from a sorted window (MoN).
 * Returns null if any solve is DNF (Infinity).
 */
export function computeMeanFromSortedWindow(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  if (!Number.isFinite(sorted[sorted.length - 1])) return null

  let sum = 0
  for (let index = 0; index < sorted.length; index++) {
    sum += sorted[index]
  }

  return Math.round(sum / sorted.length)
}
