// Shared leaderboard types and constants (no "use server" — safe to import from client code)

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

/** Categories that support daily/weekly time period filtering */
export const TIMED_CATEGORIES: LeaderboardCategory[] = ["most_solves", "most_practice_time"]
