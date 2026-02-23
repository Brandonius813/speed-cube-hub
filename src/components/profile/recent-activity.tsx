"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import type { Session } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"

const eventColors: Record<string, string> = {
  "333": "bg-chart-1/15 text-chart-1 border-chart-1/20",
  "444": "bg-primary/15 text-primary border-primary/20",
  "555": "bg-chart-3/15 text-chart-3 border-chart-3/20",
  "222": "bg-accent/15 text-accent border-accent/20",
  pyram: "bg-chart-5/15 text-chart-5 border-chart-5/20",
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatAvg(avg: number | null): string {
  if (avg === null) return ""
  if (avg >= 60) {
    const min = Math.floor(avg / 60)
    const sec = (avg % 60).toFixed(2)
    return `Avg: ${min}:${sec.padStart(5, "0")}`
  }
  return `Avg: ${avg.toFixed(2)}s`
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
            const avgStr = formatAvg(session.avg_time)
            const description = `${session.num_solves} solves in ${session.duration_minutes} minutes${avgStr ? `. ${avgStr}` : ""}`

            return (
              <div
                key={session.id}
                className="flex items-start gap-4 rounded-lg border border-border/50 bg-secondary/30 p-4"
              >
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={eventColors[session.event] || ""}
                    >
                      {getEventLabel(session.event)}
                    </Badge>
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
