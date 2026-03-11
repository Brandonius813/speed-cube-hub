"use server"

import { createClient } from "@/lib/supabase/server"
import { getCommentCounts } from "@/lib/actions/comments"
import { getViewerSocialState } from "@/lib/actions/follows"
import { getSessionLikeInfo } from "@/lib/actions/likes"
import { loadPosts } from "@/lib/actions/posts"
import { getSocialPreviewFeed, isSocialPreviewMode } from "@/lib/social-preview/mock-data"
import type { Challenge, FeedEntry, SessionFeedEntry } from "@/lib/types"

const FEED_PAGE_SIZE = 20

type FeedMode = "following" | "explore"

type FeedOptions = {
  cursor?: string | null
  mode?: FeedMode
}

function meaningfulSessionBoost(session: SessionFeedEntry) {
  let boost = 0
  if (session.title) boost += 1000 * 60 * 60 * 2
  if (session.notes) boost += 1000 * 60 * 60
  if ((session.num_solves ?? 0) >= 75) boost += 1000 * 60 * 45
  if (
    session.best_time !== null &&
    session.avg_time !== null &&
    session.best_time < session.avg_time
  ) {
    boost += 1000 * 60 * 30
  }
  return boost
}

function rankEntry(
  entry: FeedEntry,
  favoriteIds: Set<string>,
  mode: FeedMode
) {
  const base = Date.parse(entry.entry_created_at)
  const favoriteBoost = favoriteIds.has(entry.user_id)
    ? 1000 * 60 * 60 * (mode === "following" ? 10 : 4)
    : 0

  if (entry.entry_type === "post") {
    const mediaBoost = entry.media.length > 0 ? 1000 * 60 * 60 * 2 : 0
    const tagBoost = entry.tags.length > 0 ? 1000 * 60 * 60 : 0
    const engagementBoost =
      mode === "explore"
        ? (entry.like_count * 12 + entry.comment_count * 20) * 1000 * 60
        : (entry.like_count * 4 + entry.comment_count * 8) * 1000 * 60
    return base + favoriteBoost + mediaBoost + tagBoost + engagementBoost
  }

  const engagementBoost =
    mode === "explore"
      ? (entry.like_count * 8 + entry.comment_count * 12) * 1000 * 60
      : (entry.like_count * 3 + entry.comment_count * 5) * 1000 * 60

  return base + favoriteBoost + meaningfulSessionBoost(entry) + engagementBoost
}

async function loadSessionEntries(options: {
  viewerId: string
  userIds?: string[]
  before?: string | null
  limit?: number
}): Promise<SessionFeedEntry[]> {
  const supabase = await createClient()
  const limit = options.limit ?? FEED_PAGE_SIZE + 10

  let query = supabase
    .from("sessions")
    .select(`
      *,
      profile:profiles(
        display_name,
        handle,
        avatar_url
      )
    `)
    .not("feed_visible", "is", false)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (options.userIds && options.userIds.length > 0) {
    query = query.in("user_id", options.userIds)
  }

  if (options.before) {
    query = query.lt("created_at", options.before)
  }

  const { data, error } = await query

  if (error || !data) {
    if (error) {
      console.error("loadSessionEntries error", error)
    }
    return []
  }

  const sessionIds = data.map((row) => row.id as string)
  const [likeInfo, commentCounts] = await Promise.all([
    getSessionLikeInfo(sessionIds, options.viewerId),
    getCommentCounts(sessionIds),
  ])

  return data.map((row) => ({
    ...(row as unknown as SessionFeedEntry),
    entry_type: "session",
    entry_created_at: row.created_at as string,
    like_count: likeInfo.get(row.id as string)?.count ?? 0,
    has_liked: likeInfo.get(row.id as string)?.hasLiked ?? false,
    comment_count: commentCounts[row.id as string] ?? 0,
  }))
}

