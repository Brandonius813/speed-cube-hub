"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, MessageCircle, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  addComment,
  addCommentReply,
  addPostComment,
  deleteComment,
  getComments,
  getPostComments,
} from "@/lib/actions/comments"
import {
  buildSocialPreviewComment,
  getSocialPreviewCommentThreads,
} from "@/lib/social-preview/mock-data"
import type { Comment, CommentThread as CommentThreadType } from "@/lib/types"

type TargetType = "session" | "post"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)

  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function CommentRow({
  comment,
  depth,
  currentUserId,
  onReply,
  onDelete,
}: {
  comment: Comment
  depth: 0 | 1
  currentUserId: string | null
  onReply?: () => void
  onDelete: () => void
}) {
  return (
    <div className={`flex items-start gap-2.5 ${depth === 1 ? "ml-9 mt-2" : ""}`}>
      <Link href={`/profile/${comment.profile.handle}`}>
        <Avatar className="h-8 w-8 border border-border/50">
          {comment.profile.avatar_url ? (
            <AvatarImage
              src={comment.profile.avatar_url}
              alt={comment.profile.display_name}
            />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
            {getInitials(comment.profile.display_name)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-secondary/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${comment.profile.handle}`}
              className="truncate text-xs font-semibold text-foreground hover:text-primary"
            >
              {comment.profile.display_name}
            </Link>
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(comment.created_at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
            {comment.content}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-3 px-1 text-xs">
          {depth === 0 && currentUserId ? (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              type="button"
            >
              <MessageCircle className="h-3 w-3" />
              Reply
            </button>
          ) : null}

          {currentUserId === comment.user_id ? (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
              type="button"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CommentThread({
  targetType,
  targetId,
  currentUserId,
  onCommentCountChange,
}: {
  targetType: TargetType
  targetId: string
  currentUserId: string | null
  onCommentCountChange: (delta: number) => void
}) {
  const previewMode = process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_MODE === "1"
  const [threads, setThreads] = useState<CommentThreadType[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyValue, setReplyValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      if (previewMode) {
        if (active) {
          setThreads(getSocialPreviewCommentThreads(targetType, targetId))
          setLoading(false)
        }
        return
      }

      const result =
        targetType === "post"
          ? await getPostComments(targetId)
          : await getComments(targetId)

      if (active) {
        setThreads((result.comments ?? []) as CommentThreadType[])
        setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [previewMode, targetId, targetType])

  async function handleSubmit() {
    if (!currentUserId || submitting) return

    const nextValue = inputValue.trim()
    if (!nextValue) return

    if (previewMode) {
      const comment = buildSocialPreviewComment({
        targetType,
        targetId,
        content: nextValue,
      })
      setThreads((prev) => [...prev, { ...comment, replies: [] }])
      setInputValue("")
      onCommentCountChange(1)
      return
    }

    setSubmitting(true)
    try {
      const result =
        targetType === "post"
          ? await addPostComment(targetId, nextValue)
          : await addComment(targetId, nextValue)

      if (result.comment) {
        setThreads((prev) => [...prev, { ...result.comment!, replies: [] }])
        setInputValue("")
        onCommentCountChange(1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReply(parentId: string) {
    if (!currentUserId || submitting) return

    const nextValue = replyValue.trim()
    if (!nextValue) return

    if (previewMode) {
      const comment = buildSocialPreviewComment({
        targetType,
        targetId,
        content: nextValue,
        parentCommentId: parentId,
      })
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === parentId ? { ...thread, replies: [...thread.replies, comment] } : thread
        )
      )
      setReplyingTo(null)
      setReplyValue("")
      onCommentCountChange(1)
      return
    }

    setSubmitting(true)
    try {
      const result =
        targetType === "post"
          ? await addCommentReply({ postId: targetId, parentCommentId: parentId }, nextValue)
          : await addCommentReply({ sessionId: targetId, parentCommentId: parentId }, nextValue)

      if (result.comment) {
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === parentId
              ? { ...thread, replies: [...thread.replies, result.comment!] }
              : thread
          )
        )
        setReplyingTo(null)
        setReplyValue("")
        onCommentCountChange(1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (previewMode) {
      let removed = 0
      setThreads((prev) =>
        prev
          .filter((thread) => {
            if (thread.id === commentId) {
              removed += 1 + thread.replies.length
              return false
            }
            return true
          })
          .map((thread) => {
            const nextReplies = thread.replies.filter((reply) => reply.id !== commentId)
            if (nextReplies.length !== thread.replies.length) {
              removed += 1
            }
            return { ...thread, replies: nextReplies }
          })
      )
      if (removed > 0) {
        onCommentCountChange(-removed)
      }
      return
    }

    setDeletingId(commentId)
    try {
      const result = await deleteComment(commentId)
      if (!result.error) {
        let removed = 0
        setThreads((prev) =>
          prev
            .filter((thread) => {
              if (thread.id === commentId) {
                removed += 1 + thread.replies.length
                return false
              }
              return true
            })
            .map((thread) => {
              const nextReplies = thread.replies.filter((reply) => reply.id !== commentId)
              if (nextReplies.length !== thread.replies.length) {
                removed += 1
              }
              return { ...thread, replies: nextReplies }
            })
        )
        if (removed > 0) {
          onCommentCountChange(-removed)
        }
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {threads.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No comments yet. Be the first to add one.
        </p>
      ) : null}

      {threads.map((thread) => (
        <div key={thread.id}>
          <CommentRow
            comment={thread}
            depth={0}
            currentUserId={currentUserId}
            onReply={() => {
              setReplyingTo((current) => (current === thread.id ? null : thread.id))
              setReplyValue("")
            }}
            onDelete={() => void handleDelete(thread.id)}
          />

          {thread.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              depth={1}
              currentUserId={currentUserId}
              onDelete={() => void handleDelete(reply.id)}
            />
          ))}

          {replyingTo === thread.id ? (
            <div className="ml-9 mt-2 flex items-center gap-2">
              <Input
                value={replyValue}
                onChange={(event) => setReplyValue(event.target.value)}
                placeholder={`Reply to ${thread.profile.display_name}...`}
                className="min-h-10"
                maxLength={500}
              />
              <Button
                type="button"
                size="sm"
                disabled={!replyValue.trim() || submitting}
                onClick={() => void handleReply(thread.id)}
                className="min-h-10"
              >
                Reply
              </Button>
            </div>
          ) : null}

          {deletingId === thread.id ? (
            <p className="ml-9 mt-1 text-xs text-muted-foreground">Deleting...</p>
          ) : null}
        </div>
      ))}

      {currentUserId ? (
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Write a comment..."
            className="min-h-11"
            maxLength={500}
          />
          <Button
            type="button"
            disabled={!inputValue.trim() || submitting}
            onClick={() => void handleSubmit()}
            className="min-h-11"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
    </div>
  )
}
