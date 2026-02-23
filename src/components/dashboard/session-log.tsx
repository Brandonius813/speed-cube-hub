"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Session } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"

const eventColors: Record<string, string> = {
  "333": "bg-chart-1/15 text-chart-1 border-chart-1/20",
  "444": "bg-primary/15 text-primary border-primary/20",
  "555": "bg-chart-3/15 text-chart-3 border-chart-3/20",
  "222": "bg-accent/15 text-accent border-accent/20",
  pyram: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  minx: "bg-chart-4/15 text-chart-4 border-chart-4/20",
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatAvg(avg: number | null): string {
  if (avg === null) return "--"
  if (avg >= 60) {
    const min = Math.floor(avg / 60)
    const sec = (avg % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${avg.toFixed(2)}s`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function SessionLog({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Session Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sessions yet. Log your first practice session to see it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Session Log</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {/* Mobile card layout */}
        <div className="flex flex-col gap-3 sm:hidden">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/30 px-3 py-3"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={eventColors[session.event] || ""}
                  >
                    {getEventLabel(session.event)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {session.practice_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(session.session_date)}</span>
                  <span>{session.num_solves} solves</span>
                  <span>{session.duration_minutes}m</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-semibold text-foreground">
                  {formatAvg(session.avg_time)}
                </div>
                <div className="text-[10px] text-muted-foreground">avg</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table layout */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                  Event
                </th>
                <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                  Solves
                </th>
                <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                  Avg Time
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-border/30 last:border-0 hover:bg-secondary/30"
                >
                  <td className="py-3 text-sm text-muted-foreground">
                    {formatDate(session.session_date)}
                  </td>
                  <td className="py-3">
                    <Badge
                      variant="outline"
                      className={eventColors[session.event] || ""}
                    >
                      {getEventLabel(session.event)}
                    </Badge>
                  </td>
                  <td className="py-3 text-sm text-foreground">
                    {session.practice_type}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-foreground">
                    {session.num_solves}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-foreground">
                    {session.duration_minutes}m
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-foreground">
                    {formatAvg(session.avg_time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
