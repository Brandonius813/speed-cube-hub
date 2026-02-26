"use server"

import { createClient } from "@/lib/supabase/server"
import { getTodayPacific } from "@/lib/utils"
import type { TimerSession, Solve } from "@/lib/types"

export async function createTimerSession(
  event: string,
  mode: "normal" | "comp_sim" = "normal"
): Promise<{ data: TimerSession | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "You must be logged in to use the timer." }
  }

  const { data, error } = await supabase
    .from("timer_sessions")
    .insert({
      user_id: user.id,
      event,
      mode,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as TimerSession }
}

export async function getActiveTimerSession(
  event: string
): Promise<{ data: (TimerSession & { solves: Solve[] }) | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  // Find active timer session for this event
  const { data: session, error: sessionError } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("event", event)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sessionError) {
    return { data: null, error: sessionError.message }
  }

  if (!session) {
    return { data: null }
  }

  // Fetch solves for this session
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
  }
): Promise<{ data: Solve | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data: solve, error } = await supabase
    .from("solves")
    .insert({
      timer_session_id: timerSessionId,
      user_id: user.id,
      solve_number: data.solve_number,
      time_ms: data.time_ms,
      penalty: data.penalty,
      scramble: data.scramble,
      event: data.event,
      comp_sim_group: data.comp_sim_group,
    })
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const updateData: Record<string, unknown> = {}
  if (data.penalty !== undefined) updateData.penalty = data.penalty
  if (data.notes !== undefined) updateData.notes = data.notes

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

export async function getSolvesByEvent(
  event: string,
  limit = 5000
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
    .limit(limit)

  if (error) {
    return { solves: [], error: error.message }
  }

  return { solves: (data as Solve[]) || [] }
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
  const avgTimeSeconds = avgTimeMs ? Math.round(avgTimeMs) / 1000 : null
  const bestTimeSeconds = bestTimeMs ? bestTimeMs / 1000 : null

  // Today's date in YYYY-MM-DD format (Pacific Time, not UTC)
  const sessionDate = getTodayPacific()

  const practiceType =
    timerSession.mode === "comp_sim" ? "Comp Sim" : "Solves"

  // Create the sessions row
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
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
    })
    .select("id")
    .single()

  if (sessionError) {
    return { error: sessionError.message }
  }

  // Link the timer session to the sessions row and mark completed
  await supabase
    .from("timer_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      session_id: session?.id || null,
    })
    .eq("id", timerSessionId)

  return {}
}
