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

// Supabase PostgREST max-rows is typically 1000, so page at that size.
const PAGE_SIZE = 1000

function dateGroupFromSolvedAt(solvedAt: string): string | null {
  const day = solvedAt.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return `date:${day}`
}

/** Convert a database Solve row to the local TimerSolve format. */
function dbSolveToTimer(s: Solve): TimerSolve {
  const group = s.timer_session_id ?? dateGroupFromSolvedAt(s.solved_at)
  return {
    id: s.id,
    time_ms: s.time_ms,
    penalty: s.penalty,
    scramble: s.scramble,
    // Prefer timer session grouping; fall back to day-based grouping for old/imported solves.
    group: group ?? null,
  }
}

type SyncOptions = {
  /**
   * If true, fetch DB solves even when counts match and backfill missing group ids
   * into existing local solves by solve id. Preserves local-only unsaved solves.
   */
  forceGroupBackfill?: boolean
  /** Optional loaded solves to avoid an extra store read during backfill. */
  localSolves?: TimerSolve[]
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
  store: SolveStore,
  options?: SyncOptions
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
      await getSolveCountBySession(session.id, session.active_from, event)

    if (countError) {
      return null
    }

    const shouldSyncAll = dbCount > localCount
    const shouldBackfillGroups = options?.forceGroupBackfill === true

    if (!shouldSyncAll && !shouldBackfillGroups) {
      // DB has same or fewer solves and no forced group backfill requested.
      return null
    }

    // Fetch DB solves in paginated chunks.
    const allSolves: TimerSolve[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const { solves: page, error: fetchError } = await getSolvesBySession(
        session.id,
        session.active_from,
        PAGE_SIZE,
        offset,
        event
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

    if (shouldSyncAll) {
      // DB has newer data: replace local cache with authoritative DB list.
      await store.clearSession(event)
      await store.importSolves(event, allSolves)
      return allSolves
    }

    // Count matched (or was lower) but we were asked to recover missing grouping.
    // Patch groups in-place by solve id so local-only unsaved solves are preserved.
    const localSolves = options?.localSolves ?? (await store.loadSession(event))
    if (localSolves.length === 0) return null

    const groupBySolveId = new Map(
      allSolves.map((solve) => [solve.id, solve.group ?? null])
    )
    let changed = false
    const patched = localSolves.map((solve) => {
      if (solve.group) return solve
      const mappedGroup = groupBySolveId.get(solve.id)
      if (!mappedGroup) return solve
      changed = true
      return { ...solve, group: mappedGroup }
    })

    if (!changed) {
      // Legacy imports used client-generated IDs in local storage, so ID mapping
      // can fail even when DB rows are the same solves. If counts match and the
      // local cache is fully ungrouped, trust DB order and replace.
      const allLocalUngrouped = localSolves.every((solve) => !solve.group)
      if (
        shouldBackfillGroups &&
        allLocalUngrouped &&
        localSolves.length === allSolves.length
      ) {
        await store.replaceSession(event, allSolves)
        return allSolves
      }
      return null
    }
    await store.replaceSession(event, patched)
    return patched
  } catch {
    // Sync is best-effort — don't crash the timer
    return null
  }
}
