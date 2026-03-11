"use server"

import { createClient } from "@/lib/supabase/server"
import { createNotification } from "@/lib/helpers/create-notification"

type LikeTarget = "session" | "post"
type LikeRow = Partial<Record<"session_id" | "post_id", string | null>>

async function toggleLike(
  target: LikeTarget,
  targetId: string,
  mode: "like" | "unlike"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const targetColumn = target === "session" ? "session_id" : "post_id"

  if (mode === "like") {
    const { error } = await supabase.from("likes").insert({
      [targetColumn]: targetId,
      user_id: user.id,
    })

    if (error) {
      if (error.code === "23505") {
        return { success: true }
      }
      return { success: false, error: error.message }
    }

    const { data: ownerRow } = await supabase
      .from(target === "session" ? "sessions" : "posts")
      .select("user_id")
      .eq("id", targetId)
      .single()

    if (ownerRow?.user_id && ownerRow.user_id !== user.id) {
      await createNotification(ownerRow.user_id, "like", user.id, targetId)
    }

    return { success: true }
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq(targetColumn, targetId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

async function getLikeInfoForTarget(
  target: LikeTarget,
  targetIds: string[],
  userId: string | null
): Promise<Map<string, { count: number; hasLiked: boolean }>> {
  const supabase = await createClient()
  const result = new Map<string, { count: number; hasLiked: boolean }>()

  if (targetIds.length === 0) return result

  const targetColumn = target === "session" ? "session_id" : "post_id"

  const [countRows, likedRows] = await Promise.all([
    supabase
      .from("likes")
      .select(targetColumn)
      .in(targetColumn, targetIds),
    userId
      ? supabase
          .from("likes")
          .select(targetColumn)
          .eq("user_id", userId)
          .in(targetColumn, targetIds)
      : Promise.resolve({
          data: [] as Record<string, string>[],
          error: null,
        }),
  ])

  const counts = new Map<string, number>()
  for (const row of (countRows.data ?? []) as LikeRow[]) {
    const id = row[targetColumn]
    if (typeof id === "string") {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  const userLiked = new Set<string>()
  for (const row of (likedRows.data ?? []) as LikeRow[]) {
    const id = row[targetColumn]
    if (typeof id === "string") {
      userLiked.add(id)
    }
  }

  for (const id of targetIds) {
    result.set(id, {
      count: counts.get(id) ?? 0,
      hasLiked: userLiked.has(id),
    })
  }

  return result
}

export async function likeSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  return toggleLike("session", sessionId, "like")
}

export async function unlikeSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  return toggleLike("session", sessionId, "unlike")
}

export async function likePost(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  return toggleLike("post", postId, "like")
}

export async function unlikePost(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  return toggleLike("post", postId, "unlike")
}

export async function getSessionLikeInfo(
  sessionIds: string[],
  userId: string | null
): Promise<Map<string, { count: number; hasLiked: boolean }>> {
  return getLikeInfoForTarget("session", sessionIds, userId)
}

export async function getPostLikeInfo(
  postIds: string[],
  userId: string | null
): Promise<Map<string, { count: number; hasLiked: boolean }>> {
  return getLikeInfoForTarget("post", postIds, userId)
}
