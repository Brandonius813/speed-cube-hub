"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import type { Session } from "@/lib/types"
import { EventBadge } from "@/components/shared/event-badge"
import { formatDuration } from "@/lib/utils"

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(value: number | null, label: string): string {
  if (value === null) return ""
  if (value >= 60) {
    const min = Math.floor(value / 60)
    const sec = (value % 60).toFixed(2)
    return `${label}: ${min}:${sec.padStart(5, "0")}`
  }
  return `${label}: ${value.toFixed(2)}s`
}

export function RecentActivity({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No activity yet. Log your first session to see it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {sessions.map((session) => {
            const bestStr = formatTime(session.best_time, "Best")
            const avgStr = formatTime(session.avg_time, "Avg")
            const timeParts = [bestStr, avgStr].filter(Boolean).join(", ")
            const solvesStr = session.num_solves ? `${session.num_solves} solves in ` : ""
            const description = `${solvesStr}${formatDuration(session.duration_minutes)}${timeParts ? `. ${timeParts}` : ""}`

            return (
              <div
                key={session.id}
                className="flex items-start gap-4 rounded-lg border border-border/50 bg-secondary/30 p-4"
              >
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventBadge event={session.event} />
                    <span className="text-sm text-muted-foreground">
                      {session.practice_type}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(session.session_date)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
