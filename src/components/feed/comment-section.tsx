"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { addComment, getComments, deleteComment } from "@/lib/actions/comments"
import type { Comment } from "@/lib/types"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function CommentSection({
  sessionId,
  currentUserId,
  onCommentCountChange,
}: {
  sessionId: string
  currentUserId: string | null
  onCommentCountChange: (delta: number) => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load comments when the section first mounts (expands)
  useEffect(() => {
    async function loadComments() {
      setLoading(true)
      try {
        const result = await getComments(sessionId)
        setComments(result.comments)
        setLoaded(true)
      } catch {
        // Network error — show empty state
        setLoaded(true)
      } finally {
        setLoading(false)
      }
    }
    loadComments()
  }, [sessionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || submitting || !currentUserId) return

    setSubmitting(true)
    try {
      const result = await addComment(sessionId, inputValue)

      if (result.comment) {
        setComments((prev) => [...prev, result.comment!])
        setInputValue("")
        onCommentCountChange(1)
      }
    } catch {
      // Network error — silently fail
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId)
    try {
      const result = await deleteComment(commentId)
      if (!result.error) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        onCommentCountChange(-1)
      }
    } catch {
      // Network error — silently fail
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
      {/* Comment list */}
      {comments.length === 0 && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No comments yet. Be the first!
        </p>
      )}

      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start gap-2.5">
          <Link href={`/profile/${comment.profile.handle}`}>
            <Avatar className="h-7 w-7 border border-border/50">
              {comment.profile.avatar_url && (
                <AvatarImage
                  src={comment.profile.avatar_url}
                  alt={comment.profile.display_name}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                {getInitials(comment.profile.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <Link
                href={`/profile/${comment.profile.handle}`}
                className="shrink-0 text-xs font-semibold text-foreground hover:text-primary"
              >
                {comment.profile.display_name}
              </Link>
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground break-words">
              {comment.content}
            </p>
          </div>

          {currentUserId === comment.user_id && (
            <button
              onClick={() => handleDelete(comment.id)}
              disabled={deletingId === comment.id}
              className="shrink-0 p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
              aria-label="Delete comment"
            >
              {deletingId === comment.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      ))}

      {/* Add comment input */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            className="min-h-9 min-w-0 flex-1 rounded-md border border-border/50 bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!inputValue.trim() || submitting}
            className="h-9 shrink-0 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </form>
      ) : (
        <p className="py-1 text-center text-xs text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>{" "}
          to comment
        </p>
      )}
    </div>
  )
}
