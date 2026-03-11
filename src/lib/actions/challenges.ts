"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { getSocialPreviewChallenges, isSocialPreviewMode } from "@/lib/social-preview/mock-data"
import type { Challenge } from "@/lib/types"

type ChallengeRow = {
  id: string
  title: string
  description: string | null
  type: Challenge["type"]
  scope?: Challenge["scope"] | null
  club_id?: string | null
  target_value: number
  start_date: string
  end_date: string
  created_at: string
}

type ChallengeFields = {
  title: string
  description: string
  type: Challenge["type"]
  scope?: Challenge["scope"]
  club_id?: string | null
  target_value: number
  start_date: string
  end_date: string
}

type ChallengeMutationResult = {
  success: boolean
  error?: string
  challenge?: Challenge
}

const CHALLENGE_COLUMNS =
  "id,title,description,type,scope,club_id,target_value,start_date,end_date,created_at"

function mapChallengeRow(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    scope: row.scope ?? "official",
    club_id: row.club_id ?? null,
    target_value: row.target_value,
    start_date: row.start_date,
    end_date: row.end_date,
    created_at: row.created_at,
    participant_count: 0,
    has_joined: false,
  }
}

function validateChallengeFields(fields: ChallengeFields): string | null {
  if (!fields.title.trim()) {
    return "Title is required"
  }
  if (!fields.type) {
    return "Challenge type is required"
  }
  if (!fields.target_value || fields.target_value <= 0) {
    return "Target value must be a positive number"
  }
  if (!fields.start_date) {
    return "Start date is required"
  }
  if (!fields.end_date) {
    return "End date is required"
  }
  if (fields.end_date < fields.start_date) {
    return "End date must be after start date"
  }
  if ((fields.scope ?? "official") === "club" && !fields.club_id) {
    return "Club challenges must be attached to a club"
  }

  return null
}

function revalidateChallengePaths(scope: Challenge["scope"], clubId?: string | null) {
  revalidatePath("/challenges")
  revalidatePath("/discover")
  revalidatePath("/feed")

  if (scope === "club" && clubId) {
    revalidatePath(`/clubs/${clubId}`)
  }
}

/**
 * Get all challenges with participant counts and whether the current user has joined.
 * Ordered by end_date descending (most recent first).
 */
export async function getChallenges(): Promise<{
  data: Challenge[]
  currentUserId?: string
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewChallenges()
  }

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
export async function createChallenge(fields: ChallengeFields): Promise<ChallengeMutationResult> {
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

  const validationError = validateChallengeFields(fields)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const scope = fields.scope ?? "official"
  const clubId = scope === "club" ? fields.club_id ?? null : null

  const { data, error } = await admin
    .from("challenges")
    .insert({
      title: fields.title.trim(),
      description: fields.description.trim() || null,
      type: fields.type,
      scope,
      club_id: clubId,
      target_value: fields.target_value,
      start_date: fields.start_date,
      end_date: fields.end_date,
      created_by: user.id,
    })
    .select(CHALLENGE_COLUMNS)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to create challenge" }
  }

  revalidateChallengePaths(scope, clubId)
  return { success: true, challenge: mapChallengeRow(data) }
}

export async function updateChallenge(
  challengeId: string,
  fields: ChallengeFields
): Promise<ChallengeMutationResult> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (user.id !== process.env.ADMIN_USER_ID) {
    return { success: false, error: "Only admins can update challenges" }
  }

  if (!challengeId) {
    return { success: false, error: "Challenge not found" }
  }

  const validationError = validateChallengeFields(fields)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const scope = fields.scope ?? "official"
  const clubId = scope === "club" ? fields.club_id ?? null : null

  const { data, error } = await admin
    .from("challenges")
    .update({
      title: fields.title.trim(),
      description: fields.description.trim() || null,
      type: fields.type,
      scope,
      club_id: clubId,
      target_value: fields.target_value,
      start_date: fields.start_date,
      end_date: fields.end_date,
    })
    .eq("id", challengeId)
    .select(CHALLENGE_COLUMNS)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to update challenge" }
  }

  revalidateChallengePaths(scope, clubId)
  return { success: true, challenge: mapChallengeRow(data) }
}

export async function deleteChallenge(
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (user.id !== process.env.ADMIN_USER_ID) {
    return { success: false, error: "Only admins can delete challenges" }
  }

  const { data: existingChallenge, error: fetchError } = await admin
    .from("challenges")
    .select("scope, club_id")
    .eq("id", challengeId)
    .single()

  if (fetchError || !existingChallenge) {
    return { success: false, error: fetchError?.message ?? "Challenge not found" }
  }

  const { error } = await admin.from("challenges").delete().eq("id", challengeId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateChallengePaths(existingChallenge.scope ?? "official", existingChallenge.club_id ?? null)
  return { success: true }
}
