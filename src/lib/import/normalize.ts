/**
 * Converts parsed solve data into session summaries ready for createSessionsBulk().
 * Also extracts personal bests from solve arrays.
 */

import type { NormalizedSolve, NormalizedPB, SessionSummary } from "./types"
import type { RawSession } from "./parsers"
import { DEFAULT_SECONDS_PER_SOLVE } from "@/lib/constants"

/**
 * Groups individual solves by date and computes session summaries.
 * Used for Twisty Timer and AI-parsed solve data.
 */
export function solvesToSessions(
  solves: NormalizedSolve[],
  event: string,
  secondsPerSolve?: number
): SessionSummary[] {
  if (solves.length === 0) return []

  const perSolve = secondsPerSolve ?? DEFAULT_SECONDS_PER_SOLVE[event] ?? 30

  // Group by date
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
      .map((s) => s.time_seconds!)

    const numDnf = daySolves.filter((s) => s.is_dnf).length
    const avgTime =
      validTimes.length > 0
        ? Math.round(
            (validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length) *
              100
          ) / 100
        : null

    const bestTime =
      validTimes.length > 0
        ? Math.round(Math.min(...validTimes) * 100) / 100
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
 * These parsers already group by date, so we just add the missing fields.
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
 * Returns an array (0 or 1 item) for easy spreading into PB arrays.
 */
export function extractPBsFromSolves(
  solves: NormalizedSolve[],
  event: string
): NormalizedPB[] {
  const validTimes = solves
    .filter((s) => !s.is_dnf && s.time_seconds !== null)
    .map((s) => ({ time: s.time_seconds!, date: s.date }))

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
