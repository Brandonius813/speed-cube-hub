"use server"

import { msToTruncatedSeconds } from "@/lib/timer/averages"
import { createClient } from "@/lib/supabase/server"
import { getTodayPacific } from "@/lib/utils"
import { createTimerSessionSchema, addSolveSchema, updateSolveSchema, zodFirstError } from "@/lib/validations"
import type { TimerSession, Solve } from "@/lib/types"
import type { SessionGroupMeta } from "@/lib/timer/session-dividers"
import { markOnboardingStepComplete } from "@/lib/actions/onboarding"
import {
  refreshSolveSessionSummary,
  refreshTimerEventAnalytics,
} from "@/lib/actions/timer-analytics"
import {
  computeFixedMilestoneRows,
  milestoneRowsToSessionPatch,
} from "@/lib/actions/timer-milestone-helpers"

const TIMER_SESSION_SELECT_COLUMNS = [
  "id",
  "user_id",
  "event",
  "mode",
  "status",
  "started_at",
  "ended_at",
  "session_id",
  "solve_session_id",
  "created_at",
].join(", ")

const SOLVE_SELECT_COLUMNS = [
  "id",
  "timer_session_id",
  "user_id",
  "solve_number",
  "time_ms",
  "penalty",
  "scramble",
  "event",
  "comp_sim_group",
  "notes",
  "solve_session_id",
  "solved_at",
  "created_at",
].join(", ")

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
    .select(TIMER_SESSION_SELECT_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as TimerSession }
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
    .select(TIMER_SESSION_SELECT_COLUMNS)
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

  const typedSession = session as unknown as TimerSession | null

  if (!typedSession) {
    return { data: null }
  }

  // Fetch solves for this timer session
  const { data: solves, error: solvesError } = await supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("timer_session_id", typedSession.id)
    .order("solve_number", { ascending: true })

  if (solvesError) {
    return { data: null, error: solvesError.message }
  }

  const typedSolves = (solves as unknown as Solve[] | null) ?? []

  return {
    data: {
      ...typedSession,
      solves: typedSolves,
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
    practice_type?: string
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
    practice_type: data.practice_type ?? "Solves",
  }
  if (data.solve_session_id) insertData.solve_session_id = data.solve_session_id
  if (data.phases && data.phases.length > 0) insertData.phases = data.phases

  const { data: solve, error } = await supabase
    .from("solves")
    .insert(insertData)
    .select(SOLVE_SELECT_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  await Promise.all([
    refreshTimerEventAnalytics(parsed.data.event),
    data.solve_session_id ? refreshSolveSessionSummary(data.solve_session_id) : Promise.resolve({}),
    markOnboardingStepComplete("first_timer_solve"),
  ])

  return { data: solve as unknown as Solve }
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

  const shouldRefreshAnalytics = parsed.data.penalty !== undefined
  let targetSolve: Pick<Solve, "event" | "solve_session_id"> | null = null
  if (shouldRefreshAnalytics) {
    const { data: existingSolve, error: existingError } = await supabase
      .from("solves")
      .select("event, solve_session_id")
      .eq("id", solveId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) {
      return { error: existingError.message }
    }
    targetSolve = (existingSolve as Pick<Solve, "event" | "solve_session_id"> | null) ?? null
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

  if (shouldRefreshAnalytics && targetSolve) {
    await Promise.all([
      refreshTimerEventAnalytics(targetSolve.event),
      targetSolve.solve_session_id
        ? refreshSolveSessionSummary(targetSolve.solve_session_id)
        : Promise.resolve({}),
    ])
  }

  return {}
}

type DeleteSolveFallback = {
  event: string
  time_ms: number
  penalty: "+2" | "DNF" | null
  scramble: string
}

export async function deleteSolve(
  solveId: string,
  fallback?: DeleteSolveFallback
): Promise<{ error?: string; deleted?: boolean }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: existingSolve, error: existingError } = await supabase
    .from("solves")
    .select("event, solve_session_id")
    .eq("id", solveId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (existingError) {
    return { error: existingError.message }
  }

  const { data: deletedRows, error } = await supabase
    .from("solves")
    .delete()
    .eq("id", solveId)
    .eq("user_id", user.id)
    .select("id")

  if (error) {
    return { error: error.message }
  }

  if ((deletedRows?.length ?? 0) > 0) {
    const targetSolve = (existingSolve as Pick<Solve, "event" | "solve_session_id"> | null) ?? null
    if (targetSolve) {
      await Promise.all([
        refreshTimerEventAnalytics(targetSolve.event),
        targetSolve.solve_session_id
          ? refreshSolveSessionSummary(targetSolve.solve_session_id)
          : Promise.resolve({}),
      ])
    }
    return { deleted: true }
  }

  if (!fallback) {
    return { deleted: false }
  }

  // Legacy local solve IDs can differ from DB IDs after session saves.
  // Fallback to a best-match lookup so delete persists across navigation.
  let fallbackQuery = supabase
    .from("solves")
    .select("id")
    .eq("user_id", user.id)
    .eq("event", fallback.event)
    .eq("time_ms", fallback.time_ms)
    .eq("scramble", fallback.scramble)
    .order("solved_at", { ascending: false })
    .limit(1)

  if (fallback.penalty === null) {
    fallbackQuery = fallbackQuery.is("penalty", null)
  } else {
    fallbackQuery = fallbackQuery.eq("penalty", fallback.penalty)
  }

  const { data: matches, error: matchError } = await fallbackQuery
  if (matchError) {
    return { error: matchError.message }
  }

  const fallbackId = matches?.[0]?.id
  if (!fallbackId) {
    return { deleted: false }
  }

  const { error: fallbackDeleteError } = await supabase
    .from("solves")
    .delete()
    .eq("id", fallbackId)
    .eq("user_id", user.id)

  if (fallbackDeleteError) {
    return { error: fallbackDeleteError.message }
  }

  await refreshTimerEventAnalytics(fallback.event)

  return { deleted: true }
}

/**
 * Delete multiple solves at once. Chunks .in() calls to avoid URL length limits.
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

  const CHUNK_SIZE = 200

  // Fetch affected solves in chunks
  const affectedSolves: Array<{ event: string; solve_session_id: string | null; timer_session_id: string | null }> = []
  for (let i = 0; i < solveIds.length; i += CHUNK_SIZE) {
    const chunk = solveIds.slice(i, i + CHUNK_SIZE)
    const { data, error } = await supabase
      .from("solves")
      .select("event, solve_session_id, timer_session_id")
      .in("id", chunk)
      .eq("user_id", user.id)
    if (error) return { error: error.message }
    if (data) affectedSolves.push(...data)
  }

  // Delete in chunks
  for (let i = 0; i < solveIds.length; i += CHUNK_SIZE) {
    const chunk = solveIds.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from("solves")
      .delete()
      .in("id", chunk)
      .eq("user_id", user.id)
    if (error) return { error: error.message }
  }

  const events = new Set<string>()
  const solveSessionIds = new Set<string>()
  const timerSessionIds = new Set<string>()
  for (const row of affectedSolves) {
    events.add(row.event)
    if (row.solve_session_id) solveSessionIds.add(row.solve_session_id)
    if (row.timer_session_id) timerSessionIds.add(row.timer_session_id)
  }

  // Refresh analytics + update sessions.num_solves to reflect actual remaining counts
  await Promise.all([
    ...Array.from(events).map((event) => refreshTimerEventAnalytics(event)),
    ...Array.from(solveSessionIds).map((solveSessionId) => refreshSolveSessionSummary(solveSessionId)),
    ...Array.from(timerSessionIds).map(async (tsId) => {
      const { count } = await supabase
        .from("solves")
        .select("id", { count: "exact", head: true })
        .eq("timer_session_id", tsId)
        .eq("user_id", user.id)
      const { count: dnfCount } = await supabase
        .from("solves")
        .select("id", { count: "exact", head: true })
        .eq("timer_session_id", tsId)
        .eq("user_id", user.id)
        .eq("penalty", "DNF")
      await supabase
        .from("sessions")
        .update({ num_solves: count ?? 0, num_dnf: dnfCount ?? 0 })
        .eq("timer_session_id", tsId)
        .eq("user_id", user.id)
    }),
  ])

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
    .select(SOLVE_SELECT_COLUMNS)
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

  return { solves: ((data as unknown as Solve[] | null) ?? []) }
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
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("event", event)
    .order("solved_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    return { solves: [], error: error.message }
  }

  return { solves: ((data as unknown as Solve[] | null) ?? []) }
}

type SessionDividerRow = {
  id: string
  timer_session_id: string | null
  title: string | null
  created_at: string
  num_solves: number | null
  num_dnf: number | null
  duration_minutes: number | null
  avg_time: number | null
  best_time: number | null
  practice_type: string
}

/**
 * Fetch session-divider metadata keyed by timer_session_id.
 * Used by the timer to show real saved-session titles after cross-device sync.
 */
export async function getSessionDividerGroupsByTimerSession(
  event: string,
  timerSessionIds: string[]
): Promise<{ data: SessionGroupMeta[]; error?: string }> {
  const uniqueTimerSessionIds = Array.from(
    new Set(
      timerSessionIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  )

  if (uniqueTimerSessionIds.length === 0) {
    return { data: [] }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, timer_session_id, title, created_at, num_solves, num_dnf, duration_minutes, avg_time, best_time, practice_type"
    )
    .eq("user_id", user.id)
    .eq("event", event)
    .in("timer_session_id", uniqueTimerSessionIds)

  if (error) {
    return { data: [], error: error.message }
  }

  const byTimerSessionId = new Map<string, SessionGroupMeta>()

  for (const row of (data ?? []) as SessionDividerRow[]) {
    if (!row.timer_session_id) continue
    const savedAtMs = new Date(row.created_at).getTime()
    const savedAt = Number.isFinite(savedAtMs) ? savedAtMs : Date.now()
    const group: SessionGroupMeta = {
      id: row.timer_session_id,
      sessionId: row.id,
      timerSessionId: row.timer_session_id,
      title: row.title?.trim() || "Saved Session",
      savedAt,
      solveCount: row.num_solves ?? 0,
      durationMinutes: row.duration_minutes ?? undefined,
      numDnf: row.num_dnf ?? undefined,
      avgSeconds: row.avg_time ?? null,
      bestSeconds: row.best_time ?? null,
      practiceType: row.practice_type ?? undefined,
    }

    const existing = byTimerSessionId.get(row.timer_session_id)
    if (!existing || group.savedAt > existing.savedAt) {
      byTimerSessionId.set(row.timer_session_id, group)
    }
  }

  return { data: Array.from(byTimerSessionId.values()) }
}

export async function updateTimerSessionDuration(
  sessionId: string,
  durationMinutes: number
): Promise<{ error?: string }> {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    return { error: "Duration must be a whole number of minutes between 1 and 1440." }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be logged in to edit a timer session." }
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, timer_session_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (sessionError || !session) {
    return { error: sessionError?.message ?? "Timer session not found." }
  }

  if (!session.timer_session_id) {
    return { error: "Only timer-backed sessions can be edited here." }
  }

  const { error } = await supabase
    .from("sessions")
    .update({ duration_minutes: durationMinutes })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
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
    const sessionMilestonePatch = milestoneRowsToSessionPatch(
      computeFixedMilestoneRows(solves)
    )

    await supabase.from("sessions").insert({
      user_id: user.id,
      session_date: sessionDate,
      event,
      practice_type: "Solves",
      num_solves: solves.length,
      num_dnf: solves.length - nonDnf.length,
      duration_minutes: durationMinutes,
      avg_time: avgMs ? msToTruncatedSeconds(avgMs) : null,
      best_time: bestMs ? msToTruncatedSeconds(bestMs) : null,
      ...sessionMilestonePatch,
      timer_session_id: timerSession.id,
      solve_session_id: solveSessionId,
      feed_visible: false,
      title: `Imported ${solves.length} solves`,
    })
  }

  await Promise.all([
    refreshTimerEventAnalytics(event),
    refreshSolveSessionSummary(solveSessionId),
  ])

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
    .select(TIMER_SESSION_SELECT_COLUMNS)
    .eq("id", timerSessionId)
    .eq("user_id", user.id)
    .single()

  if (tsError || !timerSession) {
    return { error: "Timer session not found" }
  }

  const typedTimerSession = timerSession as unknown as TimerSession

  // Prevent double finalization (e.g., from a double-click)
  if (typedTimerSession.status === "completed") {
    return {}
  }

  // Fetch all solves
  const { data: solves, error: solvesError } = await supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("timer_session_id", timerSessionId)
    .order("solve_number", { ascending: true })

  if (solvesError) {
    return { error: solvesError.message }
  }

  const typedSolves = ((solves as unknown as Solve[] | null) ?? [])

  if (typedSolves.length === 0) {
    // No solves — just mark as completed without creating a session
    await supabase
      .from("timer_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", timerSessionId)

    return {}
  }

  // Compute aggregates
  const nonDnfSolves = typedSolves.filter(
    (s: Solve) => s.penalty !== "DNF"
  )

  const effectiveTimes = nonDnfSolves.map((s: Solve) => {
    if (s.penalty === "+2") return s.time_ms + 2000
    return s.time_ms
  })

  const numSolves = typedSolves.length
  const numDnf = typedSolves.filter((s: Solve) => s.penalty === "DNF").length
  const bestTimeMs =
    effectiveTimes.length > 0 ? Math.min(...effectiveTimes) : null
  const avgTimeMs =
    effectiveTimes.length > 0
      ? effectiveTimes.reduce((a: number, b: number) => a + b, 0) /
        effectiveTimes.length
      : null

  // Duration: time from first solve to last solve
  const firstSolveAt = new Date(typedSolves[0].solved_at).getTime()
  const lastSolveAt = new Date(typedSolves[typedSolves.length - 1].solved_at).getTime()
  const durationMinutes = Math.max(
    1,
    Math.round((lastSolveAt - firstSolveAt) / 60000)
  )

  // Convert ms to decimal seconds for the sessions table
  const avgTimeSeconds = avgTimeMs
    ? msToTruncatedSeconds(avgTimeMs)
    : null
  const bestTimeSeconds = bestTimeMs
    ? msToTruncatedSeconds(bestTimeMs)
    : null
  const sessionMilestonePatch = milestoneRowsToSessionPatch(
    computeFixedMilestoneRows(typedSolves)
  )

  // Today's date in YYYY-MM-DD format (Pacific Time, not UTC)
  const sessionDate = getTodayPacific()

  const practiceType =
    typedTimerSession.mode === "comp_sim" ? "Comp Sim" : "Solves"

  // Check if the solve session is tracked — untracked sessions skip the sessions row
  let isTracked = true
  if (typedTimerSession.solve_session_id) {
    const { data: solveSession } = await supabase
      .from("solve_sessions")
      .select("is_tracked")
      .eq("id", typedTimerSession.solve_session_id)
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
      event: typedTimerSession.event,
      practice_type: practiceType,
      num_solves: numSolves,
      num_dnf: numDnf,
      duration_minutes: durationMinutes,
      avg_time: avgTimeSeconds,
      best_time: bestTimeSeconds,
      ...sessionMilestonePatch,
      timer_session_id: timerSessionId,
      feed_visible: true,
      title: `${numSolves} solve${numSolves !== 1 ? "s" : ""} — Timer Session`,
    }
    if (typedTimerSession.solve_session_id) {
      sessionInsert.solve_session_id = typedTimerSession.solve_session_id
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
