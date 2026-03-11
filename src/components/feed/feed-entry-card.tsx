"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, MessageCircle, Pin, Timer, Trophy } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EventBadge } from "@/components/shared/event-badge"
import { CommentThread } from "@/components/feed/comment-thread"
import { pinClubPost, unpinClubPost } from "@/lib/actions/club-mutations"
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
      return "PB"
    case "competition":
      return "Recap"
    case "session_recap":
      return "Session Recap"
    default:
      return "Post"
  }
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl bg-background/80 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-mono text-xl font-semibold text-foreground", accent && "text-accent")}>
        {value}
      </p>
    </div>
  )
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

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_repeat(4,minmax(0,1fr))]">
        <div className="rounded-2xl bg-background/80 p-4 xl:col-span-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Session Mean
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-foreground">
            {entry.avg_time !== null ? formatSolveTime(entry.avg_time) : "—"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {entry.num_solves ? `${entry.num_solves} solves in ${formatDuration(entry.duration_minutes)}` : "Session recap"}
          </p>
        </div>

        <StatCard
          label="Best Single"
          value={entry.best_time !== null ? formatSolveTime(entry.best_time) : "—"}
          accent
        />
        <StatCard
          label="Best Ao5"
          value={entry.best_ao5 !== null && entry.best_ao5 !== undefined ? formatSolveTime(entry.best_ao5) : "—"}
        />
        <StatCard
          label="Best Ao12"
          value={entry.best_ao12 !== null && entry.best_ao12 !== undefined ? formatSolveTime(entry.best_ao12) : "—"}
        />
        <StatCard
          label="Best Ao25"
          value={entry.best_ao25 !== null && entry.best_ao25 !== undefined ? formatSolveTime(entry.best_ao25) : "—"}
        />
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

function getSessionRecapMeta(entry: Extract<FeedEntry, { entry_type: "post" }>) {
  const sessionTag = entry.tags.find((tag) => tag.tag_type === "session")
  const metadata = sessionTag?.metadata ?? {}

  return {
    event: typeof metadata.event === "string" ? metadata.event : null,
    practiceType: typeof metadata.practice_type === "string" ? metadata.practice_type : null,
    avgTime: typeof metadata.avg_time === "number" ? metadata.avg_time : null,
    bestTime: typeof metadata.best_time === "number" ? metadata.best_time : null,
    bestAo5: typeof metadata.best_ao5 === "number" ? metadata.best_ao5 : null,
    bestAo12: typeof metadata.best_ao12 === "number" ? metadata.best_ao12 : null,
    bestAo25: typeof metadata.best_ao25 === "number" ? metadata.best_ao25 : null,
    numSolves: typeof metadata.num_solves === "number" ? metadata.num_solves : null,
    durationMinutes:
      typeof metadata.duration_minutes === "number" ? metadata.duration_minutes : null,
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
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl bg-background/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PB Time</p>
          <p className="mt-2 font-mono text-4xl font-semibold text-emerald-200">
            {pb.timeSeconds !== null ? formatSolveTime(pb.timeSeconds) : "PB"}
          </p>
          {pb.event ? (
            <p className="mt-3 text-sm font-medium text-foreground/80">
              {pb.event.toUpperCase()}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-background/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Type</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Trophy className="h-5 w-5 text-emerald-200" />
            {pb.pbType ? pb.pbType.toUpperCase() : "PB"}
          </p>
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

function SessionRecapHighlight({
  entry,
}: {
  entry: Extract<FeedEntry, { entry_type: "post" }>
}) {
  const session = getSessionRecapMeta(entry)

  if (
    session.avgTime === null &&
    session.bestTime === null &&
    session.bestAo5 === null &&
    session.bestAo12 === null &&
    session.bestAo25 === null &&
    session.numSolves === null
  ) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl border border-border/50 bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {session.event ? <EventBadge event={session.event} /> : null}
        {session.practiceType ? (
          <Badge variant="outline" className="border-border/50 bg-background/70">
            {session.practiceType}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_repeat(4,minmax(0,1fr))]">
        <div className="rounded-2xl bg-background/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Session Mean</p>
          <p className="mt-2 font-mono text-4xl font-semibold text-foreground">
            {session.avgTime !== null ? formatSolveTime(session.avgTime) : "—"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.numSolves !== null
              ? `${session.numSolves} solves${session.durationMinutes !== null ? ` in ${formatDuration(session.durationMinutes)}` : ""}`
              : "Session recap"}
          </p>
        </div>
        <StatCard
          label="Best Single"
          value={session.bestTime !== null ? formatSolveTime(session.bestTime) : "—"}
          accent
        />
        <StatCard
          label="Best Ao5"
          value={session.bestAo5 !== null ? formatSolveTime(session.bestAo5) : "—"}
        />
        <StatCard
          label="Best Ao12"
          value={session.bestAo12 !== null ? formatSolveTime(session.bestAo12) : "—"}
        />
        <StatCard
          label="Best Ao25"
          value={session.bestAo25 !== null ? formatSolveTime(session.bestAo25) : "—"}
        />
      </div>
    </div>
  )
}

export function FeedEntryCard({
  entry,
  currentUserId,
  clubContext,
}: {
  entry: FeedEntry
  currentUserId: string | null
  clubContext?: {
    clubId: string
    canManage: boolean
    pinnedPostId: string | null
    onPinnedPostChange: (postId: string | null) => void
  }
}) {
  const previewMode = process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_MODE === "1"
  const [liked, setLiked] = useState(entry.has_liked)
  const [likeCount, setLikeCount] = useState(entry.like_count)
  const [commentCount, setCommentCount] = useState(entry.comment_count)
  const [showComments, setShowComments] = useState(false)
  const [liking, setLiking] = useState(false)
  const [pinning, setPinning] = useState(false)
  const isPbPost = entry.entry_type === "post" && entry.post_type === "pb"
  const isPinnedPost =
    entry.entry_type === "post" && clubContext?.pinnedPostId === entry.id
  const canPinPost =
    entry.entry_type === "post" && Boolean(clubContext?.canManage)
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

  async function handlePinToggle() {
    if (!clubContext || entry.entry_type !== "post" || pinning) return
    setPinning(true)

    if (previewMode) {
      clubContext.onPinnedPostChange(isPinnedPost ? null : entry.id)
      setPinning(false)
      return
    }

    try {
      const result = isPinnedPost
        ? await unpinClubPost(clubContext.clubId)
        : await pinClubPost(clubContext.clubId, entry.id)

      if (result.success) {
        clubContext.onPinnedPostChange(isPinnedPost ? null : entry.id)
      }
    } finally {
      setPinning(false)
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

            {canPinPost ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handlePinToggle()}
                  disabled={pinning}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium uppercase tracking-[0.18em] transition-colors",
                    isPinnedPost
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      : "border-border/50 bg-secondary/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Pin className={cn("h-3.5 w-3.5", isPinnedPost ? "fill-current" : "")} />
                  {pinning ? "Saving" : isPinnedPost ? "Pinned to club" : "Pin to club"}
                </button>
              </div>
            ) : null}

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

        {entry.entry_type === "session" ? <SessionStats entry={entry} /> : null}

        {entry.entry_type === "post" && entry.post_type === "pb" ? <PbHighlight entry={entry} /> : null}
        {entry.entry_type === "post" && entry.post_type === "session_recap" ? (
          <SessionRecapHighlight entry={entry} />
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
