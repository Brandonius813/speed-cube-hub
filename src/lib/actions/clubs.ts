"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionLikeInfo } from "@/lib/actions/likes"
import { getCommentCounts } from "@/lib/actions/comments"
import { loadPosts } from "@/lib/actions/posts"
import {
  getSocialPreviewClub,
  getSocialPreviewClubChallenges,
  getSocialPreviewClubFeed,
  getSocialPreviewClubLeaderboard,
  getSocialPreviewClubMembers,
  getSocialPreviewClubs,
  getSocialPreviewUserClubs,
  isSocialPreviewMode,
} from "@/lib/social-preview/mock-data"
import type {
  Challenge,
  Club,
  ClubLeaderboardEntry,
  ClubMember,
  FeedEntry,
  SessionFeedEntry,
} from "@/lib/types"

type ClubRow = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  created_by: string
  visibility?: "public" | "private"
  created_at: string
}

/** Get all clubs with member counts. Optionally filter by search query. */
export async function getClubs(query?: string): Promise<{
  clubs: Club[]
  currentUserId?: string
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewClubs(query)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let clubQuery = supabase
    .from("clubs")
    .select("*")
    .order("created_at", { ascending: false })

  if (query && query.trim()) {
    const safe = query.trim().replace(/[,.()"\\%_]/g, "")
    if (safe.length >= 1) {
      clubQuery = clubQuery.ilike("name", `%${safe}%`)
    }
  }

  const { data: clubs, error } = await clubQuery
  if (error) return { clubs: [], error: error.message }

  const clubIds = (clubs ?? []).map((c: ClubRow) => c.id)
  if (clubIds.length === 0) return { clubs: [], currentUserId: user?.id }

  // Fetch member counts via RPC + user memberships in parallel
  const [countResult, membershipResult] = await Promise.all([
    supabase.rpc("get_batch_club_member_counts", { p_club_ids: clubIds }),
    user
      ? supabase
          .from("club_members")
          .select("club_id, role")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as { club_id: string; role: string }[] }),
  ])

  const memberCounts = new Map<string, number>()
  for (const row of countResult.data ?? []) {
    memberCounts.set(row.club_id, Number(row.member_count))
  }

  const userClubIds = new Set<string>()
  const userRoles = new Map<string, string>()
  for (const m of membershipResult.data ?? []) {
    userClubIds.add(m.club_id)
    userRoles.set(m.club_id, m.role)
  }

  const enriched: Club[] = (clubs ?? []).map((c: ClubRow) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    avatar_url: c.avatar_url,
    created_by: c.created_by,
    visibility: c.visibility ?? "public",
    created_at: c.created_at,
    member_count: memberCounts.get(c.id) ?? 0,
    is_member: userClubIds.has(c.id),
    user_role: userRoles.get(c.id) ?? null,
  }))

  return { clubs: enriched, currentUserId: user?.id }
}

/** Get a single club with full details. */
export async function getClub(clubId: string): Promise<{
  club: Club | null
  currentUserId?: string
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewClub(clubId)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: club, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single()

  if (error || !club) return { club: null, error: error?.message ?? "Club not found" }

  const { count } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)

  let isMember = false
  let userRole: string | null = null
  if (user) {
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .single()
    if (membership) {
      isMember = true
      userRole = membership.role
    }
  }

  return {
    club: {
      id: club.id, name: club.name, description: club.description,
      avatar_url: club.avatar_url, created_by: club.created_by,
      visibility: club.visibility ?? "public",
      created_at: club.created_at, member_count: count ?? 0,
      is_member: isMember, user_role: userRole,
    },
    currentUserId: user?.id,
  }
}

/** Get members of a club with their profile data. */
export async function getClubMembers(clubId: string): Promise<{
  members: ClubMember[]
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewClubMembers(clubId)
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("club_members")
    .select(`
      user_id, role, joined_at,
      profile:profiles(display_name, handle, avatar_url)
    `)
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true })

  if (error) return { members: [], error: error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: ClubMember[] = ((data ?? []) as any[]).map((row) => ({
    user_id: row.user_id,
    display_name: row.profile.display_name,
    handle: row.profile.handle,
    avatar_url: row.profile.avatar_url,
    role: row.role,
    joined_at: row.joined_at,
  }))

  return { members }
}

