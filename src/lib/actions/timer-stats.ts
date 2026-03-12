"use server"

import { createClient } from "@/lib/supabase/server"
import type { SolveDailyRollup } from "@/lib/types"

export type DailySolveCount = {
  date: string
  count: number
}

/**
 * Get solve counts grouped by date for the current user.
 * Used for daily statistics (heatmap, bar chart, period summaries).
 *
 * @param daysBack - Number of days to look back (default: 365)
 * @param eventId - Optional event filter (null = all events)
 */
export async function getDailySolveCounts(
  daysBack = 365,
  eventId?: string | null
): Promise<{ data: DailySolveCount[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: "Not authenticated" }
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const startDateKey = startDate.toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  })

  let query = supabase
    .from("solve_daily_rollups")
    .select("local_date, solve_count")
    .eq("user_id", user.id)
    .gte("local_date", startDateKey)
    .order("local_date", { ascending: true })

  if (eventId) {
    query = query.eq("event", eventId)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error: error.message }
  }

  const result = (((data as Array<{ local_date: string; solve_count: number }> | null) ?? []))
    .map((row) => ({ date: row.local_date, count: row.solve_count }))

  return { data: result }
}

/**
 * Get summary counts for different time periods.
 */
export async function getSolvePeriodSummary(
  eventId?: string | null
): Promise<{
  today: number
  thisWeek: number
  thisMonth: number
  thisYear: number
  total: number
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0, error: "Not authenticated" }
  }

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  })

  let rollupQuery = supabase
    .from("solve_daily_rollups")
    .select("local_date, solve_count")
    .eq("user_id", user.id)
    .gte("local_date", yearStart)

  if (eventId) {
    rollupQuery = rollupQuery.eq("event", eventId)
  }

  const { data, error } = await rollupQuery

  if (error) {
    return { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0, error: error.message }
  }

  // Compute Pacific-time boundaries
  const todayPacific = now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
  const dayOfWeek = new Date(
    now.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })
  ).getDay()
  const weekStartDate = new Date(now)
  weekStartDate.setDate(weekStartDate.getDate() - dayOfWeek)
  const weekStartPacific = weekStartDate.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
  const monthPacific = todayPacific.slice(0, 7) // YYYY-MM

  const rollups = ((data as SolveDailyRollup[] | null) ?? [])

  let today = 0
  let thisWeek = 0
  let thisMonth = 0
  let thisYear = 0

  for (const row of rollups) {
    thisYear += row.solve_count
    if (row.local_date === todayPacific) today += row.solve_count
    if (row.local_date >= weekStartPacific) thisWeek += row.solve_count
    if (row.local_date.startsWith(monthPacific)) thisMonth += row.solve_count
  }

  let totalQuery = supabase
    .from("event_summaries")
    .select("solve_count")
    .eq("user_id", user.id)

  if (eventId) {
    totalQuery = totalQuery.eq("event", eventId)
  }

  const { data: totals } = await totalQuery
  const total = (((totals as Array<{ solve_count: number }> | null) ?? []))
    .reduce((sum, row) => sum + row.solve_count, 0)

  return {
    today,
    thisWeek,
    thisMonth,
    thisYear,
    total: total || thisYear,
  }
}
