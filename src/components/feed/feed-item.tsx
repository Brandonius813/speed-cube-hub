"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Layers, Timer } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import type { FeedItem as FeedItemType } from "@/lib/types"

const eventColors: Record<string, string> = {
  "333": "border-chart-1/20 bg-chart-1/15 text-chart-1",
  "444": "border-primary/20 bg-primary/15 text-primary",
  "555": "border-chart-3/20 bg-chart-3/15 text-chart-3",
  "222": "border-accent/20 bg-accent/15 text-accent",
  pyram: "border-chart-5/20 bg-chart-5/15 text-chart-5",
  minx: "border-chart-4/20 bg-chart-4/15 text-chart-4",
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

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

export function FeedItem({ item }: { item: FeedItemType }) {
  const profile = item.profile

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

        {/* Session details */}
        <div className="mt-4 rounded-lg border border-border/30 bg-secondary/30 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge
              className={
                eventColors[item.event] ||
                "border-primary/20 bg-primary/15 text-primary"
              }
            >
              {getEventLabel(item.event)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {item.practice_type}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                {item.duration_minutes}
              </span>
              <span className="hidden text-muted-foreground sm:inline">
                min
              </span>
            </div>

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

          {item.notes && (
            <p className="mt-3 border-t border-border/30 pt-3 text-sm leading-relaxed text-muted-foreground">
              {item.notes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
