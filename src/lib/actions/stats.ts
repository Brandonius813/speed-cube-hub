"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export type GlobalStats = {
  totalUsers: number
  totalSessions: number
  totalHours: number
  totalSolves: number
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const supabase = createAdminClient()

  const [usersResult, sessionsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("duration_minutes, num_solves"),
  ])

  const totalUsers = usersResult.count ?? 0
  const sessions = sessionsResult.data ?? []

  let totalMinutes = 0
  let totalSolves = 0
  for (const s of sessions) {
    totalMinutes += s.duration_minutes ?? 0
    totalSolves += s.num_solves ?? 0
  }

  return {
    totalUsers,
    totalSessions: sessions.length,
    totalHours: Math.round(totalMinutes / 60),
    totalSolves,
  }
}
