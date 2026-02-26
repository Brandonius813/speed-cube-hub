"use server"

import { createClient } from "@/lib/supabase/server"

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

  // Compute the start date (Pacific Time)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const startIso = startDate.toISOString()

  let query = supabase
    .from("solves")
    .select("solved_at")
    .eq("user_id", user.id)
    .gte("solved_at", startIso)
    .order("solved_at", { ascending: true })

  if (eventId) {
    query = query.eq("event", eventId)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error: error.message }
  }

  // Group by Pacific date
  const countsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    // Convert UTC timestamp to Pacific date string
    const date = new Date(row.solved_at)
    const pacific = date.toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    }) // YYYY-MM-DD format
    countsByDate.set(pacific, (countsByDate.get(pacific) ?? 0) + 1)
  }

  const result: DailySolveCount[] = []
  for (const [date, count] of countsByDate) {
    result.push({ date, count })
  }
  result.sort((a, b) => a.date.localeCompare(b.date))

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

  // Get all solves for the current year (covers all periods)
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  let query = supabase
    .from("solves")
    .select("solved_at")
    .eq("user_id", user.id)
    .gte("solved_at", yearStart)

  if (eventId) {
    query = query.eq("event", eventId)
  }

  const { data, error } = await query

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

  let today = 0
  let thisWeek = 0
  let thisMonth = 0
  const thisYear = data?.length ?? 0

  for (const row of data ?? []) {
    const pacific = new Date(row.solved_at).toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    })
    if (pacific === todayPacific) today++
    if (pacific >= weekStartPacific) thisWeek++
    if (pacific.startsWith(monthPacific)) thisMonth++
  }

  // Get total count (all time) with a separate count query
  let totalQuery = supabase
    .from("solves")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)

  if (eventId) {
    totalQuery = totalQuery.eq("event", eventId)
  }

  const { count } = await totalQuery

  return {
    today,
    thisWeek,
    thisMonth,
    thisYear,
    total: count ?? thisYear,
  }
}
