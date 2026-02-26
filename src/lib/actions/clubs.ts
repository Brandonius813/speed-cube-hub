"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionLikeInfo } from "@/lib/actions/likes"
import { getCommentCounts } from "@/lib/actions/comments"
import type { Club, ClubMember, FeedItem } from "@/lib/types"

type ClubRow = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  created_by: string
  created_at: string
}

/** Get all clubs with member counts. Optionally filter by search query. */
export async function getClubs(query?: string): Promise<{
  clubs: Club[]
  currentUserId?: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let clubQuery = supabase
    .from("clubs")
    .select("id, name, description, avatar_url, created_by, created_at")
    .order("created_at", { ascending: false })

  if (query && query.trim()) {
    clubQuery = clubQuery.ilike("name", `%${query.trim()}%`)
  }

  const { data: clubs, error } = await clubQuery
  if (error) return { clubs: [], error: error.message }

  const clubIds = (clubs ?? []).map((c: ClubRow) => c.id)
  if (clubIds.length === 0) return { clubs: [], currentUserId: user?.id }

  const { data: memberRows } = await supabase
    .from("club_members")
    .select("club_id")
    .in("club_id", clubIds)

  const memberCounts = new Map<string, number>()
  for (const row of memberRows ?? []) {
    memberCounts.set(row.club_id, (memberCounts.get(row.club_id) ?? 0) + 1)
  }

  const userClubIds = new Set<string>()
  const userRoles = new Map<string, string>()
  if (user) {
    const { data: memberships } = await supabase
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", user.id)
    for (const m of memberships ?? []) {
      userClubIds.add(m.club_id)
      userRoles.set(m.club_id, m.role)
    }
  }

  const enriched: Club[] = (clubs ?? []).map((c: ClubRow) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    avatar_url: c.avatar_url,
    created_by: c.created_by,
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: club, error } = await supabase
    .from("clubs")
    .select("id, name, description, avatar_url, created_by, created_at")
    .eq("id", clubId)
    .single()

  if (error || !club) return { club: null, error: error?.message ?? "Club not found" }

  const { count } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
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

/** Get recent sessions from all club members (club activity feed). */
export async function getClubFeed(clubId: string): Promise<{
  items: FeedItem[]
  currentUserId?: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberData } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)

  const memberIds = (memberData ?? []).map((m: { user_id: string }) => m.user_id)
  if (memberIds.length === 0) return { items: [], currentUserId: user?.id }

  const { data, error } = await supabase
    .from("sessions")
    .select(`id, user_id, session_date, event, practice_type, num_solves, num_dnf, duration_minutes, avg_time, best_time, title, notes, feed_visible, timer_session_id, created_at, profile:profiles(display_name, handle, avatar_url)`)
    .in("user_id", memberIds)
    .order("created_at", { ascending: false })
    .limit(30)

  if (error) return { items: [], error: error.message }

  const rawItems = data ?? []
  const sessionIds = rawItems.map((s: { id: string }) => s.id)

  const [likeInfo, commentCounts] = await Promise.all([
    getSessionLikeInfo(sessionIds, user?.id ?? null),
    getCommentCounts(sessionIds),
  ])

  const items: FeedItem[] = rawItems.map((s: Record<string, unknown>) => ({
    ...s,
    like_count: likeInfo.get(s.id as string)?.count ?? 0,
    has_liked: likeInfo.get(s.id as string)?.hasLiked ?? false,
    comment_count: commentCounts[s.id as string] ?? 0,
  })) as FeedItem[]

  return { items, currentUserId: user?.id }
}

/** Get clubs that a specific user belongs to. */
export async function getUserClubs(userId: string): Promise<{
  clubs: Club[]
  error?: string
}> {
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
    .select("id, name, description, avatar_url, created_by, created_at")
    .in("id", clubIds)
    .order("created_at", { ascending: false })

  if (clubError) return { clubs: [], error: clubError.message }

  const { data: allMembers } = await supabase
    .from("club_members")
    .select("club_id")
    .in("club_id", clubIds)

  const memberCounts = new Map<string, number>()
  for (const row of allMembers ?? []) {
    memberCounts.set(row.club_id, (memberCounts.get(row.club_id) ?? 0) + 1)
  }

  const enriched: Club[] = (clubs ?? []).map((c: ClubRow) => ({
    id: c.id, name: c.name, description: c.description,
    avatar_url: c.avatar_url, created_by: c.created_by,
    created_at: c.created_at, member_count: memberCounts.get(c.id) ?? 0,
    is_member: true, user_role: roleMap.get(c.id) ?? null,
  }))

  return { clubs: enriched }
}
