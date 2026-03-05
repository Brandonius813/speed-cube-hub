"use server"

import { createClient } from "@/lib/supabase/server"
import { getTodayPacific } from "@/lib/utils"
import { createTimerSessionSchema, addSolveSchema, updateSolveSchema, zodFirstError } from "@/lib/validations"
import type { TimerSession, Solve } from "@/lib/types"

export async function createTimerSession(
  event: string,
  mode: "normal" | "comp_sim" = "normal",
  solveSessionId?: string
): Promise<{ data: TimerSession | null; error?: string }> {
  const parsed = createTimerSessionSchema.safeParse({ event, mode })
  if (!parsed.success) {
    return { data: null, error: zodFirstError(parsed.error) }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "You must be logged in to use the timer." }
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    event: parsed.data.event,
    mode: parsed.data.mode,
  }
  if (solveSessionId) insertData.solve_session_id = solveSessionId

  const { data, error } = await supabase
    .from("timer_sessions")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as TimerSession }
}

/**
 * Find active timer session by solve_session_id or event (fallback).
 * When solveSessionId is provided, looks for an active timer session linked to it.
 * Falls back to event-based lookup for backward compatibility.
 */
export async function getActiveTimerSession(
  event: string,
  solveSessionId?: string
): Promise<{ data: (TimerSession & { solves: Solve[] }) | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  // Build query — prefer solve_session_id, fall back to event
  let query = supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)

  if (solveSessionId) {
    query = query.eq("solve_session_id", solveSessionId)
  } else {
    query = query.eq("event", event)
  }

  const { data: session, error: sessionError } = await query.maybeSingle()

  if (sessionError) {
    return { data: null, error: sessionError.message }
  }

  if (!session) {
    return { data: null }
  }

  // Fetch solves for this timer session
  const { data: solves, error: solvesError } = await supabase
    .from("solves")
    .select("*")
    .eq("timer_session_id", session.id)
    .order("solve_number", { ascending: true })

  if (solvesError) {
    return { data: null, error: solvesError.message }
  }

  return {
    data: {
      ...(session as TimerSession),
      solves: (solves as Solve[]) || [],
    },
  }
}

export async function addSolve(
  timerSessionId: string,
  data: {
    solve_number: number
    time_ms: number
    penalty: "+2" | "DNF" | null
    scramble: string
    event: string
    comp_sim_group: number | null
    phases?: number[] | null
    solve_session_id?: string | null
  }
): Promise<{ data: Solve | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const parsed = addSolveSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: zodFirstError(parsed.error) }
  }

  // Verify the timer session belongs to the current user
  const { data: session, error: sessionError } = await supabase
    .from("timer_sessions")
    .select("id")
    .eq("id", timerSessionId)
    .eq("user_id", user.id)
    .single()

  if (sessionError || !session) {
    return { data: null, error: "Timer session not found or not yours" }
  }

  const insertData: Record<string, unknown> = {
    timer_session_id: timerSessionId,
    user_id: user.id,
    solve_number: parsed.data.solve_number,
    time_ms: parsed.data.time_ms,
    penalty: parsed.data.penalty,
    scramble: parsed.data.scramble,
    event: parsed.data.event,
    comp_sim_group: parsed.data.comp_sim_group,
  }
  if (data.solve_session_id) insertData.solve_session_id = data.solve_session_id
  if (data.phases && data.phases.length > 0) insertData.phases = data.phases

  const { data: solve, error } = await supabase
    .from("solves")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: solve as Solve }
}

