"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Goal } from "@/lib/types"

/**
 * Safe wrapper: only call revalidatePath when running inside a server action
 * (mutation context). Calling revalidatePath during a server component render
 * throws in Next.js 16+. This helper catches that error silently.
 */
function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Called during render — not a mutation context. Ignore safely.
  }
}

export async function getGoals(): Promise<{ data: Goal[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("goals")
    .select("id, user_id, event, target_avg, target_date, status, achieved_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data as Goal[]) || [] }
}

export async function createGoal(fields: {
  event: string
  target_avg: number
  target_date: string
}): Promise<{ success: boolean; data?: Goal; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate fields
  if (!fields.event) {
    return { success: false, error: "Event is required." }
  }
  if (!fields.target_avg || fields.target_avg <= 0) {
    return { success: false, error: "Target time must be a positive number." }
  }
  if (!fields.target_date) {
    return { success: false, error: "Target date is required." }
  }

  const { data, error } = await supabase.from("goals").insert({
    user_id: user.id,
    event: fields.event,
    target_avg: fields.target_avg,
    target_date: fields.target_date,
  }).select().single()

  if (error) {
    return { success: false, error: error.message }
  }

  safeRevalidate("/practice-stats")
  return { success: true, data: data as Goal }
}

export async function updateGoal(
  goalId: string,
  fields: {
    event?: string
    target_avg?: number
    target_date?: string
  }
): Promise<{ success: boolean; data?: Goal; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const updates: Record<string, unknown> = {}
  if (fields.event) updates.event = fields.event
  if (fields.target_avg && fields.target_avg > 0) updates.target_avg = fields.target_avg
  if (fields.target_date) updates.target_date = fields.target_date

  const { data, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", goalId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  safeRevalidate("/practice-stats")
  return { success: true, data: data as Goal }
}

export async function deleteGoal(
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  safeRevalidate("/practice-stats")
  return { success: true }
}

/**
 * Check all active goals against the user's recent sessions.
 * If a goal's target avg has been met (recent avg <= target), mark it as achieved.
 * If a goal's target date has passed without being achieved, mark it as expired.
 */
export async function checkGoalProgress(): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // Fetch active goals (only need id, event, target_avg, target_date)
  const { data: goals } = await supabase
    .from("goals")
    .select("id, event, target_avg, target_date, status")
    .eq("user_id", user.id)
    .eq("status", "active")

  if (!goals || goals.length === 0) return

  const today = new Date().toISOString().split("T")[0]

  // Separate expired goals (batch update) from active goals (need session check)
  const expiredIds: string[] = []
  const activeGoals: typeof goals = []
  for (const goal of goals) {
    if (goal.target_date < today) {
      expiredIds.push(goal.id)
    } else {
      activeGoals.push(goal)
    }
  }

  // Batch-expire all past-due goals in one query
  if (expiredIds.length > 0) {
    await supabase
      .from("goals")
      .update({ status: "expired" })
      .in("id", expiredIds)
  }

  if (activeGoals.length === 0) {
    safeRevalidate("/practice-stats")
    return
  }

  // Fetch recent sessions for ALL goal events in a single query
  const goalEvents = [...new Set(activeGoals.map((g) => g.event))]
  const { data: sessions } = await supabase
    .from("sessions")
    .select("event, avg_time, session_date")
    .eq("user_id", user.id)
    .in("event", goalEvents)
    .not("avg_time", "is", null)
    .order("session_date", { ascending: false })

  // Group sessions by event, keeping only last 5 per event
  const sessionsByEvent = new Map<string, number[]>()
  for (const s of sessions ?? []) {
    const existing = sessionsByEvent.get(s.event)
    if (!existing) {
      sessionsByEvent.set(s.event, [s.avg_time])
    } else if (existing.length < 5) {
      existing.push(s.avg_time)
    }
  }

  // Check each active goal against pre-loaded sessions
  const achievedIds: string[] = []
  for (const goal of activeGoals) {
    const eventTimes = sessionsByEvent.get(goal.event)
    if (!eventTimes || eventTimes.length < 3) continue

    const recentAvg = eventTimes.reduce((sum, t) => sum + t, 0) / eventTimes.length
    if (recentAvg <= goal.target_avg) {
      achievedIds.push(goal.id)
    }
  }

  // Batch-achieve all goals that met their target
  if (achievedIds.length > 0) {
    await supabase
      .from("goals")
      .update({ status: "achieved", achieved_at: new Date().toISOString() })
      .in("id", achievedIds)
  }

  safeRevalidate("/practice-stats")
}

/**
 * Get the current average for a specific event (last 5 sessions with avg_time).
 * Used to show progress on goal cards.
 */
export async function getCurrentAvgForEvent(
  event: string
): Promise<number | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: sessions } = await supabase
    .from("sessions")
    .select("avg_time")
    .eq("user_id", user.id)
    .eq("event", event)
    .not("avg_time", "is", null)
    .order("session_date", { ascending: false })
    .limit(5)

  if (!sessions || sessions.length === 0) return null

  return (
    sessions.reduce((sum: number, s: { avg_time: number }) => sum + s.avg_time, 0) /
    sessions.length
  )
}
