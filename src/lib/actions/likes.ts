"use server"

import { createClient } from "@/lib/supabase/server"

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

  // Get like counts for all sessions in one query
  const { data: countData } = await supabase
    .from("likes")
    .select("session_id")
    .in("session_id", sessionIds)

  // Count likes per session
  const counts = new Map<string, number>()
  for (const row of countData ?? []) {
    counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1)
  }

  // Get which sessions the current user has liked
  const userLiked = new Set<string>()
  if (userId) {
    const { data: likedData } = await supabase
      .from("likes")
      .select("session_id")
      .eq("user_id", userId)
      .in("session_id", sessionIds)

    for (const row of likedData ?? []) {
      userLiked.add(row.session_id)
    }
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
