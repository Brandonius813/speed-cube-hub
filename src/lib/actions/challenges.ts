"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { Challenge } from "@/lib/types"

/**
 * Get all challenges with participant counts and whether the current user has joined.
 * Ordered by end_date descending (most recent first).
 */
export async function getChallenges(): Promise<{
  data: Challenge[]
  currentUserId?: string
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch all challenges
  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .order("end_date", { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  if (!challenges || challenges.length === 0) {
    return { data: [], currentUserId: user?.id }
  }

  // Get participant counts via RPC + user's own participations in parallel
  const challengeIds = challenges.map((c: { id: string }) => c.id)

  const [countResult, joinedResult] = await Promise.all([
    supabase.rpc("get_batch_challenge_participant_counts", {
      p_challenge_ids: challengeIds,
    }),
    user
      ? supabase
          .from("challenge_participants")
          .select("challenge_id")
          .eq("user_id", user.id)
          .in("challenge_id", challengeIds)
      : Promise.resolve({ data: [] as { challenge_id: string }[] }),
  ])

  const countMap = new Map<string, number>()
  for (const row of countResult.data ?? []) {
    countMap.set(row.challenge_id, Number(row.participant_count))
  }

  const joinedSet = new Set<string>()
  for (const row of joinedResult.data ?? []) {
    joinedSet.add(row.challenge_id)
  }

  const data: Challenge[] = challenges.map(
    (c: {
      id: string
      title: string
      description: string | null
      type: "solves" | "time" | "streak" | "events"
      scope?: "official" | "club"
      club_id?: string | null
      target_value: number
      start_date: string
      end_date: string
      created_at: string
    }) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      scope: c.scope ?? "official",
      club_id: c.club_id ?? null,
      target_value: c.target_value,
      start_date: c.start_date,
      end_date: c.end_date,
      created_at: c.created_at,
      participant_count: countMap.get(c.id) ?? 0,
      has_joined: joinedSet.has(c.id),
    })
  )

  return { data, currentUserId: user?.id }
}

/**
 * Join a challenge (insert the current user into challenge_participants).
 */
export async function joinChallenge(
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase.from("challenge_participants").insert({
    challenge_id: challengeId,
    user_id: user.id,
  })

  if (error) {
    // Unique constraint = already joined
    if (error.code === "23505") {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/challenges")
  return { success: true }
}

/**
 * Leave a challenge (remove the current user from challenge_participants).
 */
export async function leaveChallenge(
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("challenge_participants")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/challenges")
  return { success: true }
}

/**
 * Calculate real progress for the current user on a specific challenge,
 * based on their sessions during the challenge date range.
 *
 * - type "solves": sum of num_solves
 * - type "time": sum of duration_minutes
 * - type "streak": count of distinct session_dates
 * - type "events": count of distinct events
 */
export async function getChallengeProgress(
  challengeId: string
): Promise<{ progress: number; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { progress: 0, error: "Not authenticated" }
  }

  // Get the challenge details
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("type, start_date, end_date")
    .eq("id", challengeId)
    .single()

  if (challengeError || !challenge) {
    return { progress: 0, error: "Challenge not found" }
  }

  // Get user's sessions during the challenge period
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("num_solves, duration_minutes, session_date, event")
    .eq("user_id", user.id)
    .gte("session_date", challenge.start_date)
    .lte("session_date", challenge.end_date)

  if (sessionsError) {
    return { progress: 0, error: sessionsError.message }
  }

  if (!sessions || sessions.length === 0) {
    return { progress: 0 }
  }

  let progress = 0

  switch (challenge.type) {
    case "solves":
      progress = sessions.reduce(
        (sum: number, s: { num_solves: number }) => sum + (s.num_solves ?? 0),
        0
      )
      break
    case "time":
      progress = sessions.reduce(
        (sum: number, s: { duration_minutes: number }) =>
          sum + (s.duration_minutes ?? 0),
        0
      )
      break
    case "streak": {
      const uniqueDates = new Set(
        sessions.map((s: { session_date: string }) => s.session_date)
      )
      progress = uniqueDates.size
      break
    }
    case "events": {
      const uniqueEvents = new Set(
        sessions.map((s: { event: string }) => s.event)
      )
      progress = uniqueEvents.size
      break
    }
  }

  return { progress }
}

/**
 * Create a new challenge. Admin only (checks ADMIN_USER_ID env var).
 * Uses admin client because the challenges INSERT RLS policy is too broad
 * (allows any authenticated user) — we enforce admin-only via server action.
 */
export async function createChallenge(fields: {
  title: string
  description: string
  type: "solves" | "time" | "streak" | "events"
  scope?: "official" | "club"
  club_id?: string | null
  target_value: number
  start_date: string
  end_date: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Admin check
  if (user.id !== process.env.ADMIN_USER_ID) {
    return { success: false, error: "Only admins can create challenges" }
  }

  // Validate fields
  if (!fields.title.trim()) {
    return { success: false, error: "Title is required" }
  }
  if (!fields.type) {
    return { success: false, error: "Challenge type is required" }
  }
  if (!fields.target_value || fields.target_value <= 0) {
    return { success: false, error: "Target value must be a positive number" }
  }
  if (!fields.start_date) {
    return { success: false, error: "Start date is required" }
  }
  if (!fields.end_date) {
    return { success: false, error: "End date is required" }
  }
  if (fields.end_date < fields.start_date) {
    return { success: false, error: "End date must be after start date" }
  }

  const { error } = await admin.from("challenges").insert({
    title: fields.title.trim(),
    description: fields.description.trim() || null,
    type: fields.type,
    scope: fields.scope ?? "official",
    club_id: fields.scope === "club" ? fields.club_id ?? null : null,
    target_value: fields.target_value,
    start_date: fields.start_date,
    end_date: fields.end_date,
    created_by: user.id,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/challenges")
  return { success: true }
}
