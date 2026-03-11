"use server"

import { createClient } from "@/lib/supabase/server"
import { createNotification } from "@/lib/helpers/create-notification"
import type { Comment, CommentThread } from "@/lib/types"

type CommentCountRow = Partial<Record<"session_id" | "post_id", string | null>>

type CommentTarget = {
  sessionId?: string
  postId?: string
}

function normalizeTarget(target: CommentTarget) {
  const hasSession = typeof target.sessionId === "string" && target.sessionId.length > 0
  const hasPost = typeof target.postId === "string" && target.postId.length > 0

  if ((hasSession ? 1 : 0) + (hasPost ? 1 : 0) !== 1) {
    throw new Error("Comments require exactly one target.")
  }

  return {
    session_id: hasSession ? target.sessionId! : null,
    post_id: hasPost ? target.postId! : null,
    tableName: hasSession ? "sessions" : "posts",
    targetId: hasSession ? target.sessionId! : target.postId!,
  }
}

function buildThreads(comments: Comment[]): CommentThread[] {
  const topLevel: CommentThread[] = []
  const byId = new Map<string, CommentThread>()

  for (const comment of comments) {
    if (comment.parent_comment_id) {
      continue
    }
    const thread: CommentThread = { ...comment, replies: [] }
    byId.set(comment.id, thread)
    topLevel.push(thread)
  }

  for (const comment of comments) {
    if (!comment.parent_comment_id) continue
    const parent = byId.get(comment.parent_comment_id)
    if (parent) {
      parent.replies.push(comment)
    }
  }

  return topLevel
}

async function addCommentToTarget(
  target: CommentTarget,
  content: string,
  parentCommentId?: string | null
): Promise<{ comment?: Comment; error?: string }> {
  const trimmed = content.trim()
  if (!trimmed) {
    return { error: "Comment cannot be empty" }
  }
  if (trimmed.length > 500) {
    return { error: "Comment must be 500 characters or less" }
  }

  const normalized = normalizeTarget(target)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  if (parentCommentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from("comments")
      .select("id, session_id, post_id, parent_comment_id")
      .eq("id", parentCommentId)
      .single()

    if (parentError || !parentComment) {
      return { error: "Reply target not found" }
    }

    if (parentComment.parent_comment_id) {
      return { error: "Replies can only be one level deep" }
    }

    if (
      parentComment.session_id !== normalized.session_id ||
      parentComment.post_id !== normalized.post_id
    ) {
      return { error: "Reply target mismatch" }
    }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      session_id: normalized.session_id,
      post_id: normalized.post_id,
      parent_comment_id: parentCommentId ?? null,
      user_id: user.id,
      content: trimmed,
    })
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

  const { data: ownerRow } = await supabase
    .from(normalized.tableName)
    .select("user_id")
    .eq("id", normalized.targetId)
    .single()

  if (ownerRow?.user_id && ownerRow.user_id !== user.id) {
    await createNotification(ownerRow.user_id, "comment", user.id, normalized.targetId)
  }

  return { comment: data as Comment }
}

async function getCommentsForTarget(
  target: CommentTarget
): Promise<{ comments: CommentThread[]; error?: string }> {
  const normalized = normalizeTarget(target)
  const supabase = await createClient()

  let query = supabase
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
    .order("created_at", { ascending: true })

  query =
    normalized.session_id !== null
      ? query.eq("session_id", normalized.session_id)
      : query.eq("post_id", normalized.post_id)

  const { data, error } = await query

  if (error) {
    return { comments: [], error: error.message }
  }

  return { comments: buildThreads((data ?? []) as Comment[]) }
}

async function getCommentCountsForTarget(
  target: "session" | "post",
  ids: string[]
): Promise<Record<string, number>> {
  if (ids.length === 0) return {}

  const supabase = await createClient()
  const targetColumn = target === "session" ? "session_id" : "post_id"

  const { data, error } = await supabase
    .from("comments")
    .select(targetColumn)
    .in(targetColumn, ids)

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  for (const row of data as CommentCountRow[]) {
    const id = row[targetColumn]
    if (typeof id === "string") {
      counts[id] = (counts[id] ?? 0) + 1
    }
  }
  return counts
}

export async function addComment(
  sessionId: string,
  content: string
): Promise<{ comment?: Comment; error?: string }> {
  return addCommentToTarget({ sessionId }, content)
}

export async function addPostComment(
  postId: string,
  content: string,
  parentCommentId?: string | null
): Promise<{ comment?: Comment; error?: string }> {
  return addCommentToTarget({ postId }, content, parentCommentId)
}

export async function addCommentReply(
  target: { sessionId?: string; postId?: string; parentCommentId: string },
  content: string
): Promise<{ comment?: Comment; error?: string }> {
  return addCommentToTarget(
    { sessionId: target.sessionId, postId: target.postId },
    content,
    target.parentCommentId
  )
}

export async function getComments(
  sessionId: string
): Promise<{ comments: Comment[]; error?: string }> {
  const result = await getCommentsForTarget({ sessionId })
  return {
    comments: result.comments,
    error: result.error,
  }
}

export async function getPostComments(
  postId: string
): Promise<{ comments: CommentThread[]; error?: string }> {
  return getCommentsForTarget({ postId })
}

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

export async function getCommentCounts(
  sessionIds: string[]
): Promise<Record<string, number>> {
  return getCommentCountsForTarget("session", sessionIds)
}

export async function getPostCommentCounts(
  postIds: string[]
): Promise<Record<string, number>> {
  return getCommentCountsForTarget("post", postIds)
}
