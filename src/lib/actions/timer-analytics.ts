"use server"

import { createClient } from "@/lib/supabase/server"
import type {
  EventSummary,
  Solve,
  SolveDailyRollup,
  SolveSessionSummary,
  TimerAnalyticsDistributionBucket,
  TimerAnalyticsTrendPoint,
  TimerEventAnalytics,
} from "@/lib/types"

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
  "phases",
  "solve_session_id",
  "solved_at",
  "created_at",
].join(", ")

const EVENT_SUMMARY_SELECT_COLUMNS = [
  "user_id",
  "event",
  "solve_count",
  "dnf_count",
  "valid_solve_count",
  "total_effective_time_ms",
  "best_single_ms",
  "mean_ms",
  "first_solved_at",
  "last_solved_at",
  "updated_at",
].join(", ")

const SOLVE_SESSION_SUMMARY_SELECT_COLUMNS = [
  "solve_session_id",
  "user_id",
  "event",
  "solve_count",
  "dnf_count",
  "valid_solve_count",
  "total_effective_time_ms",
  "best_single_ms",
  "mean_ms",
  "first_solved_at",
  "last_solved_at",
  "updated_at",
].join(", ")

const DAILY_ROLLUP_SELECT_COLUMNS = [
  "user_id",
  "event",
  "local_date",
  "solve_count",
  "dnf_count",
  "valid_solve_count",
  "total_effective_time_ms",
  "best_single_ms",
  "mean_ms",
  "updated_at",
].join(", ")

export type SolveWindowCursor = {
  solvedAt: string
  id: string
}

function labelDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
  })
}

function labelMonth(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    year: "2-digit",
  })
}

function labelYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
  })
}

