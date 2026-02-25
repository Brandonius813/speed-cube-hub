"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/helpers/create-notification"
import type { Comment } from "@/lib/types"

/**
 * Add a comment to a session.
 * Returns the new comment (with profile info) or an error.
 */
export async function addComment(
  sessionId: string,
  content: string
): Promise<{ comment?: Comment; error?: string }> {
  const trimmed = content.trim()
  if (!trimmed) {
    return { error: "Comment cannot be empty" }
  }
  if (trimmed.length > 500) {
    return { error: "Comment must be 500 characters or less" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ session_id: sessionId, user_id: user.id, content: trimmed })
    .select(
      `
      *,
      profile:profiles!comments_user_id_fkey(
        display_name,
        handle,
        avatar_url
      )
    `
    )
    .single()

  if (error) {
    return { error: error.message }
  }

  // Notify the session owner (don't notify if you comment on your own session)
  const admin = createAdminClient()
  const { data: session } = await admin
    .from("sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single()

  if (session && session.user_id !== user.id) {
    await createNotification(session.user_id, "comment", user.id, sessionId)
  }

  return { comment: data as Comment }
}

/**
 * Get all comments for a session, ordered oldest-first so
 * the conversation reads top-to-bottom.
 */
export async function getComments(
  sessionId: string
): Promise<{ comments: Comment[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      profile:profiles!comments_user_id_fkey(
        display_name,
        handle,
        avatar_url
      )
    `
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) {
    return { comments: [], error: error.message }
  }

  return { comments: (data ?? []) as Comment[] }
}

/**
 * Delete a comment. Only the comment author can delete their own comment.
 */
export async function deleteComment(
  commentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Get comment counts for multiple sessions in a single query.
 * Returns a map of session_id → count.
 */
export async function getCommentCounts(
  sessionIds: string[]
): Promise<Record<string, number>> {
  if (sessionIds.length === 0) return {}

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("comments")
    .select("session_id")
    .in("session_id", sessionIds)

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.session_id] = (counts[row.session_id] || 0) + 1
  }
  return counts
}
