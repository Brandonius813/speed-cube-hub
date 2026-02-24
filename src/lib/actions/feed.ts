"use server"

import { createClient } from "@/lib/supabase/server"
import type { FeedItem } from "@/lib/types"

const FEED_PAGE_SIZE = 20

export async function getFeed(cursor?: string): Promise<{
  items: FeedItem[]
  nextCursor: string | null
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
  const { data: followData, error: followError } = await supabase
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
  let query = supabase
    .from("sessions")
    .select(`
      *,
      profile:profiles!sessions_user_id_fkey(
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
    return { items: [], nextCursor: null, error: error.message }
  }

  const hasMore = (data?.length ?? 0) > FEED_PAGE_SIZE
  const items = (data?.slice(0, FEED_PAGE_SIZE) ?? []) as FeedItem[]
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null

  return { items, nextCursor }
}
