"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import type { LeaderboardEntry } from "@/lib/types"

export type LeaderboardCategory =
  | "fastest_avg"
  | "most_solves"
  | "longest_streak"
  | "most_practice_time"
  | "sor"
  | "kinch"

export type LeaderboardPage = {
  entries: LeaderboardEntry[]
  totalCount: number
}

type RawResult = { user_id: string; stat_value: number }

const PAGE_SIZE = 50
const MIN_SESSIONS_FOR_AVG = 5
const FIND_ME_WINDOW = 25

/**
 * Get user IDs that a given user follows (+ self).
 */
async function getFriendUserIds(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
  const ids = data?.map((row) => row.following_id) ?? []
  ids.push(userId)
  return ids
}

/**
 * Attach profile info to raw rows. rankOffset shifts rank numbers for pagination.
 */
async function enrichWithProfiles(
  rows: RawResult[],
  rankOffset: number = 0
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
      rank: rankOffset + index + 1,
      user_id: row.user_id,
      display_name: profile?.display_name ?? "Unknown",
      handle: profile?.handle ?? "unknown",
      avatar_url: profile?.avatar_url ?? null,
      stat_value: row.stat_value,
    }
  })
}

// --- Compute functions: return full sorted raw results ---

async function computeFastestAvg(
  event: string,
  friendIds?: string[]
): Promise<RawResult[]> {
  const admin = createAdminClient()
  let query = admin
    .from("sessions")
    .select("user_id, avg_time")
    .eq("event", event)
    .not("avg_time", "is", null)
  if (friendIds) query = query.in("user_id", friendIds)
  const { data } = await query
  if (!data || data.length === 0) return []

  const userSessions = new Map<string, number[]>()
  for (const row of data) {
    const times = userSessions.get(row.user_id) ?? []
    times.push(Number(row.avg_time))
    userSessions.set(row.user_id, times)
  }

  const results: RawResult[] = []
  for (const [userId, times] of userSessions) {
    if (times.length < MIN_SESSIONS_FOR_AVG) continue
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    results.push({ user_id: userId, stat_value: Math.round(avg * 100) / 100 })
  }

  results.sort((a, b) => a.stat_value - b.stat_value)
  return results
}

async function computeMostSolves(
  friendIds?: string[]
): Promise<RawResult[]> {
  const admin = createAdminClient()
  let query = admin.from("sessions").select("user_id, num_solves")
  if (friendIds) query = query.in("user_id", friendIds)
  const { data } = await query
  if (!data || data.length === 0) return []

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
  results.sort((a, b) => b.stat_value - a.stat_value)
  return results
}

async function computeLongestStreak(
  friendIds?: string[]
): Promise<RawResult[]> {
  const admin = createAdminClient()
  let query = admin.from("sessions").select("user_id, session_date")
  if (friendIds) query = query.in("user_id", friendIds)
  const { data } = await query
  if (!data || data.length === 0) return []

  const userDates = new Map<string, Set<string>>()
  for (const row of data) {
    const dates = userDates.get(row.user_id) ?? new Set()
    dates.add(row.session_date)
    userDates.set(row.user_id, dates)
  }

  const results: RawResult[] = []
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

  results.sort((a, b) => b.stat_value - a.stat_value)
  return results
}

async function computeMostPracticeTime(
  friendIds?: string[]
): Promise<RawResult[]> {
  const admin = createAdminClient()
  let query = admin.from("sessions").select("user_id, duration_minutes")
  if (friendIds) query = query.in("user_id", friendIds)
  const { data } = await query
  if (!data || data.length === 0) return []

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
  results.sort((a, b) => b.stat_value - a.stat_value)
  return results
}

// --- Dispatcher ---

async function computeRanking(
  category: LeaderboardCategory,
  event: string,
  friendIds?: string[]
): Promise<RawResult[]> {
  switch (category) {
    case "fastest_avg":
      return computeFastestAvg(event, friendIds)
    case "most_solves":
      return computeMostSolves(friendIds)
    case "longest_streak":
      return computeLongestStreak(friendIds)
    case "most_practice_time":
      return computeMostPracticeTime(friendIds)
    default:
      return []
  }
}

// --- Public API ---

/**
 * Fetch a paginated leaderboard for a given category.
 */
export async function getLeaderboard(
  category: LeaderboardCategory,
  event?: string,
  friendsOnly?: boolean,
  userId?: string,
  offset: number = 0,
  limit: number = PAGE_SIZE
): Promise<LeaderboardPage> {
  let friendIds: string[] | undefined
  if (friendsOnly && userId) {
    friendIds = await getFriendUserIds(userId)
  }

  const results = await computeRanking(category, event ?? "333", friendIds)
  const sliced = results.slice(offset, offset + limit)
  const entries = await enrichWithProfiles(sliced, offset)

  return { entries, totalCount: results.length }
}

/**
 * Fetch all 4 leaderboard categories in parallel (for instant tab switching).
 */
export async function getAllLeaderboards(): Promise<
  Record<string, LeaderboardPage>
> {
  const [mostSolves, fastestAvg, longestStreak, mostPracticeTime] =
    await Promise.all([
      getLeaderboard("most_solves"),
      getLeaderboard("fastest_avg", "333"),
      getLeaderboard("longest_streak"),
      getLeaderboard("most_practice_time"),
    ])

  return {
    most_solves: mostSolves,
    "fastest_avg:333": fastestAvg,
    longest_streak: longestStreak,
    most_practice_time: mostPracticeTime,
  }
}

/**
 * Find the user's rank and return surrounding entries (±25 people).
 * Returns null if the user has no data for this category.
 */
export async function getUserLeaderboardPosition(
  category: LeaderboardCategory,
  userId: string,
  event?: string,
  friendsOnly?: boolean
): Promise<{
  entries: LeaderboardEntry[]
  userRank: number
  totalCount: number
} | null> {
  let friendIds: string[] | undefined
  if (friendsOnly) {
    friendIds = await getFriendUserIds(userId)
  }

  const results = await computeRanking(category, event ?? "333", friendIds)
  const userIndex = results.findIndex((r) => r.user_id === userId)
  if (userIndex === -1) return null

  const start = Math.max(0, userIndex - FIND_ME_WINDOW)
  const end = Math.min(results.length, userIndex + FIND_ME_WINDOW + 1)
  const sliced = results.slice(start, end)
  const entries = await enrichWithProfiles(sliced, start)

  return { entries, userRank: userIndex + 1, totalCount: results.length }
}
