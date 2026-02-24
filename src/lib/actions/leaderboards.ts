"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import type { LeaderboardEntry } from "@/lib/types"

export type LeaderboardCategory =
  | "fastest_avg"
  | "most_solves"
  | "longest_streak"
  | "most_practice_time"

const LIMIT = 50
const MIN_SESSIONS_FOR_AVG = 5

/**
 * Get a list of user IDs that a given user follows (+ self).
 * Used for "friends only" filtering.
 */
async function getFriendUserIds(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)

  const ids = data?.map((row) => row.following_id) ?? []
  // Include the user themselves
  ids.push(userId)
  return ids
}

/**
 * Attach profile info (display_name, handle, avatar_url) to raw leaderboard rows.
 * Takes an array of { user_id, stat_value } and returns ranked LeaderboardEntry[].
 */
async function enrichWithProfiles(
  rows: { user_id: string; stat_value: number }[]
): Promise<LeaderboardEntry[]> {
  if (rows.length === 0) return []

  const admin = createAdminClient()
  const userIds = rows.map((r) => r.user_id)

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, handle, avatar_url")
    .in("id", userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        display_name: p.display_name as string,
        handle: p.handle as string,
        avatar_url: p.avatar_url as string | null,
      },
    ])
  )

  return rows.map((row, index) => {
    const profile = profileMap.get(row.user_id)
    return {
      rank: index + 1,
      user_id: row.user_id,
      display_name: profile?.display_name ?? "Unknown",
      handle: profile?.handle ?? "unknown",
      avatar_url: profile?.avatar_url ?? null,
      stat_value: row.stat_value,
    }
  })
}

/**
 * Fastest average time for a given event.
 * Groups sessions by user, requires at least MIN_SESSIONS_FOR_AVG sessions,
 * then averages their avg_time. Lower is better.
 */
async function getFastestAvg(
  event: string,
  friendIds?: string[]
): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient()

  // Fetch all sessions for this event that have an avg_time
  let query = admin
    .from("sessions")
    .select("user_id, avg_time")
    .eq("event", event)
    .not("avg_time", "is", null)

  if (friendIds) {
    query = query.in("user_id", friendIds)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Group by user_id and calculate average of avg_time
  const userSessions = new Map<string, number[]>()
  for (const row of data) {
    const times = userSessions.get(row.user_id) ?? []
    times.push(Number(row.avg_time))
    userSessions.set(row.user_id, times)
  }

  // Filter to users with at least MIN_SESSIONS_FOR_AVG sessions, compute avg
  const results: { user_id: string; stat_value: number }[] = []
  for (const [userId, times] of userSessions) {
    if (times.length < MIN_SESSIONS_FOR_AVG) continue
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    results.push({ user_id: userId, stat_value: Math.round(avg * 100) / 100 })
  }

  // Sort ascending (lower = better), limit to top 50
  results.sort((a, b) => a.stat_value - b.stat_value)
  return enrichWithProfiles(results.slice(0, LIMIT))
}

/**
 * Most total solves across all sessions.
 */
async function getMostSolves(
  friendIds?: string[]
): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient()

  let query = admin
    .from("sessions")
    .select("user_id, num_solves")

  if (friendIds) {
    query = query.in("user_id", friendIds)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Group by user_id and sum num_solves
  const userSolves = new Map<string, number>()
  for (const row of data) {
    userSolves.set(
      row.user_id,
      (userSolves.get(row.user_id) ?? 0) + (row.num_solves ?? 0)
    )
  }

  const results = Array.from(userSolves, ([user_id, total]) => ({
    user_id,
    stat_value: total,
  }))

  // Sort descending (more = better)
  results.sort((a, b) => b.stat_value - a.stat_value)
  return enrichWithProfiles(results.slice(0, LIMIT))
}

/**
 * Longest streak (consecutive days with at least one session).
 */
async function getLongestStreak(
  friendIds?: string[]
): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient()

  let query = admin
    .from("sessions")
    .select("user_id, session_date")

  if (friendIds) {
    query = query.in("user_id", friendIds)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Group by user and collect unique dates
  const userDates = new Map<string, Set<string>>()
  for (const row of data) {
    const dates = userDates.get(row.user_id) ?? new Set()
    dates.add(row.session_date)
    userDates.set(row.user_id, dates)
  }

  // Calculate longest streak per user
  const results: { user_id: string; stat_value: number }[] = []
  for (const [userId, dateSet] of userDates) {
    const sortedDates = Array.from(dateSet)
      .map((d) => new Date(d + "T00:00:00"))
      .sort((a, b) => a.getTime() - b.getTime())

    let longestStreak = 1
    let currentStreak = 1

    for (let i = 1; i < sortedDates.length; i++) {
      const diff =
        (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) /
        (24 * 60 * 60 * 1000)
      if (diff === 1) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else {
        currentStreak = 1
      }
    }

    results.push({ user_id: userId, stat_value: longestStreak })
  }

  // Sort descending (longer streak = better)
  results.sort((a, b) => b.stat_value - a.stat_value)
  return enrichWithProfiles(results.slice(0, LIMIT))
}

/**
 * Most total practice time (sum of duration_minutes across all sessions).
 * Returns stat_value in minutes.
 */
async function getMostPracticeTime(
  friendIds?: string[]
): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient()

  let query = admin
    .from("sessions")
    .select("user_id, duration_minutes")

  if (friendIds) {
    query = query.in("user_id", friendIds)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Group by user_id and sum duration_minutes
  const userMinutes = new Map<string, number>()
  for (const row of data) {
    userMinutes.set(
      row.user_id,
      (userMinutes.get(row.user_id) ?? 0) + (row.duration_minutes ?? 0)
    )
  }

  const results = Array.from(userMinutes, ([user_id, total]) => ({
    user_id,
    stat_value: total,
  }))

  // Sort descending (more time = better)
  results.sort((a, b) => b.stat_value - a.stat_value)
  return enrichWithProfiles(results.slice(0, LIMIT))
}

/**
 * Main entry point: fetch a leaderboard for a given category.
 *
 * @param category - Which leaderboard to fetch
 * @param event - Required for "fastest_avg" category (WCA event ID)
 * @param friendsOnly - If true, filter to only users the current user follows (+ self)
 * @param userId - The current user's ID (needed for friendsOnly filtering)
 */
export async function getLeaderboard(
  category: LeaderboardCategory,
  event?: string,
  friendsOnly?: boolean,
  userId?: string
): Promise<LeaderboardEntry[]> {
  // If friends-only, get the list of friend user IDs
  let friendIds: string[] | undefined
  if (friendsOnly && userId) {
    friendIds = await getFriendUserIds(userId)
  }

  switch (category) {
    case "fastest_avg":
      return getFastestAvg(event ?? "333", friendIds)
    case "most_solves":
      return getMostSolves(friendIds)
    case "longest_streak":
      return getLongestStreak(friendIds)
    case "most_practice_time":
      return getMostPracticeTime(friendIds)
    default:
      return []
  }
}
