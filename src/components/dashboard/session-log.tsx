"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Session } from "@/lib/types"
import { EventBadge } from "@/components/shared/event-badge"
import { formatDuration } from "@/lib/utils"

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
              <div className="flex min-w-0 flex-col gap-1.5">
                {session.title && (
                  <span className="truncate text-sm font-medium text-foreground">
                    {session.title}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <EventBadge event={session.event} />
                  <span className="text-xs text-muted-foreground">
                    {session.practice_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(session.session_date)}</span>
                  <span>{session.num_solves} solves</span>
                  <span>{formatDuration(session.duration_minutes)}</span>
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
                    <div className="flex flex-col gap-1">
                      <EventBadge event={session.event} />
                      {session.title && (
                        <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {session.title}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-sm text-foreground">
                    {session.practice_type}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-foreground">
                    {session.num_solves}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-foreground">
                    {formatDuration(session.duration_minutes)}
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
