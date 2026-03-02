"use server"

import { createClient } from "@/lib/supabase/server"
import type { LeaderboardEntry } from "@/lib/types"

export type LeaderboardCategory =
  | "most_solves"
  | "longest_streak"
  | "most_practice_time"
  | "sor"
  | "kinch"

export type TimePeriod = "all_time" | "daily" | "weekly"

export type LeaderboardPage = {
  entries: LeaderboardEntry[]
  totalCount: number
}

const PAGE_SIZE = 50
const FIND_ME_WINDOW = 25

/** Categories that support daily/weekly time periods */
export const TIMED_CATEGORIES: LeaderboardCategory[] = ["most_solves", "most_practice_time"]

/**
 * Get user IDs that a given user follows (+ self).
 */
async function getFriendUserIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
  const ids = data?.map((row) => row.following_id) ?? []
  ids.push(userId)
  return ids
}

// Map category + timePeriod → RPC function name
const LEADERBOARD_RPC: Record<string, Record<TimePeriod, string>> = {
  most_solves: {
    all_time: "get_leaderboard_most_solves",
    daily: "get_leaderboard_daily_solves",
    weekly: "get_leaderboard_weekly_solves",
  },
  most_practice_time: {
    all_time: "get_leaderboard_most_practice_time",
    daily: "get_leaderboard_daily_practice_time",
    weekly: "get_leaderboard_weekly_practice_time",
  },
}

// Non-timed categories use a flat RPC name
const FLAT_LEADERBOARD_RPC: Record<string, string> = {
  longest_streak: "get_leaderboard_longest_streak",
}

const RANK_RPC: Record<string, Record<TimePeriod, string>> = {
  most_solves: {
    all_time: "get_user_rank_most_solves",
    daily: "get_user_rank_daily_solves",
    weekly: "get_user_rank_weekly_solves",
  },
  most_practice_time: {
    all_time: "get_user_rank_most_practice_time",
    daily: "get_user_rank_daily_practice_time",
    weekly: "get_user_rank_weekly_practice_time",
  },
}

const FLAT_RANK_RPC: Record<string, string> = {
  longest_streak: "get_user_rank_longest_streak",
}

function getRpcName(category: LeaderboardCategory, timePeriod: TimePeriod): string | null {
  if (LEADERBOARD_RPC[category]) return LEADERBOARD_RPC[category][timePeriod]
  return FLAT_LEADERBOARD_RPC[category] ?? null
}

function getRankRpcName(category: LeaderboardCategory, timePeriod: TimePeriod): string | null {
  if (RANK_RPC[category]) return RANK_RPC[category][timePeriod]
  return FLAT_RANK_RPC[category] ?? null
}

/**
 * Fetch a paginated leaderboard for a given category.
 * All aggregation happens in the database via RPC functions —
 * only the top N results are returned, not the entire table.
 */
export async function getLeaderboard(
  category: LeaderboardCategory,
  friendsOnly?: boolean,
  userId?: string,
  offset: number = 0,
  limit: number = PAGE_SIZE,
  timePeriod: TimePeriod = "all_time"
): Promise<LeaderboardPage> {
  const rpcName = getRpcName(category, timePeriod)
  if (!rpcName) return { entries: [], totalCount: 0 }

  const supabase = await createClient()

  let friendIds: string[] | null = null
  if (friendsOnly && userId) {
    friendIds = await getFriendUserIds(userId)
  }

  const { data, error } = await supabase.rpc(rpcName, {
    p_friend_ids: friendIds,
    p_offset: offset,
    p_limit: limit,
  })

  if (error || !data || data.length === 0) {
    return { entries: [], totalCount: 0 }
  }

  const totalCount = Number(data[0].total_count) || 0

  const entries: LeaderboardEntry[] = data.map(
    (
      row: {
        user_id: string
        display_name: string
        handle: string
        avatar_url: string | null
        stat_value: number
      },
      index: number
    ) => ({
      rank: offset + index + 1,
      user_id: row.user_id,
      display_name: row.display_name ?? "Unknown",
      handle: row.handle ?? "unknown",
      avatar_url: row.avatar_url ?? null,
      stat_value: Number(row.stat_value),
    })
  )

  return { entries, totalCount }
}

/**
 * Fetch all 3 practice leaderboard categories in parallel
 * (for instant tab switching on the leaderboards page).
 */
export async function getAllLeaderboards(): Promise<
  Record<string, LeaderboardPage>
> {
  const [mostSolves, longestStreak, mostPracticeTime] = await Promise.all([
    getLeaderboard("most_solves"),
    getLeaderboard("longest_streak"),
    getLeaderboard("most_practice_time"),
  ])

  return {
    most_solves: mostSolves,
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
  friendsOnly?: boolean,
  timePeriod: TimePeriod = "all_time"
): Promise<{
  entries: LeaderboardEntry[]
  userRank: number
  totalCount: number
} | null> {
  const rankRpcName = getRankRpcName(category, timePeriod)
  if (!rankRpcName) return null

  const supabase = await createClient()

  let friendIds: string[] | null = null
  if (friendsOnly) {
    friendIds = await getFriendUserIds(userId)
  }

  // Step 1: Get the user's rank number from the database
  const { data: rankData } = await supabase.rpc(rankRpcName, {
    p_user_id: userId,
    p_friend_ids: friendIds,
  })

  // rankData is a single integer (or null if user not found)
  const userRank = typeof rankData === "number" ? rankData : null
  if (!userRank) return null

  // Step 2: Fetch surrounding entries using the main leaderboard RPC
  const start = Math.max(0, userRank - 1 - FIND_ME_WINDOW)
  const windowSize = FIND_ME_WINDOW * 2 + 1
  const { entries, totalCount } = await getLeaderboard(
    category,
    friendsOnly,
    userId,
    start,
    windowSize,
    timePeriod
  )

  return { entries, userRank, totalCount }
}
