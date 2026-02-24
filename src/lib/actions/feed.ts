"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionLikeInfo } from "@/lib/actions/likes"
import { getCommentCounts } from "@/lib/actions/comments"
import type { FeedItem } from "@/lib/types"

const FEED_PAGE_SIZE = 20

export async function getFeed(cursor?: string): Promise<{
  items: FeedItem[]
  nextCursor: string | null
  currentUserId?: string
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { items: [], nextCursor: null, error: "Not authenticated" }
  }

  // Get the IDs of people the current user follows
  // Use admin client to bypass RLS — the follows table may lack a SELECT policy
  const admin = createAdminClient()
  const { data: followData, error: followError } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)

  if (followError) {
    return { items: [], nextCursor: null, error: followError.message }
  }

  const followingIds = followData.map((f) => f.following_id)

  // Include the user's own sessions in the feed too
  const feedUserIds = [...followingIds, user.id]

  if (feedUserIds.length === 0) {
    return { items: [], nextCursor: null }
  }

  // Query sessions from followed users + self, joined with profiles
  // Use admin client to avoid any RLS or foreign key hint issues
  let query = admin
    .from("sessions")
    .select(`
      *,
      profile:profiles(
        display_name,
        handle,
        avatar_url
      )
    `)
    .in("user_id", feedUserIds)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1)

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error("Feed sessions query error:", error)
    return { items: [], nextCursor: null, error: error.message }
  }

  const hasMore = (data?.length ?? 0) > FEED_PAGE_SIZE
  const rawItems = data?.slice(0, FEED_PAGE_SIZE) ?? []
  const nextCursor = hasMore ? rawItems[rawItems.length - 1]?.created_at : null

  // Enrich items with like + comment data
  const sessionIds = rawItems.map((s: { id: string }) => s.id)
  const [likeInfo, commentCounts] = await Promise.all([
    getSessionLikeInfo(sessionIds, user.id),
    getCommentCounts(sessionIds),
  ])

  const items: FeedItem[] = rawItems.map((s: Record<string, unknown>) => ({
    ...s,
    like_count: likeInfo.get(s.id as string)?.count ?? 0,
    has_liked: likeInfo.get(s.id as string)?.hasLiked ?? false,
    comment_count: commentCounts[s.id as string] ?? 0,
  })) as FeedItem[]

  return { items, nextCursor, currentUserId: user.id }
}
