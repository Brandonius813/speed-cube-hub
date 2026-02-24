"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Layers, Timer, Zap, MessageCircle } from "lucide-react"
import type { FeedItem as FeedItemType } from "@/lib/types"
import { EventBadge } from "@/components/shared/event-badge"
import { LikeButton } from "@/components/feed/like-button"
import { CommentSection } from "@/components/feed/comment-section"
import { ShareButton } from "@/components/feed/share-button"
import { formatDuration } from "@/lib/utils"

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

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks}w ago`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatAvg(avg: number | null): string {
  if (avg === null) return ""
  if (avg >= 60) {
    const min = Math.floor(avg / 60)
    const sec = (avg % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${avg.toFixed(2)}s`
}

export function FeedItem({ item, currentUserId }: { item: FeedItemType; currentUserId: string | null }) {
  const profile = item.profile
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(item.comment_count)

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4 sm:p-5">
        {/* Header: avatar, name, time */}
        <div className="flex items-start gap-3">
          <Link href={`/profile/${profile.handle}`}>
            <Avatar className="h-10 w-10 border border-primary/20">
              {profile.avatar_url && (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.display_name}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {getInitials(profile.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/profile/${profile.handle}`}
                className="truncate font-semibold text-foreground hover:text-primary"
              >
                {profile.display_name}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(item.created_at)}
              </span>
            </div>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Logged a {item.practice_type.toLowerCase()} session
            </p>
          </div>
        </div>

        {/* Title — shown as a headline when provided */}
        {item.title && (
          <h3 className="mt-3 text-base font-semibold text-foreground">
            {item.title}
          </h3>
        )}

        {/* Description — shown below title */}
        {item.notes && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {item.notes}
          </p>
        )}

        {/* Session details */}
        <div className="mt-3 rounded-lg border border-border/30 bg-secondary/30 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <EventBadge event={item.event} />
            <span className="text-xs text-muted-foreground">
              {item.practice_type}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5 text-sm">
              <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-mono font-medium text-foreground">
                {item.num_solves}
              </span>
              <span className="hidden text-muted-foreground sm:inline">
                solves
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-mono font-medium text-foreground">
                {formatDuration(item.duration_minutes)}
              </span>
            </div>

            {item.best_time !== null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Zap className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="font-mono font-medium text-accent">
                  {formatAvg(item.best_time)}
                </span>
                <span className="hidden text-muted-foreground sm:inline">
                  best
                </span>
              </div>
            )}

            {item.avg_time !== null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Timer className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-mono font-medium text-foreground">
                  {formatAvg(item.avg_time)}
                </span>
                <span className="hidden text-muted-foreground sm:inline">
                  avg
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions: like + comment + share */}
        <div className="mt-3 flex items-center gap-1 -ml-2">
          <LikeButton
            sessionId={item.id}
            initialCount={item.like_count}
            initialHasLiked={item.has_liked}
          />
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            {commentCount > 0 && (
              <span className="font-mono text-xs">{commentCount}</span>
            )}
          </button>
          <ShareButton
            type="session"
            name={profile.display_name}
            handle={profile.handle}
            event={item.event}
            time={item.avg_time !== null ? String(item.avg_time) : null}
            solves={String(item.num_solves)}
          />
        </div>

        {/* Expandable comment section */}
        {showComments && (
          <div className="mt-3 border-t border-border/30 pt-3">
            <CommentSection
              sessionId={item.id}
              currentUserId={currentUserId}
              onCommentCountChange={(delta) => setCommentCount((prev) => prev + delta)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
