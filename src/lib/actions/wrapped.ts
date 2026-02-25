"use server"

import { createClient } from "@/lib/supabase/server"
import type { WrappedStats } from "@/lib/types"

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/**
 * Calculate Year-in-Review ("Wrapped") stats for the current user.
 * Defaults to the current year if no year is provided.
 * Returns null if the user has no sessions for that year.
 */
export async function getWrappedStats(
  year?: number
): Promise<WrappedStats | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const targetYear = year ?? new Date().getFullYear()
  const startDate = `${targetYear}-01-01`
  const endDate = `${targetYear}-12-31`

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("session_date, event, num_solves, duration_minutes, avg_time")
    .eq("user_id", user.id)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .order("session_date", { ascending: true })

  if (error || !sessions || sessions.length === 0) return null

  // --- Basic aggregates ---
  let totalSolves = 0
  let totalMinutes = 0
  const totalSessions = sessions.length

  // --- Per-event tracking ---
  const eventSolves: Record<string, number> = {}
  const eventMinutes: Record<string, number> = {}

  // --- Monthly breakdown ---
  const monthlySolves = new Array(12).fill(0) as number[]
  const monthlyMinutes = new Array(12).fill(0) as number[]

  // --- PB improvement: track first and best avg_time per event ---
  const eventFirstAvg: Record<string, number> = {}
  const eventBestAvg: Record<string, number> = {}

  // --- Streak: collect unique dates ---
  const uniqueDatesSet = new Set<string>()

  for (const s of sessions) {
    totalSolves += s.num_solves ?? 0
    totalMinutes += s.duration_minutes ?? 0

    // Per-event
    eventSolves[s.event] = (eventSolves[s.event] || 0) + (s.num_solves ?? 0)
    eventMinutes[s.event] =
      (eventMinutes[s.event] || 0) + (s.duration_minutes ?? 0)

    // Monthly (parse month from session_date "YYYY-MM-DD")
    const monthIndex = parseInt(s.session_date.substring(5, 7), 10) - 1
    monthlySolves[monthIndex] += s.num_solves ?? 0
    monthlyMinutes[monthIndex] += s.duration_minutes ?? 0

    // PB improvement tracking (only for sessions with avg_time)
    if (s.avg_time !== null && s.avg_time > 0) {
      if (!(s.event in eventFirstAvg)) {
        eventFirstAvg[s.event] = s.avg_time
      }
      if (
        !(s.event in eventBestAvg) ||
        s.avg_time < eventBestAvg[s.event]
      ) {
        eventBestAvg[s.event] = s.avg_time
      }
    }

    // Streak dates
    uniqueDatesSet.add(s.session_date)
  }

  // --- Most practiced event ---
  let mostPracticedEvent: string | null = null
  let maxSolves = 0
  for (const [event, solves] of Object.entries(eventSolves)) {
    if (solves > maxSolves) {
      maxSolves = solves
      mostPracticedEvent = event
    }
  }

  // --- Biggest PB improvement ---
  let biggestPBImprovement: { event: string; improvement: number } | null = null
  let maxImprovement = 0
  for (const event of Object.keys(eventFirstAvg)) {
    if (event in eventBestAvg) {
      const improvement = eventFirstAvg[event] - eventBestAvg[event]
      if (improvement > maxImprovement) {
        maxImprovement = improvement
        biggestPBImprovement = {
          event,
          improvement: Math.round(improvement * 100) / 100,
        }
      }
    }
  }

  // --- Longest streak within the year ---
  const uniqueDates = Array.from(uniqueDatesSet).sort()
  let longestStreak = 0
  if (uniqueDates.length > 0) {
    let streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00")
      const curr = new Date(uniqueDates[i] + "T00:00:00")
      const diffDays =
        (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
      if (diffDays === 1) {
        streak++
      } else {
        longestStreak = Math.max(longestStreak, streak)
        streak = 1
      }
    }
    longestStreak = Math.max(longestStreak, streak)
  }

  // --- Events practiced ---
  const eventsPracticed = Object.keys(eventSolves).length

  // --- Monthly breakdown array ---
  const monthlyBreakdown = MONTH_NAMES.map((month, i) => ({
    month,
    solves: monthlySolves[i],
    hours: Math.round((monthlyMinutes[i] / 60) * 10) / 10,
  }))

  // --- Top events by solves ---
  const topEvents = Object.entries(eventSolves)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([event, solves]) => ({
      event,
      solves,
      hours: Math.round((eventMinutes[event] / 60) * 10) / 10,
    }))

  return {
    year: targetYear,
    totalSolves,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalSessions,
    mostPracticedEvent,
    biggestPBImprovement,
    longestStreak,
    eventsPracticed,
    monthlyBreakdown,
    topEvents,
  }
}
