"use server"

import { unstable_cache } from "next/cache"
import { createPublicClient } from "@/lib/supabase/public"

export type GlobalStats = {
  totalUsers: number
  totalSessions: number
  totalHours: number
  totalSolves: number
}

const getCachedGlobalStats = unstable_cache(
  async (): Promise<GlobalStats> => {
    const supabase = createPublicClient()

    // Single RPC call — returns all stats computed inside PostgreSQL.
    // No session rows are transferred over the network.
    const { data } = await supabase.rpc("get_global_stats")

    const stats = data as {
      session_count: number
      total_minutes: number
      total_solves: number
      user_count: number
    } | null

    return {
      totalUsers: stats?.user_count ?? 0,
      totalSessions: stats?.session_count ?? 0,
      totalHours: Math.round((stats?.total_minutes ?? 0) / 60),
      totalSolves: stats?.total_solves ?? 0,
    }
  },
  ["global-stats"],
  { revalidate: 300 }
)

export async function getGlobalStats(): Promise<GlobalStats> {
  return getCachedGlobalStats()
}
