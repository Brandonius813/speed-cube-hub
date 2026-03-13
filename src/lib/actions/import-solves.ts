"use server"

import { createClient } from "@/lib/supabase/server"
import type { ImportedSolveChunkRow } from "@/lib/import/chunk-import"
import {
  refreshSolveSessionSummary,
  refreshTimerEventAnalytics,
} from "@/lib/actions/timer-analytics"

export async function createImportedTimerSession(
  solveSessionId: string,
  event: string
): Promise<{ data: { id: string } | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data: solveSession, error: solveSessionError } = await supabase
    .from("solve_sessions")
    .select("id")
    .eq("id", solveSessionId)
    .eq("user_id", user.id)
    .single()

  if (solveSessionError || !solveSession) {
    return { data: null, error: "Solve session not found." }
  }

  const { data: timerSession, error: timerSessionError } = await supabase
    .from("timer_sessions")
    .insert({
      user_id: user.id,
      event,
      mode: "normal",
      status: "completed",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      solve_session_id: solveSessionId,
    })
    .select("id")
    .single()

  if (timerSessionError || !timerSession) {
    return {
      data: null,
      error: timerSessionError?.message ?? "Failed to create timer session.",
    }
  }

  return {
    data: {
      id: timerSession.id,
    },
  }
}

export async function appendImportedSolveChunk(
  timerSessionId: string,
  solves: ImportedSolveChunkRow[]
): Promise<{ imported: number; error?: string }> {
  if (solves.length === 0) {
    return { imported: 0, error: "No solves to import." }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { imported: 0, error: "Not authenticated" }
  }

  const { data: timerSession, error: timerSessionError } = await supabase
    .from("timer_sessions")
    .select("id, event, solve_session_id")
    .eq("id", timerSessionId)
    .eq("user_id", user.id)
    .single()

  if (timerSessionError || !timerSession?.solve_session_id) {
    return { imported: 0, error: "Import session not found." }
  }

  const solveRows = solves.map((solve) => ({
    timer_session_id: timerSession.id,
    user_id: user.id,
    solve_number: solve.solve_number,
    time_ms: solve.time_ms,
    penalty: solve.penalty,
    scramble: solve.scramble,
    event: timerSession.event,
    solve_session_id: timerSession.solve_session_id,
    solved_at: solve.solved_at,
  }))

  let totalInserted = 0
  for (let i = 0; i < solveRows.length; i += 500) {
    const batch = solveRows.slice(i, i + 500)
    const { error: insertError } = await supabase.from("solves").insert(batch)

    if (insertError) {
      return {
        imported: totalInserted,
        error: insertError.message,
      }
    }

    totalInserted += batch.length
  }

  await Promise.all([
    refreshTimerEventAnalytics(timerSession.event),
    refreshSolveSessionSummary(timerSession.solve_session_id),
  ])

  return { imported: totalInserted }
}