async function loadFeedHighlights(options: {
  viewerId: string
  mode: FeedMode
}): Promise<Challenge[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  let clubIds: string[] = []
  if (options.mode === "following") {
    const { data } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", options.viewerId)
    clubIds = (data ?? []).map((row) => row.club_id as string)
  }

  let query = supabase
    .from("challenges")
    .select("*")
    .gte("end_date", today)
    .order("created_at", { ascending: false })
    .limit(options.mode === "following" ? 4 : 3)

  if (options.mode === "following") {
    const filters = ["scope.eq.official"]
    if (clubIds.length > 0) {
      filters.push(`club_id.in.(${clubIds.join(",")})`)
    }
    query = query.or(filters.join(","))
  } else {
    query = query.eq("scope", "official")
  }

  const { data: challenges, error } = await query
  if (error || !challenges || challenges.length === 0) {
    return []
  }

  const challengeIds = challenges.map((challenge: { id: string }) => challenge.id)
  const [countResult, joinedResult] = await Promise.all([
    supabase.rpc("get_batch_challenge_participant_counts", {
      p_challenge_ids: challengeIds,
    }),
    supabase
      .from("challenge_participants")
      .select("challenge_id")
      .eq("user_id", options.viewerId)
      .in("challenge_id", challengeIds),
  ])

  const countMap = new Map<string, number>()
  for (const row of countResult.data ?? []) {
    countMap.set(row.challenge_id, Number(row.participant_count))
  }

  const joinedSet = new Set(
    (joinedResult.data ?? []).map((row) => row.challenge_id as string)
  )

  return challenges
    .map(
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
      scope: challenge.scope ?? "official",
      club_id: challenge.club_id ?? null,
      target_value: challenge.target_value,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      created_at: challenge.created_at,
      participant_count: countMap.get(challenge.id) ?? 0,
      has_joined: joinedSet.has(challenge.id),
    })
  )
    .sort((a, b) => {
      if (Number(b.has_joined) !== Number(a.has_joined)) {
        return Number(b.has_joined) - Number(a.has_joined)
      }
      if (b.participant_count !== a.participant_count) {
        return b.participant_count - a.participant_count
      }
      return Date.parse(b.created_at) - Date.parse(a.created_at)
    })
    .slice(0, options.mode === "following" ? 3 : 2)
}

export async function getFeed(
  options: FeedOptions = {}
): Promise<{
  items: FeedEntry[]
  highlights: Challenge[]
  nextCursor: string | null
  currentUserId?: string
  error?: string
}> {
  const mode = options.mode ?? "following"

  if (isSocialPreviewMode()) {
    return getSocialPreviewFeed(mode)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { items: [], highlights: [], nextCursor: null, error: "Not authenticated" }
  }

  const { followingIds, favoriteIds, mutedIds } = await getViewerSocialState()
  const mutedSet = new Set(mutedIds)
  const favoriteSet = new Set(favoriteIds)
  const highlights = await loadFeedHighlights({
    viewerId: user.id,
    mode,
  })

  let allowedUserIds: string[] | undefined
  let sessionEntries: SessionFeedEntry[]
  let postEntries = await loadPosts({
    viewerId: user.id,
    before: options.cursor ?? null,
    limit: FEED_PAGE_SIZE + 10,
  })

  if (mode === "following") {
    allowedUserIds = [...new Set([...followingIds, user.id])].filter(
      (id) => !mutedSet.has(id) || id === user.id
    )

    if (allowedUserIds.length === 0) {
      return { items: [], highlights, nextCursor: null, currentUserId: user.id }
    }

    sessionEntries = await loadSessionEntries({
      viewerId: user.id,
      userIds: allowedUserIds,
      before: options.cursor ?? null,
      limit: FEED_PAGE_SIZE + 10,
    })
    postEntries = postEntries.filter((post) => allowedUserIds?.includes(post.user_id))
  } else {
    const excluded = new Set([...followingIds, ...mutedIds, user.id])
    sessionEntries = (await loadSessionEntries({
      viewerId: user.id,
      before: options.cursor ?? null,
      limit: FEED_PAGE_SIZE + 18,
    })).filter((entry) => !excluded.has(entry.user_id))
    postEntries = postEntries.filter((post) => !excluded.has(post.user_id))
  }

  const combined = [...sessionEntries, ...postEntries.map((post) => ({
    ...post,
    entry_type: "post" as const,
    entry_created_at: post.created_at,
  }))]
    .filter((entry) => !mutedSet.has(entry.user_id) || entry.user_id === user.id)
    .map((entry) => ({
      ...entry,
      ranking_score: rankEntry(entry, favoriteSet, mode),
    }))
    .sort((a, b) => {
      if ((b.ranking_score ?? 0) !== (a.ranking_score ?? 0)) {
        return (b.ranking_score ?? 0) - (a.ranking_score ?? 0)
      }
      return Date.parse(b.entry_created_at) - Date.parse(a.entry_created_at)
    })

  const items = combined.slice(0, FEED_PAGE_SIZE)
  const nextCursor = items.length === FEED_PAGE_SIZE
    ? items[items.length - 1]?.entry_created_at ?? null
    : null

  return {
    items,
    highlights,
    nextCursor,
    currentUserId: user.id,
  }
}