export async function updateSolve(
  solveId: string,
  data: { penalty?: "+2" | "DNF" | null; notes?: string | null }
): Promise<{ error?: string }> {
  const parsed = updateSolveSchema.safeParse(data)
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

  const updateData: Record<string, unknown> = {}
  if (parsed.data.penalty !== undefined) updateData.penalty = parsed.data.penalty
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

  const { error } = await supabase
    .from("solves")
    .update(updateData)
    .eq("id", solveId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function deleteSolve(
  solveId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("solves")
    .delete()
    .eq("id", solveId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Delete multiple solves at once. Uses Supabase .in() for a single query.
 */
export async function deleteSolves(
  solveIds: string[]
): Promise<{ error?: string }> {
  if (solveIds.length === 0) return {}

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("solves")
    .delete()
    .in("id", solveIds)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Fetch solves for a named solve session (only those after active_from).
 * Used by the timer to load solves for the current session.
 */
export async function getSolvesBySession(
  solveSessionId: string,
  activeFrom: string,
  limit = 1000,
  offset = 0,
  event?: string
): Promise<{ solves: Solve[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { solves: [], error: "Not authenticated" }
  }

  let query = supabase
    .from("solves")
    .select("*")
    .eq("user_id", user.id)
    .gte("solved_at", activeFrom)
    .order("solved_at", { ascending: true })
    .range(offset, offset + limit - 1)
    .or(`solve_session_id.eq.${solveSessionId},solve_session_id.is.null`)

  if (event) {
    query = query.eq("event", event)
  }

  const { data, error } = await query

  if (error) {
    return { solves: [], error: error.message }
  }

  return { solves: (data as Solve[]) || [] }
}

export async function getSolvesByEvent(
  event: string,
  limit = 1000,
  offset = 0
): Promise<{ solves: Solve[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { solves: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("solves")
    .select("*")
    .eq("user_id", user.id)
    .eq("event", event)
    .order("solved_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    return { solves: [], error: error.message }
  }

  return { solves: (data as Solve[]) || [] }
}

/**
 * Bulk import solves into a solve session.
 * Creates a completed timer_session, inserts all solves, and optionally
 * creates a sessions entry for the feed/stats (if the solve session is tracked
 * and skipSessionEntry is not true).
 *
 * @param solveSessionId - Target solve session to import into
 * @param event - WCA event ID
 * @param solves - Array of { time_ms, penalty, scramble, date }
 * @param options.skipSessionEntry - If true, skip creating the sessions table entry
 *   (caller handles session entries separately, e.g., per-day via createSessionsBulk)
 * @returns Count of imported solves or error
 */
export async function bulkImportSolves(
  solveSessionId: string,
  event: string,
  solves: Array<{
    time_ms: number
    penalty: "+2" | "DNF" | null
    scramble: string | null
    date: string // YYYY-MM-DD
  }>,
  options?: { skipSessionEntry?: boolean }
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

  // Verify the solve session belongs to this user
  const { data: solveSession, error: ssError } = await supabase
    .from("solve_sessions")
    .select("id, is_tracked, event")
    .eq("id", solveSessionId)
    .eq("user_id", user.id)
    .single()

  if (ssError || !solveSession) {
    return { imported: 0, error: "Solve session not found." }
  }

  // Create a completed timer_session to hold the imported solves
  const { data: timerSession, error: tsError } = await supabase
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

  if (tsError || !timerSession) {
    return { imported: 0, error: tsError?.message ?? "Failed to create timer session." }
  }

  // Assign incrementing timestamps within each day to preserve CSV order.
  // First solve of each day gets T00:00:01, second T00:00:02, etc.
  const dayCounts = new Map<string, number>()
  const solveRows = solves.map((s, i) => {
    const dayCount = (dayCounts.get(s.date) ?? 0) + 1
    dayCounts.set(s.date, dayCount)
    const seconds = String(dayCount % 60).padStart(2, "0")
    const minutes = String(Math.floor(dayCount / 60) % 60).padStart(2, "0")
    const hours = String(Math.floor(dayCount / 3600) % 24).padStart(2, "0")

    return {
      timer_session_id: timerSession.id,
      user_id: user.id,
      solve_number: i + 1,
      time_ms: s.time_ms,
      penalty: s.penalty,
      scramble: s.scramble ?? "",
      event,
      solve_session_id: solveSessionId,
      solved_at: `${s.date}T${hours}:${minutes}:${seconds}.000Z`,
    }
  })

  // Insert in batches of 500
  let totalInserted = 0
  for (let i = 0; i < solveRows.length; i += 500) {
    const batch = solveRows.slice(i, i + 500)
    const { error: insertError } = await supabase
      .from("solves")
      .insert(batch)

    if (insertError) {
      return {
        imported: totalInserted,
        error: `Imported ${totalInserted} of ${solves.length} solves. Error: ${insertError.message}`,
      }
    }
    totalInserted += batch.length
  }

  // Create a sessions entry for feed/stats unless caller handles it separately
  if (!options?.skipSessionEntry && solveSession.is_tracked) {
    const nonDnf = solves.filter((s) => s.penalty !== "DNF")
    const effectiveTimes = nonDnf.map((s) =>
      s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
    )
    const avgMs = effectiveTimes.length > 0
      ? effectiveTimes.reduce((a, b) => a + b, 0) / effectiveTimes.length
      : null
    const bestMs = effectiveTimes.length > 0
      ? Math.min(...effectiveTimes)
      : null

    // Use the most common date from the solves
    const dateCounts = new Map<string, number>()
    for (const s of solves) {
      dateCounts.set(s.date, (dateCounts.get(s.date) ?? 0) + 1)
    }
    let sessionDate = getTodayPacific()
    let maxCount = 0
    for (const [date, count] of dateCounts) {
      if (count > maxCount) {
        maxCount = count
        sessionDate = date
      }
    }

    const avgSolveMs = avgMs ?? 30000
    const durationMinutes = Math.max(1, Math.round((avgSolveMs * solves.length) / 60000))

    await supabase.from("sessions").insert({
      user_id: user.id,
      session_date: sessionDate,
      event,
      practice_type: "Solves",
      num_solves: solves.length,
      num_dnf: solves.length - nonDnf.length,
      duration_minutes: durationMinutes,
      avg_time: avgMs ? Math.round(avgMs / 10) / 100 : null,
      best_time: bestMs ? Math.round(bestMs / 10) / 100 : null,
      timer_session_id: timerSession.id,
      solve_session_id: solveSessionId,
      feed_visible: false,
      title: `Imported ${solves.length} solves`,
    })
  }

  return { imported: totalInserted }
}

export async function finalizeTimerSession(
  timerSessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Fetch the timer session
  const { data: timerSession, error: tsError } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("id", timerSessionId)
    .eq("user_id", user.id)
    .single()

  if (tsError || !timerSession) {
    return { error: "Timer session not found" }
  }

  // Prevent double finalization (e.g., from a double-click)
  if (timerSession.status === "completed") {
    return {}
  }

  // Fetch all solves
  const { data: solves, error: solvesError } = await supabase
    .from("solves")
    .select("*")
    .eq("timer_session_id", timerSessionId)
    .order("solve_number", { ascending: true })

  if (solvesError) {
    return { error: solvesError.message }
  }

  if (!solves || solves.length === 0) {
    // No solves — just mark as completed without creating a session
    await supabase
      .from("timer_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", timerSessionId)

    return {}
  }

  // Compute aggregates
  const nonDnfSolves = solves.filter(
    (s: Solve) => s.penalty !== "DNF"
  )

  const effectiveTimes = nonDnfSolves.map((s: Solve) => {
    if (s.penalty === "+2") return s.time_ms + 2000
    return s.time_ms
  })

  const numSolves = solves.length
  const numDnf = solves.filter((s: Solve) => s.penalty === "DNF").length
  const bestTimeMs =
    effectiveTimes.length > 0 ? Math.min(...effectiveTimes) : null
  const avgTimeMs =
    effectiveTimes.length > 0
      ? effectiveTimes.reduce((a: number, b: number) => a + b, 0) /
        effectiveTimes.length
      : null

  // Duration: time from first solve to last solve
  const firstSolveAt = new Date(solves[0].solved_at).getTime()
  const lastSolveAt = new Date(solves[solves.length - 1].solved_at).getTime()
  const durationMinutes = Math.max(
    1,
    Math.round((lastSolveAt - firstSolveAt) / 60000)
  )

  // Convert ms to decimal seconds for the sessions table
  const avgTimeSeconds = avgTimeMs
    ? Math.round(avgTimeMs / 10) / 100 // Round to centiseconds (2 decimal places)
    : null
  const bestTimeSeconds = bestTimeMs
    ? Math.round(bestTimeMs / 10) / 100 // Round to centiseconds (2 decimal places)
    : null

  // Today's date in YYYY-MM-DD format (Pacific Time, not UTC)
  const sessionDate = getTodayPacific()

  const practiceType =
    timerSession.mode === "comp_sim" ? "Comp Sim" : "Solves"

  // Check if the solve session is tracked — untracked sessions skip the sessions row
  let isTracked = true
  if (timerSession.solve_session_id) {
    const { data: solveSession } = await supabase
      .from("solve_sessions")
      .select("is_tracked")
      .eq("id", timerSession.solve_session_id)
      .single()

    if (solveSession) {
      isTracked = solveSession.is_tracked
    }
  }

  let sessionId: string | null = null

  if (isTracked) {
    // Create the sessions row (only for tracked solve sessions)
    const sessionInsert: Record<string, unknown> = {
      user_id: user.id,
      session_date: sessionDate,
      event: timerSession.event,
      practice_type: practiceType,
      num_solves: numSolves,
      num_dnf: numDnf,
      duration_minutes: durationMinutes,
      avg_time: avgTimeSeconds,
      best_time: bestTimeSeconds,
      timer_session_id: timerSessionId,
      feed_visible: true,
      title: `${numSolves} solve${numSolves !== 1 ? "s" : ""} — Timer Session`,
    }
    if (timerSession.solve_session_id) {
      sessionInsert.solve_session_id = timerSession.solve_session_id
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert(sessionInsert)
      .select("id")
      .single()

    if (sessionError) {
      return { error: sessionError.message }
    }

    sessionId = session?.id || null
  }

  // Link the timer session to the sessions row and mark completed
  await supabase
    .from("timer_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      session_id: sessionId,
    })
    .eq("id", timerSessionId)

  return {}
}

/**
 * Lightweight count of solves for a solve session.
 * Used by the timer to check if a cross-device sync is needed.
 */
export async function getSolveCountBySession(
  solveSessionId: string,
  activeFrom: string,
  event?: string
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { count: 0, error: "Not authenticated" }
  }

  let query = supabase
    .from("solves")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("solved_at", activeFrom)
    .or(`solve_session_id.eq.${solveSessionId},solve_session_id.is.null`)

  if (event) {
    query = query.eq("event", event)
  }

  const { count, error } = await query

  if (error) {
    return { count: 0, error: error.message }
  }

  return { count: count ?? 0 }
}

/**
 * Lightweight count of solves by event.
 * Used when event-wide timer analytics need a fast count check.
 */
export async function getSolveCountByEvent(
  event: string
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { count: 0, error: "Not authenticated" }
  }

  const { count, error } = await supabase
    .from("solves")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("event", event)

  if (error) {
    return { count: 0, error: error.message }
  }

  return { count: count ?? 0 }
}
