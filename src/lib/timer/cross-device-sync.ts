/**
 * Cross-device sync for timer solves.
 *
 * When a user opens the timer on a new device (or after clearing browser data),
 * IndexedDB is empty but their solves exist in the database (from a previous
 * import or another device). This module detects that mismatch and pulls the
 * solves from DB into IndexedDB so the timer loads them instantly next time.
 *
 * The sync is a ONE-TIME cost per device per event. After the first sync,
 * all subsequent timer opens read from IndexedDB with zero network requests.
 */

import type { TimerSolve } from "@/lib/timer/stats"
import type { SolveStore } from "@/lib/timer/solve-store"
import type { Solve } from "@/lib/types"
import { getOrCreateDefaultSession } from "@/lib/actions/solve-sessions"
import { getSolveCountBySession, getSolvesBySession } from "@/lib/actions/timer"

const PAGE_SIZE = 5000

/** Convert a database Solve row to the local TimerSolve format. */
function dbSolveToTimer(s: Solve): TimerSolve {
  return {
    id: s.id,
    time_ms: s.time_ms,
    penalty: s.penalty,
    scramble: s.scramble,
  }
}

/**
 * Check if the database has solves that aren't in IndexedDB yet,
 * and sync them if needed. Runs silently in the background.
 *
 * @returns The synced solves (converted to TimerSolve[]) if any were pulled,
 *          or null if no sync was needed.
 */
export async function syncSolvesFromDb(
  event: string,
  localCount: number,
  store: SolveStore
): Promise<TimerSolve[] | null> {
  try {
    // Get (or create) the default solve session for this event
    const { data: session, error: sessionError } =
      await getOrCreateDefaultSession(event)

    if (sessionError || !session) {
      // Not logged in or no session — nothing to sync
      return null
    }

    // Quick count check: does the DB have more solves than local?
    const { count: dbCount, error: countError } =
      await getSolveCountBySession(session.id, session.active_from)

    if (countError || dbCount <= localCount) {
      // DB has same or fewer solves — no sync needed
      return null
    }

    // DB has more solves. Fetch them all in paginated chunks.
    const allSolves: TimerSolve[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const { solves: page, error: fetchError } = await getSolvesBySession(
        session.id,
        session.active_from,
        PAGE_SIZE,
        offset
      )

      if (fetchError || page.length === 0) {
        hasMore = false
        break
      }

      const converted = page.map(dbSolveToTimer)
      allSolves.push(...converted)
      offset += page.length

      if (page.length < PAGE_SIZE) {
        hasMore = false
      }
    }

    if (allSolves.length === 0) return null

    // Write all synced solves to IndexedDB (replaces existing for this event)
    await store.clearSession(event)
    await store.importSolves(event, allSolves)

    return allSolves
  } catch {
    // Sync is best-effort — don't crash the timer
    return null
  }
}