function buildTrendPoints(daily: SolveDailyRollup[]): TimerAnalyticsTrendPoint[] {
  if (daily.length === 0) return []

  const dates = daily.map((entry) => new Date(`${entry.local_date}T12:00:00-08:00`).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const daySpan = Math.max(1, Math.ceil((maxDate - minDate) / 86_400_000) + 1)

  if (daySpan <= 45) {
    return daily.map((entry) => ({
      label: labelDate(new Date(`${entry.local_date}T12:00:00-08:00`)),
      local_date: entry.local_date,
      solve_count: entry.solve_count,
      mean_ms: entry.mean_ms,
      best_single_ms: entry.best_single_ms,
    }))
  }

  if (daySpan <= 180) {
    const grouped = new Map<string, SolveDailyRollup[]>()
    for (const entry of daily) {
      const date = new Date(`${entry.local_date}T12:00:00-08:00`)
      const weekStart = new Date(date)
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
      const key = weekStart.toISOString().slice(0, 10)
      const rows = grouped.get(key) ?? []
      rows.push(entry)
      grouped.set(key, rows)
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([localDate, rows]) => {
        const validRows = rows.filter((row) => row.valid_solve_count > 0)
        const totalEffective = validRows.reduce((sum, row) => sum + row.total_effective_time_ms, 0)
        const totalValid = validRows.reduce((sum, row) => sum + row.valid_solve_count, 0)
        return {
          label: labelDate(new Date(`${localDate}T12:00:00-08:00`)),
          local_date: localDate,
          solve_count: rows.reduce((sum, row) => sum + row.solve_count, 0),
          mean_ms: totalValid > 0 ? Math.round(totalEffective / totalValid) : null,
          best_single_ms: validRows.length > 0
            ? Math.min(...validRows.map((row) => row.best_single_ms).filter((value): value is number => value !== null))
            : null,
        }
      })
  }

  const grouped = new Map<string, SolveDailyRollup[]>()
  for (const entry of daily) {
    const key = entry.local_date.slice(0, 7)
    const rows = grouped.get(key) ?? []
    rows.push(entry)
    grouped.set(key, rows)
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([localDate, rows]) => {
      const validRows = rows.filter((row) => row.valid_solve_count > 0)
      const totalEffective = validRows.reduce((sum, row) => sum + row.total_effective_time_ms, 0)
      const totalValid = validRows.reduce((sum, row) => sum + row.valid_solve_count, 0)
      const monthDate = new Date(`${localDate}-01T12:00:00-08:00`)
      return {
        label: daySpan <= 730 ? labelMonth(monthDate) : labelYear(monthDate),
        local_date: localDate,
        solve_count: rows.reduce((sum, row) => sum + row.solve_count, 0),
        mean_ms: totalValid > 0 ? Math.round(totalEffective / totalValid) : null,
        best_single_ms: validRows.length > 0
          ? Math.min(...validRows.map((row) => row.best_single_ms).filter((value): value is number => value !== null))
          : null,
      }
    })
}

function buildCursorFilter(cursor: SolveWindowCursor, inclusive = false): string {
  const comparator = inclusive ? "lte" : "lt"
  return `solved_at.lt.${cursor.solvedAt},and(solved_at.eq.${cursor.solvedAt},id.${comparator}.${cursor.id})`
}

export async function refreshTimerEventAnalytics(event: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.rpc("refresh_timer_event_analytics", {
    p_user_id: user.id,
    p_event: event,
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function refreshSolveSessionSummary(
  solveSessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.rpc("refresh_solve_session_summary", {
    p_user_id: user.id,
    p_solve_session_id: solveSessionId,
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function getSolveSessionSummary(
  solveSessionId: string
): Promise<{ data: SolveSessionSummary | null; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("solve_session_summaries")
    .select(SOLVE_SESSION_SUMMARY_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("solve_session_id", solveSessionId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: (data as unknown as SolveSessionSummary | null) ?? null }
}

export async function listSolveSessionWindow(params: {
  solveSessionId: string
  limit?: number
  cursor?: SolveWindowCursor
}): Promise<{ solves: Solve[]; nextCursor: SolveWindowCursor | null; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { solves: [], nextCursor: null, error: "Not authenticated" }
  }

  const limit = Math.min(Math.max(params.limit ?? 200, 1), 1000)
  let query = supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("solve_session_id", params.solveSessionId)
    .order("solved_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit)

  if (params.cursor) {
    query = query.or(buildCursorFilter(params.cursor))
  }

  const { data, error } = await query

  if (error) {
    return { solves: [], nextCursor: null, error: error.message }
  }

  const solves = ((data as unknown as Solve[] | null) ?? []).reverse()
  const newestFirst = (data as unknown as Solve[] | null) ?? []
  const last = newestFirst[newestFirst.length - 1] ?? null

  return {
    solves,
    nextCursor: last ? { solvedAt: last.solved_at, id: last.id } : null,
  }
}

export async function listEventSolveWindow(params: {
  event: string
  limit?: number
  cursor?: SolveWindowCursor
}): Promise<{ solves: Solve[]; nextCursor: SolveWindowCursor | null; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { solves: [], nextCursor: null, error: "Not authenticated" }
  }

  const limit = Math.min(Math.max(params.limit ?? 200, 1), 1000)
  let query = supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("event", params.event)
    .order("solved_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit)

  if (params.cursor) {
    query = query.or(buildCursorFilter(params.cursor))
  }

  const { data, error } = await query

  if (error) {
    return { solves: [], nextCursor: null, error: error.message }
  }

  const newestFirst = (data as unknown as Solve[] | null) ?? []
  const last = newestFirst[newestFirst.length - 1] ?? null

  return {
    solves: newestFirst.reverse(),
    nextCursor: last ? { solvedAt: last.solved_at, id: last.id } : null,
  }
}

export async function getEventHistoryBootstrap(params: {
  event: string
  limit?: number
}): Promise<{
  solves: Solve[]
  totalCount: number
  nextCursor: SolveWindowCursor | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      solves: [],
      totalCount: 0,
      nextCursor: null,
      error: "Not authenticated",
    }
  }

  const limit = Math.min(Math.max(params.limit ?? 200, 1), 1000)
  const { data, count, error } = await supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS, { count: "exact" })
    .eq("user_id", user.id)
    .eq("event", params.event)
    .order("solved_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit)

  if (error) {
    return {
      solves: [],
      totalCount: 0,
      nextCursor: null,
      error: error.message,
    }
  }

  const newestFirst = (data as unknown as Solve[] | null) ?? []
  const last = newestFirst[newestFirst.length - 1] ?? null

  return {
    solves: newestFirst.reverse(),
    totalCount: count ?? newestFirst.length,
    nextCursor: last ? { solvedAt: last.solved_at, id: last.id } : null,
  }
}

export async function getSolveDetailWindow(params: {
  solveId: string
  statKey?: string
}): Promise<{ solve: Solve | null; solves: Solve[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { solve: null, solves: [], error: "Not authenticated" }
  }

  const { data: target, error: targetError } = await supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("id", params.solveId)
    .maybeSingle()

  if (targetError) {
    return { solve: null, solves: [], error: targetError.message }
  }

  const targetSolve = (target as unknown as Solve | null) ?? null
  if (!targetSolve) {
    return { solve: null, solves: [], error: "Solve not found" }
  }

  const windowSize = (() => {
    const raw = params.statKey?.match(/\d+/)?.[0]
    if (!raw) return 12
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 12
  })()

  const cursor = { solvedAt: targetSolve.solved_at, id: targetSolve.id }
  const query = supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("event", targetSolve.event)
    .or(buildCursorFilter(cursor, true))
    .order("solved_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(windowSize)

  const { data, error } = await query
  if (error) {
    return { solve: targetSolve, solves: [], error: error.message }
  }

  return {
    solve: targetSolve,
    solves: (((data as unknown as Solve[] | null) ?? []).reverse()),
  }
}

export async function getEventSolveById(
  solveId: string
): Promise<{ solve: Solve | null; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { solve: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("id", solveId)
    .maybeSingle()

  if (error) {
    return { solve: null, error: error.message }
  }

  return { solve: (data as unknown as Solve | null) ?? null }
}

export async function getEventAnalytics(event: string): Promise<{
  data: TimerEventAnalytics | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const [{ data: summary, error: summaryError }, { data: daily, error: dailyError }, { data: distribution, error: distributionError }] = await Promise.all([
    supabase
      .from("event_summaries")
      .select(EVENT_SUMMARY_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .eq("event", event)
      .maybeSingle(),
    supabase
      .from("solve_daily_rollups")
      .select(DAILY_ROLLUP_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .eq("event", event)
      .order("local_date", { ascending: true }),
    supabase.rpc("get_timer_event_distribution", {
      p_user_id: user.id,
      p_event: event,
      p_bucket_count: 16,
    }),
  ])

  if (summaryError) {
    return { data: null, error: summaryError.message }
  }
  if (dailyError) {
    return { data: null, error: dailyError.message }
  }
  if (distributionError) {
    return { data: null, error: distributionError.message }
  }

  const typedDaily = ((daily as unknown as SolveDailyRollup[] | null) ?? [])
  const typedDistribution = ((distribution as unknown as TimerAnalyticsDistributionBucket[] | null) ?? [])

  return {
    data: {
      summary: (summary as unknown as EventSummary | null) ?? null,
      daily: typedDaily,
      trend: buildTrendPoints(typedDaily),
      distribution: typedDistribution,
    },
  }
}

export async function listRecentEventSolves(params: {
  event: string
  limit?: number
  offset?: number
}): Promise<{ solves: Solve[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { solves: [], error: "Not authenticated" }
  }

  const limit = Math.min(Math.max(params.limit ?? 500, 1), 2000)
  const offset = Math.max(params.offset ?? 0, 0)

  const { data, error } = await supabase
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("event", params.event)
    .order("solved_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return { solves: [], error: error.message }
  }

  return {
    solves: (((data as unknown as Solve[] | null) ?? []).reverse()),
  }
}
