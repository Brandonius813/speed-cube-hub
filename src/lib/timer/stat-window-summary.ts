import { formatTimeMs, formatTimeMsCentiseconds } from "@/lib/timer/averages"
export type StatWindowSolveInput = {
  id: string
  time_ms: number
  penalty: "+2" | "DNF" | null
  scramble: string
  solved_at?: string
  created_at?: string
}

export type StatWindowHistogramBin = {
  label: string
  count: number
  startMs: number
  endMs: number
}

export type StatWindowSolveSummary = {
  id: string
  scramble: string
  penalty: StatWindowSolveInput["penalty"]
  timeMs: number
  effectiveMs: number | null
  displayTime: string
  isTrimmed: boolean
  solvedAt: string
  createdAt: string
}

export type StatWindowSummary = {
  label: string
  windowSize: number
  isMean: boolean
  isSingle: boolean
  isDnf: boolean
  valueMs: number | null
  displayValue: string
  sigmaMs: number | null
  trimmedIndices: number[]
  bestMs: number | null
  worstMs: number | null
  plus2Count: number
  dnfCount: number
  bins: StatWindowHistogramBin[]
  solves: StatWindowSolveSummary[]
  lastSolvedAt: string | null
}

const HISTOGRAM_BUCKET_STEPS_MS = [
  100,
  200,
  500,
  1000,
  2000,
  5000,
  10000,
  15000,
  30000,
  60000,
]

export function getSolveEffectiveTimeMs(
  solve: Pick<StatWindowSolveInput, "time_ms" | "penalty">
): number | null {
  if (solve.penalty === "DNF") return null
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

export function summarizeStatWindow(
  label: string,
  solves: StatWindowSolveInput[]
): StatWindowSummary {
  const isSingle = label === "single" || solves.length <= 1
  const isMean = !isSingle && label.startsWith("mo")
  const effectiveTimes = solves.map((solve) => getSolveEffectiveTimeMs(solve))
  const finiteTimes = effectiveTimes.filter((time): time is number => time !== null)
  const plus2Count = solves.filter((solve) => solve.penalty === "+2").length
  const dnfCount = solves.filter((solve) => solve.penalty === "DNF").length

  let trimmedIndices: number[] = []
  let valueMs: number | null = null
  let sigmaMs: number | null = null
  let isDnf = false

  if (isSingle) {
    valueMs = effectiveTimes[0] ?? null
    isDnf = valueMs === null
  } else if (isMean) {
    if (dnfCount > 0 || finiteTimes.length !== solves.length) {
      isDnf = true
    } else {
      valueMs = Math.round(finiteTimes.reduce((sum, time) => sum + time, 0) / finiteTimes.length)
      sigmaMs = computeStdDev(finiteTimes)
    }
  } else {
    if (dnfCount > 1) {
      isDnf = true
    } else {
      const sorted = effectiveTimes
        .map((time, index) => ({ time: time ?? Number.POSITIVE_INFINITY, index }))
        .sort((a, b) => a.time - b.time)

      if (sorted.length >= 2) {
        trimmedIndices = [sorted[0].index, sorted[sorted.length - 1].index]
      }

      const trimmedTimes = sorted
        .slice(1, -1)
        .map((entry) => entry.time)
        .filter((time) => Number.isFinite(time))

      if (trimmedTimes.length !== Math.max(0, solves.length - 2)) {
        isDnf = true
      } else if (trimmedTimes.length > 0) {
        valueMs = Math.round(
          trimmedTimes.reduce((sum, time) => sum + time, 0) / trimmedTimes.length
        )
        sigmaMs = computeStdDev(trimmedTimes)
      }
    }
  }

  const trimmedSet = new Set(trimmedIndices)
  const bestMs = finiteTimes.length > 0 ? Math.min(...finiteTimes) : null
  const worstMs = finiteTimes.length > 0 ? Math.max(...finiteTimes) : null

  return {
    label,
    windowSize: solves.length,
    isMean,
    isSingle,
    isDnf,
    valueMs,
    displayValue: isDnf || valueMs === null ? "DNF" : formatTimeMs(valueMs),
    sigmaMs,
    trimmedIndices,
    bestMs,
    worstMs,
    plus2Count,
    dnfCount,
    bins: buildHistogramBins(finiteTimes),
    solves: solves.map((solve, index) => {
      const effectiveMs = effectiveTimes[index]
      return {
        id: solve.id,
        scramble: solve.scramble,
        penalty: solve.penalty,
        timeMs: solve.time_ms,
        effectiveMs,
        displayTime: effectiveMs === null ? "DNF" : formatTimeMs(effectiveMs),
        isTrimmed: trimmedSet.has(index),
        solvedAt: solve.solved_at ?? solve.created_at ?? "",
        createdAt: solve.created_at ?? solve.solved_at ?? "",
      }
    }),
    lastSolvedAt: solves[solves.length - 1]?.solved_at ?? solves[solves.length - 1]?.created_at ?? null,
  }
}

export function buildStatWindowText(summary: StatWindowSummary): string {
  const lines: string[] = [`${summary.label}: ${summary.displayValue}`, ""]

  for (let i = 0; i < summary.solves.length; i++) {
    const solve = summary.solves[i]
    const display = solve.isTrimmed ? `(${solve.displayTime})` : solve.displayTime
    const scramble = solve.scramble ? `   ${solve.scramble}` : ""
    lines.push(`${i + 1}. ${display}${scramble}`)
  }

  return lines.join("\n")
}

function computeStdDev(timesMs: number[]): number | null {
  if (timesMs.length < 2) return null
  const mean = timesMs.reduce((sum, time) => sum + time, 0) / timesMs.length
  const variance =
    timesMs.reduce((sum, time) => sum + (time - mean) ** 2, 0) / (timesMs.length - 1)
  return Math.round(Math.sqrt(variance))
}

function buildHistogramBins(timesMs: number[]): StatWindowHistogramBin[] {
  if (timesMs.length === 0) return []

  const min = Math.min(...timesMs)
  const max = Math.max(...timesMs)
  const range = Math.max(0, max - min)
  const rawBucketSize = range === 0 ? 100 : Math.ceil(range / 6)
  const bucketSize = pickBucketSize(rawBucketSize)
  const bucketStart = Math.floor(min / bucketSize) * bucketSize
  const bucketEnd = Math.floor(max / bucketSize) * bucketSize + bucketSize

  const bins: StatWindowHistogramBin[] = []
  for (let start = bucketStart; start < bucketEnd; start += bucketSize) {
    const end = start + bucketSize
    const isLast = end >= bucketEnd
    const count = timesMs.filter((time) =>
      isLast ? time >= start && time <= end : time >= start && time < end
    ).length

    bins.push({
      label: `${formatTimeMsCentiseconds(start)}-${formatTimeMsCentiseconds(end)}`,
      count,
      startMs: start,
      endMs: end,
    })
  }

  return bins
}

function pickBucketSize(rawBucketSize: number): number {
  const positiveSize = Math.max(1, rawBucketSize)
  for (const step of HISTOGRAM_BUCKET_STEPS_MS) {
    if (positiveSize <= step) return step
  }
  return Math.ceil(positiveSize / 60000) * 60000
}
