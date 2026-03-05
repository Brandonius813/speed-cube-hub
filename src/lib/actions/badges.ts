"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/helpers/create-notification"
import { getWcaResults } from "@/lib/actions/wca"
import type { Badge, PendingBadgeClaim, UserBadge } from "@/lib/types"

type MilestoneBadgeRow = {
  id: string
  criteria_type: "solves" | "streak" | "events" | "hours" | null
  criteria_value: number | null
}

type SessionStatsRow = {
  session_date: string
  num_solves: number | null
  duration_minutes: number
}

type CompetitionClaimInput = {
  badgeId: string
  year: number
  detail: string
  evidenceUrl: string
  isCurrent?: boolean
}

const COMPETITIVE_BADGE_NAMES = {
  worldRecord: "World Record Holder",
  continentalRecord: "Continental Record Holder",
  nationalRecord: "National Record Holder",
} as const

function computeLongestStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0

  const uniqueDates = [...new Set(sessionDates)]
    .sort((a, b) => new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime())

  let longest = 1
  let streak = 1

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] + "T00:00:00")
    const curr = new Date(uniqueDates[i] + "T00:00:00")
    const diffDays = (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000)

    if (Math.round(diffDays) === 1) {
      streak += 1
      longest = Math.max(longest, streak)
    } else {
      streak = 1
    }
  }

  return longest
}

function isValidWcaEvidenceUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false
    if (host !== "worldcubeassociation.org" && host !== "www.worldcubeassociation.org") return false

    return (
      path.includes("/persons/") ||
      path.includes("/competitions/") ||
      path.includes("/results")
    )
  } catch {
    return false
  }
}

async function requireAdminUser(): Promise<{ userId: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { userId: "", error: "Not authenticated" }
  if (user.id !== process.env.ADMIN_USER_ID) return { userId: "", error: "Not authorized" }

  return { userId: user.id }
}

export async function getBadgeDefinitions(): Promise<{
  data: Badge[]
  error?: string
}> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("badges")
    .select("*")
    .in("category", ["milestone", "competition"])
    .order("category", { ascending: true })
    .order("criteria_value", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data as Badge[]) ?? [] }
}

export async function getUserBadges(
  userId: string,
  options?: { includeRejected?: boolean }
): Promise<{ data: UserBadge[]; error?: string }> {
  const includeRejected = options?.includeRejected ?? false
  const admin = createAdminClient()

  let query = admin
    .from("user_badges")
    .select("*, badge:badges(*)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false })

  if (!includeRejected) {
    query = query.neq("status", "rejected")
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data as UserBadge[]) ?? [] }
}

/**
 * Auto-award milestone badges based on session history.
 * Idempotent via unique index (user_id, badge_id, source='auto').
 */
export async function syncMilestoneBadgesForUser(userId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: badges, error: badgesError } = await admin
    .from("badges")
    .select("id, criteria_type, criteria_value")
    .eq("category", "milestone")
    .eq("verification", "auto")
    .in("criteria_type", ["solves", "hours", "streak"])

  if (badgesError || !badges || badges.length === 0) return

  const milestoneBadges = (badges as MilestoneBadgeRow[]).filter(
    (b) => b.criteria_type && b.criteria_value != null
  )
  if (milestoneBadges.length === 0) return

  const { data: sessions, error: sessionsError } = await admin
    .from("sessions")
    .select("session_date, num_solves, duration_minutes")
    .eq("user_id", userId)

  if (sessionsError || !sessions || sessions.length === 0) return

  const sessionRows = sessions as SessionStatsRow[]
  const totalSolves = sessionRows.reduce((sum, s) => sum + (s.num_solves ?? 0), 0)
  const totalMinutes = sessionRows.reduce((sum, s) => sum + s.duration_minutes, 0)
  const longestStreak = computeLongestStreak(sessionRows.map((s) => s.session_date))

  const { data: existing } = await admin
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId)
    .eq("source", "auto")

  const earnedAutoBadgeIds = new Set((existing ?? []).map((r) => r.badge_id as string))

  for (const badge of milestoneBadges) {
    if (earnedAutoBadgeIds.has(badge.id)) continue

    let qualifies = false

    if (badge.criteria_type === "solves") {
      qualifies = totalSolves >= (badge.criteria_value ?? 0)
    } else if (badge.criteria_type === "hours") {
      qualifies = totalMinutes >= (badge.criteria_value ?? 0)
    } else if (badge.criteria_type === "streak") {
      qualifies = longestStreak >= (badge.criteria_value ?? 0)
    }

    if (!qualifies) continue

    const { data: inserted, error: insertError } = await admin
      .from("user_badges")
      .insert({
        user_id: userId,
        badge_id: badge.id,
        source: "auto",
        status: "approved",
        verified: true,
        is_current: true,
      })
      .select("id")
      .maybeSingle()

    if (insertError) {
      const code = (insertError as { code?: string }).code
      if (code !== "23505") {
        console.error("[badges] failed to insert milestone badge", insertError.message)
      }
      continue
    }

    if (inserted?.id) {
      await createNotification(userId, "badge", null, inserted.id)
    }
  }
}

