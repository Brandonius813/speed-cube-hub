/**
 * Converts parsed solve data into session summaries ready for createSessionsBulk().
 * Also extracts personal bests from solve arrays.
 */

import type { NormalizedSolve, NormalizedPB, SessionSummary } from "./types"
import type { RawSession } from "./parsers"
import { DEFAULT_SECONDS_PER_SOLVE } from "@/lib/constants"
import { truncateSecondsToCentiseconds } from "@/lib/utils"

/**
 * Groups individual solves by date and computes session summaries.
 */
export function solvesToSessions(
  solves: NormalizedSolve[],
  event: string,
  secondsPerSolve?: number
): SessionSummary[] {
  if (solves.length === 0) return []

  const perSolve = secondsPerSolve ?? DEFAULT_SECONDS_PER_SOLVE[event] ?? 30

  const grouped = new Map<string, NormalizedSolve[]>()
  for (const solve of solves) {
    const existing = grouped.get(solve.date)
    if (existing) {
      existing.push(solve)
    } else {
      grouped.set(solve.date, [solve])
    }
  }

  const sessions: SessionSummary[] = []
  const sortedDates = [...grouped.keys()].sort()

  for (const date of sortedDates) {
    const daySolves = grouped.get(date)!
    const validTimes = daySolves
      .filter((s) => !s.is_dnf && s.time_seconds !== null)
      .map((s) => s.time_seconds! + (s.penalty === "+2" ? 2 : 0))

    const numDnf = daySolves.filter((s) => s.is_dnf).length
    const avgTime =
      validTimes.length > 0
        ? truncateSecondsToCentiseconds(
            validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length
          )
        : null

    const bestTime =
      validTimes.length > 0
        ? truncateSecondsToCentiseconds(Math.min(...validTimes))
        : null

    const durationMinutes = Math.max(
      1,
      Math.round((daySolves.length * perSolve) / 60)
    )

    sessions.push({
      session_date: date,
      event,
      practice_type: "Solves",
      num_solves: daySolves.length,
      num_dnf: numDnf,
      duration_minutes: durationMinutes,
      avg_time: avgTime,
      best_time: bestTime,
      notes: null,
    })
  }

  return sessions
}

/**
 * Converts raw sessions (from csTimer/CubeTime parsers) into SessionSummary[].
 */
export function rawSessionsToSummaries(
  rawSessions: RawSession[],
  event: string,
  secondsPerSolve?: number
): SessionSummary[] {
  const perSolve = secondsPerSolve ?? DEFAULT_SECONDS_PER_SOLVE[event] ?? 30

  return rawSessions.map((s) => ({
    session_date: s.session_date,
    event,
    practice_type: "Solves",
    num_solves: s.num_solves,
    num_dnf: s.num_dnf,
    duration_minutes: Math.max(
      1,
      Math.round((s.num_solves * perSolve) / 60)
    ),
    avg_time: s.avg_time,
    best_time: s.best_time,
    notes: null,
  }))
}

/**
 * Finds the best single from an array of solves for a given event.
 */
export function extractPBsFromSolves(
  solves: NormalizedSolve[],
  event: string
): NormalizedPB[] {
  const validTimes = solves
    .filter((s) => !s.is_dnf && s.time_seconds !== null)
    .map((s) => ({
      time: s.time_seconds! + (s.penalty === "+2" ? 2 : 0),
      date: s.date,
    }))

  if (validTimes.length === 0) return []

  let best = validTimes[0]
  for (const s of validTimes) {
    if (s.time < best.time) best = s
  }

  return [
    {
      event,
      pb_type: "Single",
      time_seconds: best.time,
      date_achieved: best.date,
    },
  ]
}

export function excludeIndexedSolves(
  solves: NormalizedSolve[],
  excludedSolveIndexes?: Set<number>
): NormalizedSolve[] {
  if (!excludedSolveIndexes || excludedSolveIndexes.size === 0) {
    return solves
  }

  return solves.filter((_, index) => !excludedSolveIndexes.has(index))
}

export function buildImportedPbs({
  explicitPbs,
  solves,
  event,
  excludedSolveIndexes,
}: {
  explicitPbs: NormalizedPB[]
  solves: NormalizedSolve[]
  event: string
  excludedSolveIndexes?: Set<number>
}): NormalizedPB[] {
  const includedSolves = excludeIndexedSolves(solves, excludedSolveIndexes)

  return [...explicitPbs, ...extractPBsFromSolves(includedSolves, event)]
}
