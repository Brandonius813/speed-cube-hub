"use server"

import { createClient } from "@/lib/supabase/server"
import {
  createSolveSessionSchema,
  updateSolveSessionSchema,
  zodFirstError,
} from "@/lib/validations"
import type { SolveSession } from "@/lib/types"

/**
 * Fetch all non-archived solve sessions for the current user.
 * Returns sessions grouped by event implicitly (ordered by sort_order).
 */
export async function getUserSolveSessions(): Promise<{
  data: SolveSession[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("solve_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data as SolveSession[]) || [] }
}

/**
 * Fetch a single solve session by ID (with solve count).
 */
export async function getSolveSession(
  id: string
): Promise<{ data: SolveSession | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("solve_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Get solve count (only solves after active_from)
  const { count } = await supabase
    .from("solves")
    .select("id", { count: "exact", head: true })
    .eq("solve_session_id", id)
    .gte("solved_at", data.active_from)

  return {
    data: { ...(data as SolveSession), solve_count: count ?? 0 },
  }
}

/**
 * Create a new named solve session.
 */
export async function createSolveSession(
  name: string,
  event: string,
  isTracked = true
): Promise<{ data: SolveSession | null; error?: string }> {
  const parsed = createSolveSessionSchema.safeParse({
    name,
    event,
    is_tracked: isTracked,
  })
  if (!parsed.success) {
    return { data: null, error: zodFirstError(parsed.error) }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  // Get the next sort_order for this user
  const { data: existing } = await supabase
    .from("solve_sessions")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = existing ? existing.sort_order + 1 : 0

  const { data, error } = await supabase
    .from("solve_sessions")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      event: parsed.data.event,
      is_tracked: parsed.data.is_tracked,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as SolveSession }
}

/**
 * Update a solve session (rename, change tracked status).
 */
export async function updateSolveSession(
  id: string,
  updates: { name?: string; is_tracked?: boolean; sort_order?: number }
): Promise<{ error?: string }> {
  const parsed = updateSolveSessionSchema.safeParse(updates)
  if (!parsed.success) {
    return { error: zodFirstError(parsed.error) }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.is_tracked !== undefined) updateData.is_tracked = parsed.data.is_tracked
  if (parsed.data.sort_order !== undefined) updateData.sort_order = parsed.data.sort_order

  const { error } = await supabase
    .from("solve_sessions")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Reset a solve session — sets active_from to now.
 * This effectively clears the visible solve list without deleting data.
 * Finalizes any active timer_session first.
 */
export async function resetSolveSession(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify ownership
  const { data: session, error: fetchError } = await supabase
    .from("solve_sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !session) {
    return { error: "Solve session not found" }
  }

  // Finalize any active timer_session linked to this solve session
  const { data: activeTimerSession } = await supabase
    .from("timer_sessions")
    .select("id")
    .eq("solve_session_id", id)
    .eq("status", "active")
    .maybeSingle()

  if (activeTimerSession) {
    await supabase
      .from("timer_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", activeTimerSession.id)
  }

  // Update active_from to now
  const { error } = await supabase
    .from("solve_sessions")
    .update({
      active_from: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Archive a solve session (soft delete — hides from session list).
 */
export async function archiveSolveSession(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("solve_sessions")
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function unarchiveSolveSession(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("solve_sessions")
    .update({
      is_archived: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Hard delete a solve session.
 * Solves get solve_session_id set to NULL (preserved in DB).
 */
export async function deleteSolveSession(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("solve_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Find an existing default session for an event, or create one.
 * Used when a user opens the timer for the first time or switches to an event
 * that doesn't have a session yet.
 */
export async function getOrCreateDefaultSession(
  event: string
): Promise<{ data: SolveSession | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  // Try to find an existing non-archived session for this event
  const { data: existing, error: findError } = await supabase
    .from("solve_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("event", event)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (findError) {
    return { data: null, error: findError.message }
  }

  if (existing) {
    return { data: existing as SolveSession }
  }

  // Create a new default session
  return createSolveSession("Session 1", event)
}
