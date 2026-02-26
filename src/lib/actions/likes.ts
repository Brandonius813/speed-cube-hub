"use server"

import { createClient } from "@/lib/supabase/server"
import { createNotification } from "@/lib/helpers/create-notification"

export async function likeSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase.from("likes").insert({
    session_id: sessionId,
    user_id: user.id,
  })

  if (error) {
    // Unique constraint violation means already liked
    if (error.code === "23505") {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  // Notify the session owner (don't notify if you liked your own session)
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single()

  if (session && session.user_id !== user.id) {
    await createNotification(session.user_id, "like", user.id, sessionId)
  }

  return { success: true }
}

export async function unlikeSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getSessionLikeInfo(
  sessionIds: string[],
  userId: string | null
): Promise<Map<string, { count: number; hasLiked: boolean }>> {
  const supabase = await createClient()
  const result = new Map<string, { count: number; hasLiked: boolean }>()

  if (sessionIds.length === 0) return result

  // Get like counts via RPC (SQL COUNT GROUP BY — no row transfer)
  // and user's own likes in parallel
  const [countResult, likedResult] = await Promise.all([
    supabase.rpc("get_batch_like_counts", { p_session_ids: sessionIds }),
    userId
      ? supabase
          .from("likes")
          .select("session_id")
          .eq("user_id", userId)
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
  ])

  const counts = new Map<string, number>()
  for (const row of countResult.data ?? []) {
    counts.set(row.session_id, Number(row.like_count))
  }

  const userLiked = new Set<string>()
  for (const row of likedResult.data ?? []) {
    userLiked.add(row.session_id)
  }

  // Build the result map
  for (const id of sessionIds) {
    result.set(id, {
      count: counts.get(id) ?? 0,
      hasLiked: userLiked.has(id),
    })
  }

  return result
}