/** Get recent mixed activity from all club members (sessions + posts). */
export async function getClubFeed(clubId: string): Promise<{
  items: FeedEntry[]
  currentUserId?: string
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewClubFeed(clubId)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberData } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)

  const memberIds = (memberData ?? []).map((m: { user_id: string }) => m.user_id)
  if (memberIds.length === 0) return { items: [], currentUserId: user?.id }

  const [{ data, error }, posts] = await Promise.all([
    supabase
      .from("sessions")
      .select(`*, profile:profiles(display_name, handle, avatar_url)`)
      .in("user_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(24),
    loadPosts({
      viewerId: user?.id ?? null,
      userIds: memberIds,
      limit: 24,
    }),
  ])

  if (error) return { items: [], error: error.message }

  const rawItems = data ?? []
  const sessionIds = rawItems.map((s: { id: string }) => s.id)

  const [likeInfo, commentCounts] = await Promise.all([
    getSessionLikeInfo(sessionIds, user?.id ?? null),
    getCommentCounts(sessionIds),
  ])

  const sessions: SessionFeedEntry[] = rawItems.map((s: Record<string, unknown>) => ({
    ...(s as unknown as SessionFeedEntry),
    entry_type: "session",
    entry_created_at: s.created_at as string,
    like_count: likeInfo.get(s.id as string)?.count ?? 0,
    has_liked: likeInfo.get(s.id as string)?.hasLiked ?? false,
    comment_count: commentCounts[s.id as string] ?? 0,
  }))

  const items: FeedEntry[] = [
    ...sessions,
    ...posts.map((post) => ({
      ...post,
      entry_type: "post" as const,
      entry_created_at: post.created_at,
    })),
  ]
    .sort((a, b) => Date.parse(b.entry_created_at) - Date.parse(a.entry_created_at))
    .slice(0, 24)

  return { items, currentUserId: user?.id }
}

export async function getClubChallenges(clubId: string): Promise<{
  challenges: Challenge[]
  currentUserId?: string
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewClubChallenges(clubId)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("club_id", clubId)
    .order("end_date", { ascending: true })

  if (error) {
    return { challenges: [], error: error.message }
  }

  if (!challenges || challenges.length === 0) {
    return { challenges: [], currentUserId: user?.id }
  }

  const challengeIds = challenges.map((challenge: { id: string }) => challenge.id)

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

  const joinedSet = new Set(
    (joinedResult.data ?? []).map((row) => row.challenge_id as string)
  )

  const mapped: Challenge[] = challenges.map(
    (challenge: {
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
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      scope: challenge.scope ?? "club",
      club_id: challenge.club_id ?? clubId,
      target_value: challenge.target_value,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      created_at: challenge.created_at,
      participant_count: countMap.get(challenge.id) ?? 0,
      has_joined: joinedSet.has(challenge.id),
    })
  )

  return { challenges: mapped, currentUserId: user?.id }
}