/**
 * Sync current WR/CR/NR-holder badges from linked WCA results.
 * This updates only the 3 record-holder badges and keeps historical rows.
 */
export async function syncCurrentWcaRecordBadgesForUser(
  userId: string,
  wcaId: string
): Promise<void> {
  if (!wcaId) return

  const { data } = await getWcaResults(wcaId)
  if (!data) return

  let hasWorldRecord = false
  let hasContinentalRecord = false
  let hasNationalRecord = false

  for (const records of Object.values(data.personal_records)) {
    if ((records.single?.world_rank ?? Infinity) === 1 || (records.average?.world_rank ?? Infinity) === 1) {
      hasWorldRecord = true
    }
    if ((records.single?.continent_rank ?? Infinity) === 1 || (records.average?.continent_rank ?? Infinity) === 1) {
      hasContinentalRecord = true
    }
    if ((records.single?.country_rank ?? Infinity) === 1 || (records.average?.country_rank ?? Infinity) === 1) {
      hasNationalRecord = true
    }
  }

  const targetState = [
    { name: COMPETITIVE_BADGE_NAMES.worldRecord, isCurrent: hasWorldRecord },
    { name: COMPETITIVE_BADGE_NAMES.continentalRecord, isCurrent: hasContinentalRecord },
    { name: COMPETITIVE_BADGE_NAMES.nationalRecord, isCurrent: hasNationalRecord },
  ]

  const admin = createAdminClient()

  const { data: definitions } = await admin
    .from("badges")
    .select("id, name")
    .in("name", targetState.map((item) => item.name))

  if (!definitions || definitions.length === 0) return

  const definitionMap = new Map((definitions ?? []).map((b) => [b.name as string, b.id as string]))
  const badgeIds = Array.from(definitionMap.values())
  if (badgeIds.length === 0) return

  const { data: existing } = await admin
    .from("user_badges")
    .select("id, badge_id, is_current")
    .eq("user_id", userId)
    .eq("source", "auto")
    .in("badge_id", badgeIds)

  const existingMap = new Map((existing ?? []).map((row) => [row.badge_id as string, row]))

  for (const target of targetState) {
    const badgeId = definitionMap.get(target.name)
    if (!badgeId) continue

    const existingRow = existingMap.get(badgeId)

    if (target.isCurrent) {
      if (existingRow) {
        if (!existingRow.is_current) {
          await admin
            .from("user_badges")
            .update({ is_current: true, status: "approved", verified: true })
            .eq("id", existingRow.id)
        }
      } else {
        const { data: inserted, error: insertError } = await admin
          .from("user_badges")
          .insert({
            user_id: userId,
            badge_id: badgeId,
            detail: wcaId,
            source: "auto",
            status: "approved",
            verified: true,
            is_current: true,
          })
          .select("id")
          .maybeSingle()

        if (!insertError && inserted?.id) {
          await createNotification(userId, "badge", null, inserted.id)
        }
      }
      continue
    }

    if (existingRow?.is_current) {
      await admin
        .from("user_badges")
        .update({ is_current: false })
        .eq("id", existingRow.id)
    }
  }
}

