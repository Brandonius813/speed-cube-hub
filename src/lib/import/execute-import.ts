/**
 * 3-phase import execution logic.
 * Phase 1: Save individual solves to DB + IndexedDB
 * Phase 2: Save per-day session summaries for feed/stats
 * Phase 3: Import personal bests
 */

import type { SessionSummary, NormalizedPB, RawImportSolve } from "@/lib/import/types"
import type { SolveStore } from "@/lib/timer/solve-store"
import { createSessionsBulk } from "@/lib/actions/sessions"
import { bulkImportPBs } from "@/lib/actions/personal-bests"
import { bulkImportSolves } from "@/lib/actions/timer"
import {
  getOrCreateDefaultSession,
  updateSolveSessionActiveFrom,
} from "@/lib/actions/solve-sessions"

export type ImportProgress = (message: string) => void
export type ImportResult =
  | { success: true; count: number; hasRawSolves: boolean }
  | { success: false; error: string }

export async function executeImport(
  event: string,
  rawSolves: RawImportSolve[],
  sessions: SessionSummary[],
  pbs: NormalizedPB[],
  solveStore: SolveStore,
  onProgress: ImportProgress
): Promise<ImportResult> {
  try {
    let count = 0

    // Phase 1: Individual solves to DB + IndexedDB
    if (rawSolves.length > 0) {
      onProgress("Preparing solve session...")

      const { data: solveSession, error: ssError } =
        await getOrCreateDefaultSession(event)
      if (ssError || !solveSession) {
        return { success: false, error: ssError ?? "Failed to create solve session." }
      }

      onProgress(`Saving ${rawSolves.length.toLocaleString()} solves to your account...`)

      const { imported, error: importError } = await bulkImportSolves(
        solveSession.id,
        event,
        rawSolves,
        { skipSessionEntry: true }
      )
      if (importError) {
        return { success: false, error: importError }
      }

      const earliestDate = rawSolves.reduce(
        (min, s) => (s.date < min ? s.date : min),
        rawSolves[0].date
      )
      await updateSolveSessionActiveFrom(
        solveSession.id,
        `${earliestDate}T00:00:00.000Z`
      )

      onProgress("Writing to local storage for instant timer access...")
      const timerSolves = rawSolves.map((s) => ({
        id: crypto.randomUUID(),
        time_ms: s.time_ms,
        penalty: s.penalty,
        scramble: s.scramble,
      }))
      await solveStore.importSolves(event, timerSolves)
      count += imported
    }

    // Phase 2: Session summaries
    if (sessions.length > 0) {
      onProgress(`Saving ${sessions.length} session summaries...`)
      const result = await createSessionsBulk(sessions)
      if (result.error) {
        return { success: false, error: result.error }
      }
      if (rawSolves.length === 0) {
        count += result.inserted ?? sessions.length
      }
    }

    // Phase 3: PBs
    if (pbs.length > 0) {
      onProgress("Importing personal bests...")
      const result = await bulkImportPBs(pbs)
      if (result.error) {
        return { success: false, error: result.error }
      }
      count += result.imported ?? pbs.length
    }

    const finalCount = rawSolves.length > 0 ? rawSolves.length : count
    return { success: true, count: finalCount, hasRawSolves: rawSolves.length > 0 }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Import failed unexpectedly.",
    }
  }
}
