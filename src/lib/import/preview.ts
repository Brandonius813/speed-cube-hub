import { DEFAULT_SECONDS_PER_SOLVE } from "../constants"
import { msToTruncatedSeconds } from "../timer/averages"
import { bestStat, computeStat, type TimerSolve } from "../timer/stats"
import { secondsToTruncatedMilliseconds } from "../utils"
import type { RawImportSolve, SessionSummary } from "./types"

export const PREVIEW_STAT_KEYS = ["ao5", "ao12", "ao100"] as const

export type PreviewStatKey = (typeof PREVIEW_STAT_KEYS)[number]

export type PreviewStatMap = Record<PreviewStatKey, number | null>

export type ImportPreviewSolve = {
  index: number
  date: string
  scramble: string
  timeMs: number
  penalty: "+2" | "DNF" | null
  effectiveMs: number | null
  included: boolean
  flagged: boolean
}

export type ImportPreviewData = {
  source: string
  hasRawSolves: boolean
  sessions: SessionSummary[]
  solves: ImportPreviewSolve[]
  totalSolveCount: number
  includedSolveCount: number
  flaggedCount: number
  includedFlaggedCount: number
  pbCount: number
  dateRange: string
  bestSingleMs: number | null
  currentStats: PreviewStatMap
  bestStats: PreviewStatMap
}

function getEffectiveMs(solve: RawImportSolve): number | null {
  if (solve.penalty === "DNF") return null
  return solve.time_ms + (solve.penalty === "+2" ? 2000 : 0)
}

function getPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 1) return sortedValues[0]

  const index = (sortedValues.length - 1) * percentile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex]

  const weight = index - lowerIndex
  return (
    sortedValues[lowerIndex] +
    (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight
  )
}

export function getFlaggedSolveIndexes(rawSolves: RawImportSolve[]): Set<number> {
  const validTimes = rawSolves
    .map((solve, index) => ({
      index,
      effectiveMs: getEffectiveMs(solve),
    }))
    .filter((entry): entry is { index: number; effectiveMs: number } => entry.effectiveMs !== null)

  if (validTimes.length < 8) return new Set()

  const sorted = validTimes.map((entry) => entry.effectiveMs).sort((a, b) => a - b)
  const q1 = getPercentile(sorted, 0.25)
  const q3 = getPercentile(sorted, 0.75)
  const iqr = q3 - q1

  if (iqr <= 0) return new Set()

  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr

  return new Set(
    validTimes
      .filter((entry) => entry.effectiveMs < lowerBound || entry.effectiveMs > upperBound)
      .map((entry) => entry.index)
  )
}

function createEmptyStatMap(): PreviewStatMap {
  return {
    ao5: null,
    ao12: null,
    ao100: null,
  }
}

function toTimerSolves(solves: ImportPreviewSolve[]): TimerSolve[] {
  return solves.map((solve) => ({
    id: `import-${solve.index}`,
    time_ms: solve.timeMs,
    penalty: solve.penalty,
    scramble: solve.scramble,
  }))
}

export function buildSessionSummariesFromRawSolves(
  rawSolves: RawImportSolve[],
  event: string,
  secondsPerSolve?: number
): SessionSummary[] {
  if (rawSolves.length === 0) return []

  const perSolve = secondsPerSolve ?? DEFAULT_SECONDS_PER_SOLVE[event] ?? 30
  const grouped = new Map<string, RawImportSolve[]>()

  for (const solve of rawSolves) {
    const daySolves = grouped.get(solve.date)
    if (daySolves) {
      daySolves.push(solve)
    } else {
      grouped.set(solve.date, [solve])
    }
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, solves]) => {
      const effectiveTimes = solves
        .map(getEffectiveMs)
        .filter((time): time is number => time !== null)

      const avgTime =
        effectiveTimes.length > 0
          ? msToTruncatedSeconds(
              effectiveTimes.reduce((sum, time) => sum + time, 0) / effectiveTimes.length
            )
          : null
      const bestTime =
        effectiveTimes.length > 0
          ? msToTruncatedSeconds(Math.min(...effectiveTimes))
          : null

      return {
        session_date: date,
        event,
        practice_type: "Solves",
        num_solves: solves.length,
        num_dnf: solves.filter((solve) => solve.penalty === "DNF").length,
        duration_minutes: Math.max(1, Math.round((solves.length * perSolve) / 60)),
        avg_time: avgTime,
        best_time: bestTime,
        notes: null,
      }
    })
}

