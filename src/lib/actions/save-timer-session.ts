"use server"

import { msToTruncatedSeconds } from "@/lib/timer/averages"
import { createClient } from "@/lib/supabase/server"
import { getTodayPacific } from "@/lib/utils"
import { getOrCreateDefaultSession } from "@/lib/actions/solve-sessions"

export async function saveTimerSession(data: {
  event: string
  solves: Array<{
    time_ms: number
    penalty: "+2" | "DNF" | null
    scramble: string
    notes?: string | null
    phases?: number[] | null
    solved_at?: string
    comp_sim_group?: number | null
  }>
  duration_minutes: number
  practice_type: string
  title: string | null
  notes: string | null
  feed_visible: boolean
  session_start_ms: number // timestamp when session started (Date.now())
}): Promise<{ error?: string }> {
  if (data.solves.length === 0) {
    return { error: "No solves to save." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "You must be logged in to save a session." }
  }

  const durationMinutes = Math.max(1, Math.round(data.duration_minutes))
  const sessionDate = getTodayPacific()
  const startedAt = new Date(data.session_start_ms).toISOString()
  const endedAt = new Date().toISOString()
  const { data: solveSession, error: solveSessionError } =
    await getOrCreateDefaultSession(data.event)
  if (solveSessionError || !solveSession) {
    return { error: solveSessionError ?? "Failed to load solve session." }
  }

  // 1. Create the timer_sessions row
  const { data: timerSession, error: tsError } = await supabase
    .from("timer_sessions")
    .insert({
      user_id: user.id,
      event: data.event,
      mode: data.practice_type === "Comp Sim" ? "comp_sim" : "normal",
      status: "completed",
      started_at: startedAt,
      ended_at: endedAt,
      solve_session_id: solveSession.id,
    })
    .select("id")
    .single()

  if (tsError || !timerSession) {
    return { error: tsError?.message ?? "Failed to create timer session." }
  }

  // 2. Bulk insert all solves in one query
  const solveRows = data.solves.map((s, i) => {
    const row: Record<string, unknown> = {
      timer_session_id: timerSession.id,
      user_id: user.id,
      solve_number: i + 1,
      time_ms: s.time_ms,
      penalty: s.penalty,
      scramble: s.scramble,
      event: data.event,
      comp_sim_group: s.comp_sim_group ?? null,
      notes: s.notes ?? null,
      solve_session_id: solveSession.id,
    }

    if (s.phases && s.phases.length > 0) {
      row.phases = s.phases
    }

    if (s.solved_at) {
      row.solved_at = s.solved_at
    }

    return row
  })

  const { error: solvesError } = await supabase.from("solves").insert(solveRows)
  if (solvesError) {
    return { error: solvesError.message }
  }

  // 3. Compute stats from the solve data
  const nonDnf = data.solves.filter((s) => s.penalty !== "DNF")
  const effectiveTimes = nonDnf.map((s) =>
    s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
  )
  const avgMs = effectiveTimes.length > 0
    ? effectiveTimes.reduce((a, b) => a + b, 0) / effectiveTimes.length
    : null
  const bestMs = effectiveTimes.length > 0 ? Math.min(...effectiveTimes) : null

  // Convert ms → decimal seconds by truncating to centiseconds.
  const avgSeconds = avgMs ? msToTruncatedSeconds(avgMs) : null
  const bestSeconds = bestMs ? msToTruncatedSeconds(bestMs) : null

  // 4. Create the sessions row (the log entry that appears in feed + stats)
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      session_date: sessionDate,
      event: data.event,
      practice_type: data.practice_type,
      num_solves: data.solves.length,
      num_dnf: data.solves.length - nonDnf.length,
      duration_minutes: durationMinutes,
      avg_time: avgSeconds,
      best_time: bestSeconds,
      title: data.title || null,
      notes: data.notes || null,
      feed_visible: data.feed_visible,
      timer_session_id: timerSession.id,
      solve_session_id: solveSession.id,
    })
    .select("id")
    .single()

  if (sessionError) {
    return { error: sessionError.message }
  }

  // 5. Link timer_session back to the sessions row
  if (session) {
    await supabase
      .from("timer_sessions")
      .update({ session_id: session.id })
      .eq("id", timerSession.id)
  }

  return {}
}
