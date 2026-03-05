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
import { getSolveCountByEvent, getSolvesByEvent } from "@/lib/actions/timer"

// Supabase PostgREST max-rows is typically 1000, so page at that size.
const PAGE_SIZE = 1000

function dateGroupFromSolvedAt(solvedAt: string): string | null {
  const day = solvedAt.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return `date:${day}`
}

function toDayKey(solvedAt: string): string | null {
  const day = solvedAt.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

/** Convert a database Solve row to the local TimerSolve format. */
function dbSolveToTimer(
  s: Solve,
  timerSessionGroupsByDay: Set<string>
): TimerSolve {
  const dateGroup = dateGroupFromSolvedAt(s.solved_at)
  const timerSessionGroupId = s.timer_session_id ?? null
  const group =
    timerSessionGroupId && !timerSessionGroupsByDay.has(timerSessionGroupId)
      ? timerSessionGroupId
      : dateGroup ?? timerSessionGroupId
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
    // Event-wide sync: timer view is event-scoped and should include all solves
    // regardless of solve_session_id linkage.
    const { count: dbCount, error: countError } =
      await getSolveCountByEvent(event)

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
    const allDbSolves: Solve[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const { solves: page, error: fetchError } = await getSolvesByEvent(
        event,
        PAGE_SIZE,
        offset
      )

      if (fetchError || page.length === 0) {
        hasMore = false
        break
      }

      allDbSolves.push(...page)
      offset += page.length

      if (page.length < PAGE_SIZE) {
        hasMore = false
      }
    }

    if (allDbSolves.length === 0) return null

    // Imported datasets can contain one timer_session_id spanning many days.
    // For those sessions, split groups by date so divider labels still render.
    const daysByTimerSessionId = new Map<string, Set<string>>()
    for (const solve of allDbSolves) {
      if (!solve.timer_session_id) continue
      const dayKey = toDayKey(solve.solved_at)
      if (!dayKey) continue
      const set = daysByTimerSessionId.get(solve.timer_session_id) ?? new Set<string>()
      set.add(dayKey)
      daysByTimerSessionId.set(solve.timer_session_id, set)
    }
    const timerSessionGroupsByDay = new Set(
      Array.from(daysByTimerSessionId.entries())
        .filter(([, days]) => days.size > 1)
        .map(([timerSessionId]) => timerSessionId)
    )
    const allSolves = allDbSolves.map((solve) =>
      dbSolveToTimer(solve, timerSessionGroupsByDay)
    )

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
