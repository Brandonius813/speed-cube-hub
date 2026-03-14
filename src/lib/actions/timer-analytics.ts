"use server"

import { createClient } from "@/lib/supabase/server"
import type {
  EventSummary,
  Solve,
  SolveDailyRollup,
  SolveSessionSummary,
  TimerMilestoneKey,
  TimerMilestoneSummaryRow,
  TimerAnalyticsDistributionBucket,
  TimerAnalyticsTrendPoint,
  TimerEventAnalytics,
  TimerSavedSessionSummary,
  TimerSolveListSummary,
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
  "current_ao5_ms",
  "best_ao5_ms",
  "current_ao12_ms",
  "best_ao12_ms",
  "current_ao25_ms",
  "best_ao25_ms",
  "current_ao50_ms",
  "best_ao50_ms",
  "current_ao100_ms",
  "best_ao100_ms",
  "current_ao200_ms",
  "best_ao200_ms",
  "current_ao500_ms",
  "best_ao500_ms",
  "current_ao1000_ms",
  "best_ao1000_ms",
  "first_solved_at",
  "last_solved_at",
  "updated_at",
].join(", ")

const SESSION_SUMMARY_SELECT_COLUMNS = [
  "id",
  "timer_session_id",
  "num_solves",
  "avg_time",
  "best_time",
  "best_ao5",
  "best_ao12",
  "best_ao25",
  "best_ao50",
  "best_ao100",
  "best_ao200",
  "best_ao500",
  "best_ao1000",
  "created_at",
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

const FIXED_TIMER_MILESTONE_SIZES = [5, 12, 25, 50, 100, 200, 500, 1000] as const

type FixedMilestoneSize = (typeof FIXED_TIMER_MILESTONE_SIZES)[number]
type SummarySolveShape = Pick<Solve, "time_ms" | "penalty">

const INFINITY_TIME = Number.POSITIVE_INFINITY

function milestoneKey(size: FixedMilestoneSize): TimerMilestoneKey {
  return `ao${size}` as TimerMilestoneKey
}

function eventCurrentField(size: FixedMilestoneSize): keyof EventSummary {
  return `current_ao${size}_ms` as keyof EventSummary
}

function eventBestField(size: FixedMilestoneSize): keyof EventSummary {
  return `best_ao${size}_ms` as keyof EventSummary
}

function sessionBestField(size: FixedMilestoneSize): keyof TimerSavedSessionSummary {
  return `best_ao${size}` as keyof TimerSavedSessionSummary
}

function effectiveSolveMs(solve: SummarySolveShape): number {
  if (solve.penalty === "DNF") return INFINITY_TIME
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

function insertSorted(sorted: number[], value: number): void {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (sorted[mid] <= value) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  sorted.splice(low, 0, value)
}

function removeSorted(sorted: number[], value: number): void {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (sorted[mid] < value) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  if (sorted[low] === value) {
    sorted.splice(low, 1)
  }
}

function computeAverageFromSortedWindow(sorted: number[]): number | null {
  let dnfCount = 0
  for (let index = sorted.length - 1; index >= 0 && !Number.isFinite(sorted[index]); index--) {
    dnfCount += 1
    if (dnfCount > 1) return null
  }

  let sum = 0
  for (let index = 1; index < sorted.length - 1; index += 1) {
    const value = sorted[index]
    if (!Number.isFinite(value)) return null
    sum += value
  }

  return Math.round(sum / (sorted.length - 2))
}

export function computeFixedMilestoneRows(
  solves: SummarySolveShape[]
): TimerMilestoneSummaryRow[] {
  if (solves.length === 0) return []

  const effectiveTimes = solves.map(effectiveSolveMs)

  return FIXED_TIMER_MILESTONE_SIZES
    .filter((size) => effectiveTimes.length >= size)
    .map((size) => {
      const sortedWindow = effectiveTimes.slice(0, size).sort((a, b) => a - b)
      let current = computeAverageFromSortedWindow(sortedWindow)
      let best = current

      for (let index = size; index < effectiveTimes.length; index += 1) {
        removeSorted(sortedWindow, effectiveTimes[index - size])
        insertSorted(sortedWindow, effectiveTimes[index])
        current = computeAverageFromSortedWindow(sortedWindow)
        if (current !== null && (best === null || current < best)) {
          best = current
        }
      }

      return {
        key: milestoneKey(size),
        cur: current,
        best,
      }
    })
}

function milestoneRowsToEventPatch(
  rows: TimerMilestoneSummaryRow[]
): Record<string, number | null> {
  const patch: Record<string, number | null> = {}
  for (const size of FIXED_TIMER_MILESTONE_SIZES) {
    const row = rows.find((candidate) => candidate.key === milestoneKey(size)) ?? null
    patch[`current_ao${size}_ms`] = row?.cur ?? null
    patch[`best_ao${size}_ms`] = row?.best ?? null
  }
  return patch
}

export function milestoneRowsToSessionPatch(
  rows: TimerMilestoneSummaryRow[]
): Record<string, number | null> {
  const patch: Record<string, number | null> = {}
  for (const size of FIXED_TIMER_MILESTONE_SIZES) {
    const row = rows.find((candidate) => candidate.key === milestoneKey(size)) ?? null
    patch[`best_ao${size}`] = row?.best !== null && row?.best !== undefined
      ? Math.max(0, Math.trunc(row.best / 10)) / 100
      : null
  }
  return patch
}

function buildEventSummaryMilestoneRows(summary: EventSummary | null): TimerMilestoneSummaryRow[] {
  if (!summary) return []
  return FIXED_TIMER_MILESTONE_SIZES.map((size) => ({
    key: milestoneKey(size),
    cur: (summary[eventCurrentField(size)] as number | null) ?? null,
    best: (summary[eventBestField(size)] as number | null) ?? null,
  })).filter((row) => row.cur !== null || row.best !== null)
}

function needsEventSummaryMilestoneBackfill(summary: EventSummary | null): boolean {
  if (!summary) return true
  return FIXED_TIMER_MILESTONE_SIZES.some((size) => (
    summary.solve_count >= size &&
    (
      summary[eventCurrentField(size)] === null ||
      summary[eventBestField(size)] === null
    )
  ))
}

function needsSessionMilestoneBackfill(summary: TimerSavedSessionSummary | null): boolean {
  if (!summary) return false
  return FIXED_TIMER_MILESTONE_SIZES.some((size) => (
    summary.solve_count >= size &&
    summary[sessionBestField(size)] === null
  ))
}

async function refreshEventSummaryMilestones(params: {
  userId: string
  event: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error: refreshError } = await supabase.rpc("refresh_timer_event_analytics", {
    p_user_id: params.userId,
    p_event: params.event,
  })

  if (refreshError) {
    return { error: refreshError.message }
  }

  const { data: orderedSolves, error: solvesError } = await supabase
    .from("solves")
    .select("time_ms, penalty")
    .eq("user_id", params.userId)
    .eq("event", params.event)
    .order("solved_at", { ascending: true })
    .order("id", { ascending: true })

  if (solvesError) {
    return { error: solvesError.message }
  }

  const milestonePatch = milestoneRowsToEventPatch(
    computeFixedMilestoneRows(((orderedSolves as SummarySolveShape[] | null) ?? []))
  )

  const { error: updateError } = await supabase
    .from("event_summaries")
    .update(milestonePatch)
    .eq("user_id", params.userId)
    .eq("event", params.event)

  if (updateError) {
    return { error: updateError.message }
  }

  return {}
}

async function backfillLatestSessionMilestones(params: {
  userId: string
  sessionId: string
  timerSessionId: string
}): Promise<Record<string, number | null> | null> {
  const supabase = await createClient()
  const { data: solves, error } = await supabase
    .from("solves")
    .select("time_ms, penalty")
    .eq("user_id", params.userId)
    .eq("timer_session_id", params.timerSessionId)
    .order("solve_number", { ascending: true })

  if (error) {
    return null
  }

  const patch = milestoneRowsToSessionPatch(
    computeFixedMilestoneRows(((solves as SummarySolveShape[] | null) ?? []))
  )

  const { error: updateError } = await supabase
    .from("sessions")
    .update(patch)
    .eq("id", params.sessionId)
    .eq("user_id", params.userId)

  if (updateError) {
    return null
  }

  return patch
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

  return refreshEventSummaryMilestones({ userId: user.id, event })
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

export async function getTimerSolveListSummary(event: string): Promise<{
  data: TimerSolveListSummary | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data: eventSummary, error: eventSummaryError } = await supabase
    .from("event_summaries")
    .select(EVENT_SUMMARY_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("event", event)
    .maybeSingle()

  if (eventSummaryError) {
    return { data: null, error: eventSummaryError.message }
  }

  let typedEventSummary = (eventSummary as EventSummary | null) ?? null
  if (needsEventSummaryMilestoneBackfill(typedEventSummary)) {
    const refreshResult = await refreshEventSummaryMilestones({ userId: user.id, event })
    if (refreshResult.error) {
      return { data: null, error: refreshResult.error }
    }

    const refreshed = await supabase
      .from("event_summaries")
      .select(EVENT_SUMMARY_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .eq("event", event)
      .maybeSingle()

    if (refreshed.error) {
      return { data: null, error: refreshed.error.message }
    }

    typedEventSummary = (refreshed.data as EventSummary | null) ?? null
  }

  const latestSessionResult = await supabase
    .from("sessions")
    .select(SESSION_SUMMARY_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("event", event)
    .not("timer_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestSessionResult.error) {
    return { data: null, error: latestSessionResult.error.message }
  }

  const latestSessionRow = (latestSessionResult.data as Record<string, unknown> | null) ?? null
  let latestSavedSessionSummary: TimerSavedSessionSummary | null = latestSessionRow
    ? {
        id: latestSessionRow.id as string,
        timer_session_id: latestSessionRow.timer_session_id as string,
        solve_count: (latestSessionRow.num_solves as number | null) ?? 0,
        mean_seconds: (latestSessionRow.avg_time as number | null) ?? null,
        best_single_seconds: (latestSessionRow.best_time as number | null) ?? null,
        best_ao5: (latestSessionRow.best_ao5 as number | null) ?? null,
        best_ao12: (latestSessionRow.best_ao12 as number | null) ?? null,
        best_ao25: (latestSessionRow.best_ao25 as number | null) ?? null,
        best_ao50: (latestSessionRow.best_ao50 as number | null) ?? null,
        best_ao100: (latestSessionRow.best_ao100 as number | null) ?? null,
        best_ao200: (latestSessionRow.best_ao200 as number | null) ?? null,
        best_ao500: (latestSessionRow.best_ao500 as number | null) ?? null,
        best_ao1000: (latestSessionRow.best_ao1000 as number | null) ?? null,
        created_at: latestSessionRow.created_at as string,
      }
    : null

  if (needsSessionMilestoneBackfill(latestSavedSessionSummary)) {
    const patch = await backfillLatestSessionMilestones({
      userId: user.id,
      sessionId: latestSavedSessionSummary!.id,
      timerSessionId: latestSavedSessionSummary!.timer_session_id,
    })

    if (patch) {
      latestSavedSessionSummary = {
        ...latestSavedSessionSummary!,
        best_ao5: patch.best_ao5 ?? null,
        best_ao12: patch.best_ao12 ?? null,
        best_ao25: patch.best_ao25 ?? null,
        best_ao50: patch.best_ao50 ?? null,
        best_ao100: patch.best_ao100 ?? null,
        best_ao200: patch.best_ao200 ?? null,
        best_ao500: patch.best_ao500 ?? null,
        best_ao1000: patch.best_ao1000 ?? null,
      }
    }
  }

  return {
    data: {
      eventSummary: typedEventSummary,
      latestSavedSessionSummary,
      milestoneRows: buildEventSummaryMilestoneRows(typedEventSummary),
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