export async function submitCompetitiveAchievementClaim(
  input: CompetitionClaimInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const badgeId = input.badgeId?.trim()
  const detail = input.detail?.trim()
  const evidenceUrl = input.evidenceUrl?.trim()
  const currentYear = new Date().getFullYear()

  if (!badgeId) return { success: false, error: "Badge is required." }
  if (!Number.isInteger(input.year) || input.year < 1982 || input.year > currentYear + 1) {
    return { success: false, error: "Please enter a valid year." }
  }
  if (!detail || detail.length < 3 || detail.length > 200) {
    return { success: false, error: "Please add detail between 3 and 200 characters." }
  }
  if (!evidenceUrl || !isValidWcaEvidenceUrl(evidenceUrl)) {
    return { success: false, error: "A valid WCA result URL is required." }
  }

  const admin = createAdminClient()

  const { data: badge, error: badgeError } = await admin
    .from("badges")
    .select("id, category, verification")
    .eq("id", badgeId)
    .single()

  if (badgeError || !badge || badge.category !== "competition" || badge.verification !== "admin") {
    return { success: false, error: "Invalid competitive badge." }
  }

  const { data: duplicate } = await admin
    .from("user_badges")
    .select("id")
    .eq("user_id", user.id)
    .eq("badge_id", badgeId)
    .eq("year", input.year)
    .eq("detail", detail)
    .eq("evidence_url", evidenceUrl)
    .eq("source", "claim")
    .in("status", ["pending", "approved"])
    .limit(1)

  if ((duplicate ?? []).length > 0) {
    return { success: false, error: "You already submitted this claim." }
  }

  const { error } = await admin.from("user_badges").insert({
    user_id: user.id,
    badge_id: badgeId,
    year: input.year,
    detail,
    evidence_url: evidenceUrl,
    source: "claim",
    status: "pending",
    verified: false,
    is_current: input.isCurrent ?? false,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getPendingBadgeClaims(): Promise<{
  data: PendingBadgeClaim[]
  error?: string
}> {
  const adminCheck = await requireAdminUser()
  if (adminCheck.error) {
    return { data: [], error: adminCheck.error }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("user_badges")
    .select(
      `
      *,
      badge:badges(*),
      profile:profiles!user_badges_user_id_fkey(display_name, handle, avatar_url)
    `
    )
    .eq("status", "pending")
    .order("earned_at", { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data as PendingBadgeClaim[]) ?? [] }
}

export async function approveCompetitiveAchievementClaim(
  userBadgeId: string,
  reviewNote?: string
): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await requireAdminUser()
  if (adminCheck.error) {
    return { success: false, error: adminCheck.error }
  }

  const admin = createAdminClient()

  const { data: claim, error: claimError } = await admin
    .from("user_badges")
    .select("id, user_id, status")
    .eq("id", userBadgeId)
    .single()

  if (claimError || !claim) {
    return { success: false, error: "Claim not found." }
  }

  if (claim.status !== "pending") {
    return { success: false, error: "Only pending claims can be approved." }
  }

  const { error } = await admin
    .from("user_badges")
    .update({
      status: "approved",
      verified: true,
      review_note: reviewNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminCheck.userId,
    })
    .eq("id", userBadgeId)

  if (error) {
    return { success: false, error: error.message }
  }

  await createNotification(claim.user_id as string, "badge", adminCheck.userId, userBadgeId)

  return { success: true }
}

export async function rejectCompetitiveAchievementClaim(
  userBadgeId: string,
  reviewNote: string
): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await requireAdminUser()
  if (adminCheck.error) {
    return { success: false, error: adminCheck.error }
  }

  const note = reviewNote.trim()
  if (note.length < 3 || note.length > 500) {
    return { success: false, error: "Please provide a rejection reason (3-500 characters)." }
  }

  const admin = createAdminClient()

  const { data: claim, error: claimError } = await admin
    .from("user_badges")
    .select("id, user_id, status")
    .eq("id", userBadgeId)
    .single()

  if (claimError || !claim) {
    return { success: false, error: "Claim not found." }
  }

  if (claim.status !== "pending") {
    return { success: false, error: "Only pending claims can be rejected." }
  }

  const { error } = await admin
    .from("user_badges")
    .update({
      status: "rejected",
      verified: false,
      review_note: note,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminCheck.userId,
    })
    .eq("id", userBadgeId)

  if (error) {
    return { success: false, error: error.message }
  }

  await createNotification(claim.user_id as string, "badge", adminCheck.userId, userBadgeId)

  return { success: true }
}

export async function backfillMilestoneBadgesForAllUsers(): Promise<{
  success: boolean
  processed: number
  error?: string
}> {
  const adminCheck = await requireAdminUser()
  if (adminCheck.error) {
    return { success: false, processed: 0, error: adminCheck.error }
  }

  const admin = createAdminClient()
  const { data: profiles, error } = await admin.from("profiles").select("id")

  if (error) {
    return { success: false, processed: 0, error: error.message }
  }

  let processed = 0
  for (const profile of profiles ?? []) {
    await syncMilestoneBadgesForUser(profile.id as string)
    processed += 1
  }

  return { success: true, processed }
}
