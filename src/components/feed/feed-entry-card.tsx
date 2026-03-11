"use client"

import { useState } from "react"
import Link from "next/link"
import { Camera, Heart, MessageCircle, Timer, Trophy, Zap } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EventBadge } from "@/components/shared/event-badge"
import { CommentThread } from "@/components/feed/comment-thread"
import { likePost, likeSession, unlikePost, unlikeSession } from "@/lib/actions/likes"
import type { FeedEntry } from "@/lib/types"
import { cn, formatDuration, formatSolveTime } from "@/lib/utils"

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
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function typeLabel(entry: FeedEntry) {
  if (entry.entry_type === "session") return "Training"
  switch (entry.post_type) {
    case "pb":
      return "PB Post"
    case "competition":
      return "Competition"
    case "session_recap":
      return "Session Recap"
    default:
      return "Post"
  }
}

function SessionStats({ entry }: { entry: Extract<FeedEntry, { entry_type: "session" }> }) {
  return (
    <div className="mt-4 rounded-2xl border border-border/50 bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <EventBadge event={entry.event} />
        <Badge variant="outline" className="border-border/50 bg-background/70">
          {entry.practice_type}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="rounded-2xl bg-background/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Session Mean
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-foreground">
            {entry.avg_time !== null ? formatSolveTime(entry.avg_time) : "—"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {entry.num_solves ? `${entry.num_solves} solves logged` : "Session recap"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Best Single
            </p>
            <p className="mt-2 font-mono text-xl font-semibold text-accent">
              {entry.best_time !== null ? formatSolveTime(entry.best_time) : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Duration
            </p>
            <p className="mt-2 font-mono text-xl font-semibold text-foreground">
              {formatDuration(entry.duration_minutes)}
            </p>
          </div>
          <div className="rounded-2xl bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Solves
            </p>
            <p className="mt-2 font-mono text-xl font-semibold text-foreground">
              {entry.num_solves ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Highlight
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Zap className="h-4 w-4 text-accent" />
              {entry.best_time !== null ? "Fast single" : "Solid session"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getPbMeta(entry: Extract<FeedEntry, { entry_type: "post" }>) {
  const pbTag = entry.tags.find((tag) => tag.tag_type === "pb")
  const metadata = pbTag?.metadata ?? {}

  return {
    event: typeof metadata.event === "string" ? metadata.event : null,
    pbType: typeof metadata.pb_type === "string" ? metadata.pb_type : null,
    timeSeconds:
      typeof metadata.time_seconds === "number"
        ? metadata.time_seconds
        : typeof metadata.time === "number"
          ? metadata.time
          : null,
    scramble: typeof metadata.scramble === "string" ? metadata.scramble : null,
  }
}

function PostMediaGallery({ entry }: { entry: Extract<FeedEntry, { entry_type: "post" }> }) {
  if (entry.media.length === 0) return null

  if (entry.media.length === 1) {
    const media = entry.media[0]
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-border/50 bg-secondary/30">
        <img
          src={media.url}
          alt={media.alt_text ?? "Feed photo"}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
    )
  }

  if (entry.media.length === 2) {
    return (
      <div className="mt-4 grid grid-cols-2 gap-2">
        {entry.media.map((media) => (
          <div
            key={media.id}
            className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/30"
          >
            <img
              src={media.url}
              alt={media.alt_text ?? "Feed photo"}
              className="aspect-square w-full object-cover"
            />
          </div>
        ))}
      </div>
    )
  }

  if (entry.media.length === 3) {
    return (
      <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-2">
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/30">
          <img
            src={entry.media[0].url}
            alt={entry.media[0].alt_text ?? "Feed photo"}
            className="h-full min-h-[18rem] w-full object-cover"
          />
        </div>
        <div className="grid gap-2">
          {entry.media.slice(1).map((media) => (
            <div
              key={media.id}
              className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/30"
            >
              <img
                src={media.url}
                alt={media.alt_text ?? "Feed photo"}
                className="aspect-square w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {entry.media.slice(0, 4).map((media) => (
        <div
          key={media.id}
          className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/30"
        >
          <img
            src={media.url}
            alt={media.alt_text ?? "Feed photo"}
            className="aspect-square w-full object-cover"
          />
        </div>
      ))}
    </div>
  )
}

function PbHighlight({ entry }: { entry: Extract<FeedEntry, { entry_type: "post" }> }) {
  const pb = getPbMeta(entry)

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(16,185,129,0.05))]">
      <div className="border-b border-emerald-500/15 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-100">
            <Trophy className="h-3 w-3" />
            New PB
          </Badge>
          {pb.event ? <EventBadge event={pb.event} /> : null}
          {pb.pbType ? (
            <Badge variant="outline" className="border-emerald-500/20 bg-background/50 text-emerald-100">
              {pb.pbType.toUpperCase()}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl bg-background/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PB Time</p>
          <p className="mt-2 font-mono text-4xl font-semibold text-emerald-200">
            {pb.timeSeconds !== null ? formatSolveTime(pb.timeSeconds) : "PB"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Event</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {pb.event ? <EventBadge event={pb.event} /> : "Unspecified"}
            </p>
          </div>
          <div className="rounded-2xl bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Type</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {pb.pbType ? pb.pbType.toUpperCase() : "PB"}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-background/80 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Scramble</p>
          <p className="mt-2 break-words font-mono text-sm text-foreground/85">
            {pb.scramble ?? "Scramble not attached to this post."}
          </p>
        </div>
      </div>
    </div>
  )
}

export function FeedEntryCard({
  entry,
  currentUserId,
}: {
  entry: FeedEntry
  currentUserId: string | null
}) {
  const previewMode = process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_MODE === "1"
  const [liked, setLiked] = useState(entry.has_liked)
  const [likeCount, setLikeCount] = useState(entry.like_count)
  const [commentCount, setCommentCount] = useState(entry.comment_count)
  const [showComments, setShowComments] = useState(false)
  const [liking, setLiking] = useState(false)
  const isPbPost = entry.entry_type === "post" && entry.post_type === "pb"
  const bodyText =
    entry.entry_type === "session"
      ? entry.notes || "Logged a focused training session."
      : entry.content

  async function handleLikeToggle() {
    if (!currentUserId || liking) return
    setLiking(true)

    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((count) => count + (nextLiked ? 1 : -1))

    if (previewMode) {
      setLiking(false)
      return
    }

    try {
      const result =
        entry.entry_type === "post"
          ? nextLiked
            ? await likePost(entry.id)
            : await unlikePost(entry.id)
          : nextLiked
            ? await likeSession(entry.id)
            : await unlikeSession(entry.id)

      if (!result.success) {
        setLiked(!nextLiked)
        setLikeCount((count) => count + (nextLiked ? -1 : 1))
      }
    } finally {
      setLiking(false)
    }
  }

  return (
    <Card className="overflow-hidden border-border/50 bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${entry.profile.handle}`}>
            <Avatar className="h-11 w-11 border border-primary/20">
              {entry.profile.avatar_url ? (
                <AvatarImage src={entry.profile.avatar_url} alt={entry.profile.display_name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {getInitials(entry.profile.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/profile/${entry.profile.handle}`}
                  className="truncate font-semibold text-foreground hover:text-primary"
                >
                  {entry.profile.display_name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="border-border/50 bg-secondary/40">
                    {typeLabel(entry)}
                  </Badge>
                  <span>@{entry.profile.handle}</span>
                </div>
              </div>

              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(entry.entry_created_at)}
              </span>
            </div>

            {entry.title ? (
              <h3 className="mt-3 text-lg font-semibold text-foreground">{entry.title}</h3>
            ) : null}

            {!isPbPost && bodyText ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
                {bodyText}
              </p>
            ) : null}
          </div>
        </div>

        {entry.entry_type === "post" && entry.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="rounded-full border-border/50 bg-secondary/50 px-3 py-1 text-xs text-foreground"
              >
                {tag.tag_type}: {tag.label}
              </Badge>
            ))}
          </div>
        ) : null}

        {entry.entry_type === "session" ? <SessionStats entry={entry} /> : null}

        {entry.entry_type === "post" && entry.post_type === "pb" ? <PbHighlight entry={entry} /> : null}

        {entry.entry_type === "post" && entry.post_type === "competition" ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
            <Camera className="h-4 w-4" />
            Competition recap
          </div>
        ) : null}

        {entry.entry_type === "post" && bodyText && isPbPost ? (
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
            {bodyText}
          </p>
        ) : null}

        {entry.entry_type === "post" && entry.media.length > 0 ? <PostMediaGallery entry={entry} /> : null}

        <div className="mt-4 flex items-center gap-1">
          <button
            type="button"
            onClick={() => void handleLikeToggle()}
            disabled={!currentUserId || liking}
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-full px-3 text-sm transition-colors",
              liked
                ? "bg-rose-500/12 text-rose-300"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Heart className={cn("h-4 w-4", liked ? "fill-current" : "")} />
            <span>Kudos</span>
            {likeCount > 0 ? <span className="font-mono text-xs">{likeCount}</span> : null}
          </button>

          <button
            type="button"
            onClick={() => setShowComments((open) => !open)}
            className="flex min-h-10 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Comments</span>
            {commentCount > 0 ? <span className="font-mono text-xs">{commentCount}</span> : null}
          </button>

          {entry.entry_type === "session" && entry.avg_time !== null ? (
            <div className="ml-auto hidden items-center gap-2 rounded-full border border-border/50 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground sm:flex">
              <Timer className="h-3.5 w-3.5" />
              <span className="font-mono text-foreground">
                {formatSolveTime(entry.avg_time)}
              </span>
              mean
            </div>
          ) : null}
        </div>

        {showComments ? (
          <div className="mt-4 border-t border-border/40 pt-4">
            <CommentThread
              targetType={entry.entry_type}
              targetId={entry.id}
              currentUserId={currentUserId}
              onCommentCountChange={(delta) =>
                setCommentCount((count) => Math.max(0, count + delta))
              }
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
