"use server"

import { createClient } from "@/lib/supabase/server"
import { createSolveSession } from "@/lib/actions/solve-sessions"
import type { SolveSession } from "@/lib/types"
import {
  refreshSolveSessionSummary,
  refreshTimerEventAnalytics,
} from "@/lib/actions/timer-analytics"

/**
 * Merge two solve sessions: move all solves from source into target, then archive source.
 * Both sessions must belong to the same user and same event.
 */
export async function mergeSolveSessions(
  sourceId: string,
  targetId: string
): Promise<{ movedCount: number; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { movedCount: 0, error: "Not authenticated" }

  // Fetch both sessions and verify ownership + same event
  const { data: sessions, error: fetchError } = await supabase
    .from("solve_sessions")
    .select("id, event, user_id")
    .in("id", [sourceId, targetId])
    .eq("user_id", user.id)

  if (fetchError || !sessions || sessions.length !== 2) {
    return { movedCount: 0, error: "Sessions not found" }
  }

  const source = sessions.find((s) => s.id === sourceId)
  const target = sessions.find((s) => s.id === targetId)
  if (!source || !target) return { movedCount: 0, error: "Sessions not found" }
  if (source.event !== target.event) {
    return { movedCount: 0, error: "Sessions must be the same event" }
  }

  // Count solves to move, then move them
  const { count } = await supabase
    .from("solves")
    .select("*", { count: "exact", head: true })
    .eq("solve_session_id", sourceId)
    .eq("user_id", user.id)

  const { error: moveError } = await supabase
    .from("solves")
    .update({ solve_session_id: targetId })
    .eq("solve_session_id", sourceId)
    .eq("user_id", user.id)

  if (moveError) return { movedCount: 0, error: moveError.message }

  // Archive the source session
  await supabase
    .from("solve_sessions")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", sourceId)
    .eq("user_id", user.id)

  await Promise.all([
    refreshSolveSessionSummary(sourceId),
    refreshSolveSessionSummary(targetId),
    refreshTimerEventAnalytics(source.event),
  ])

  return { movedCount: count ?? 0 }
}

/**
 * Split a solve session at a given solve number.
 * Solves after splitAfterSolveNumber are moved to a new session.
 */
export async function splitSolveSession(
  sessionId: string,
  splitAfterSolveNumber: number
): Promise<{ newSession: SolveSession | null; movedCount: number; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { newSession: null, movedCount: 0, error: "Not authenticated" }

  // Verify ownership and get session details
  const { data: session, error: fetchError } = await supabase
    .from("solve_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !session) {
    return { newSession: null, movedCount: 0, error: "Session not found" }
  }

  // Create new session for the split-off solves
  const result = await createSolveSession(
    `${session.name} (split)`,
    session.event,
    session.is_tracked
  )

  if (result.error || !result.data) {
    return { newSession: null, movedCount: 0, error: result.error ?? "Failed to create session" }
  }

  // Count solves to move, then move them
  const { count } = await supabase
    .from("solves")
    .select("*", { count: "exact", head: true })
    .eq("solve_session_id", sessionId)
    .eq("user_id", user.id)
    .gt("solve_number", splitAfterSolveNumber)

  const { error: moveError } = await supabase
    .from("solves")
    .update({ solve_session_id: result.data.id })
    .eq("solve_session_id", sessionId)
    .eq("user_id", user.id)
    .gt("solve_number", splitAfterSolveNumber)

  if (moveError) {
    return { newSession: result.data, movedCount: 0, error: moveError.message }
  }

  await Promise.all([
    refreshSolveSessionSummary(sessionId),
    refreshSolveSessionSummary(result.data.id),
    refreshTimerEventAnalytics(session.event),
  ])

  return { newSession: result.data, movedCount: count ?? 0 }
}