export function getDateRangeFromSessions(sessions: SessionSummary[]): string {
  if (sessions.length === 0) return ""

  const dates = sessions.map((session) => session.session_date).sort()
  const first = dates[0]
  const last = dates[dates.length - 1]

  return first === last ? first : `${first} to ${last}`
}

export function buildSessionOnlyPreview({
  source,
  sessions,
  totalSolveCount,
  pbCount,
}: {
  source: string
  sessions: SessionSummary[]
  totalSolveCount: number
  pbCount: number
}): ImportPreviewData {
  const bestSingleSeconds = sessions.reduce<number | null>((best, session) => {
    if (session.best_time == null) return best
    if (best == null) return session.best_time
    return session.best_time < best ? session.best_time : best
  }, null)

  return {
    source,
    hasRawSolves: false,
    sessions,
    solves: [],
    totalSolveCount,
    includedSolveCount: totalSolveCount,
    flaggedCount: 0,
    includedFlaggedCount: 0,
    pbCount,
    dateRange: getDateRangeFromSessions(sessions),
    bestSingleMs:
      bestSingleSeconds != null
        ? secondsToTruncatedMilliseconds(bestSingleSeconds)
        : null,
    currentStats: createEmptyStatMap(),
    bestStats: createEmptyStatMap(),
  }
}

export function buildRawSolvePreview({
  source,
  rawSolves,
  event,
  secondsPerSolve,
  excludedSolveIndexes,
  pbCount,
}: {
  source: string
  rawSolves: RawImportSolve[]
  event: string
  secondsPerSolve?: number
  excludedSolveIndexes?: Set<number>
  pbCount: number
}): ImportPreviewData {
  const flaggedIndexes = getFlaggedSolveIndexes(rawSolves)
  const solves = rawSolves.map((solve, index) => ({
    index,
    date: solve.date,
    scramble: solve.scramble,
    timeMs: solve.time_ms,
    penalty: solve.penalty,
    effectiveMs: getEffectiveMs(solve),
    included: !excludedSolveIndexes?.has(index),
    flagged: flaggedIndexes.has(index),
  }))

  const includedSolves = solves.filter((solve) => solve.included)
  const includedRawSolves = includedSolves.map((solve) => rawSolves[solve.index])
  const timerSolves = toTimerSolves(includedSolves)
  const sessions = buildSessionSummariesFromRawSolves(
    includedRawSolves,
    event,
    secondsPerSolve
  )

  const bestSingleMs = includedSolves.reduce<number | null>((best, solve) => {
    if (solve.effectiveMs == null) return best
    if (best == null) return solve.effectiveMs
    return solve.effectiveMs < best ? solve.effectiveMs : best
  }, null)

  const currentStats = createEmptyStatMap()
  const bestStats = createEmptyStatMap()

  for (const key of PREVIEW_STAT_KEYS) {
    currentStats[key] = computeStat(timerSolves, key)
    bestStats[key] = bestStat(timerSolves, key)
  }

  return {
    source,
    hasRawSolves: true,
    sessions,
    solves,
    totalSolveCount: rawSolves.length,
    includedSolveCount: includedSolves.length,
    flaggedCount: solves.filter((solve) => solve.flagged).length,
    includedFlaggedCount: solves.filter((solve) => solve.flagged && solve.included).length,
    pbCount,
    dateRange: getDateRangeFromSessions(sessions),
    bestSingleMs,
    currentStats,
    bestStats,
  }
}