export async function getClubLeaderboard(clubId: string): Promise<{
  entries: ClubLeaderboardEntry[]
  windowDays: number
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewClubLeaderboard(clubId)
  }

  const supabase = await createClient()
  const windowDays = 30

  const { data: members, error: memberError } = await supabase
    .from("club_members")
    .select(`
      user_id,
      profile:profiles(display_name, handle, avatar_url)
    `)
    .eq("club_id", clubId)

  if (memberError) {
    return { entries: [], windowDays, error: memberError.message }
  }

  const memberList = ((members ?? []) as {
    user_id: string
    profile:
      | { display_name: string; handle: string; avatar_url: string | null }
      | { display_name: string; handle: string; avatar_url: string | null }[]
      | null
  }[])
    .map((member) => ({
      user_id: member.user_id,
      profile: Array.isArray(member.profile) ? member.profile[0] : member.profile,
    }))
    .filter(
      (member): member is {
        user_id: string
        profile: { display_name: string; handle: string; avatar_url: string | null }
      } => Boolean(member.profile)
    )
  const memberIds = memberList.map((member) => member.user_id)

  if (memberIds.length === 0) {
    return { entries: [], windowDays }
  }

  const since = new Date()
  since.setDate(since.getDate() - windowDays)
  const sinceDate = since.toISOString().slice(0, 10)

  const { data: sessions, error: sessionError } = await supabase
    .from("sessions")
    .select("user_id, num_solves, duration_minutes, best_time, avg_time")
    .in("user_id", memberIds)
    .gte("session_date", sinceDate)

  if (sessionError) {
    return { entries: [], windowDays, error: sessionError.message }
  }

  const aggregateMap = new Map<string, ClubLeaderboardEntry>()
  for (const member of memberList) {
    aggregateMap.set(member.user_id, {
      user_id: member.user_id,
      display_name: member.profile.display_name,
      handle: member.profile.handle,
      avatar_url: member.profile.avatar_url,
      session_count: 0,
      total_solves: 0,
      total_minutes: 0,
      best_single: null,
      best_mean: null,
    })
  }

  for (const session of (sessions ?? []) as {
    user_id: string
    num_solves: number | null
    duration_minutes: number | null
    best_time: number | null
    avg_time: number | null
  }[]) {
    const entry = aggregateMap.get(session.user_id)
    if (!entry) continue

    entry.session_count += 1
    entry.total_solves += session.num_solves ?? 0
    entry.total_minutes += session.duration_minutes ?? 0
    entry.best_single =
      entry.best_single === null
        ? session.best_time ?? null
        : session.best_time === null
          ? entry.best_single
          : Math.min(entry.best_single, session.best_time)
    entry.best_mean =
      entry.best_mean === null
        ? session.avg_time ?? null
        : session.avg_time === null
          ? entry.best_mean
          : Math.min(entry.best_mean, session.avg_time)
  }

  const entries = [...aggregateMap.values()]
    .sort((a, b) => {
      if (b.total_solves !== a.total_solves) return b.total_solves - a.total_solves
      if (b.session_count !== a.session_count) return b.session_count - a.session_count
      if ((a.best_single ?? Number.POSITIVE_INFINITY) !== (b.best_single ?? Number.POSITIVE_INFINITY)) {
        return (a.best_single ?? Number.POSITIVE_INFINITY) - (b.best_single ?? Number.POSITIVE_INFINITY)
      }
      return a.display_name.localeCompare(b.display_name)
    })
    .slice(0, 8)

  return { entries, windowDays }
}

/** Get clubs that a specific user belongs to. */
export async function getUserClubs(userId: string): Promise<{
  clubs: Club[]
  error?: string
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewUserClubs()
  }

  const supabase = await createClient()

  const { data: memberships, error: memberError } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", userId)

  if (memberError) return { clubs: [], error: memberError.message }
  if (!memberships || memberships.length === 0) return { clubs: [] }

  const clubIds = memberships.map((m: { club_id: string }) => m.club_id)
  const roleMap = new Map<string, string>()
  for (const m of memberships) roleMap.set(m.club_id, m.role)

  const { data: clubs, error: clubError } = await supabase
    .from("clubs")
    .select("*")
    .in("id", clubIds)
    .order("created_at", { ascending: false })

  if (clubError) return { clubs: [], error: clubError.message }

  // Get member counts via RPC (SQL COUNT GROUP BY — no row transfer)
  const { data: countData } = await supabase.rpc("get_batch_club_member_counts", {
    p_club_ids: clubIds,
  })

  const memberCounts = new Map<string, number>()
  for (const row of countData ?? []) {
    memberCounts.set(row.club_id, Number(row.member_count))
  }

  const enriched: Club[] = (clubs ?? []).map((c: ClubRow) => ({
    id: c.id, name: c.name, description: c.description,
    avatar_url: c.avatar_url, created_by: c.created_by,
    visibility: c.visibility ?? "public",
    created_at: c.created_at, member_count: memberCounts.get(c.id) ?? 0,
    is_member: true, user_role: roleMap.get(c.id) ?? null,
  }))

  return { clubs: enriched }
}
