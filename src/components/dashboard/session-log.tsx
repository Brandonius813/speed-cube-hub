"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import type { Session } from "@/lib/types"
import { EventBadge } from "@/components/shared/event-badge"
import { formatDuration } from "@/lib/utils"
import { EditSessionModal } from "@/components/dashboard/edit-session-modal"

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
  const router = useRouter()
  const [editingSession, setEditingSession] = useState<Session | null>(null)

  function handleSaved() {
    setEditingSession(null)
    router.refresh()
  }

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
    <>
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
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex gap-3 text-right">
                    {session.best_time !== null && (
                      <div>
                        <div className="font-mono text-sm font-semibold text-accent">
                          {formatAvg(session.best_time)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">best</div>
                      </div>
                    )}
                    <div>
                      <div className="font-mono text-sm font-semibold text-foreground">
                        {formatAvg(session.avg_time)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">avg</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingSession(session)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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
                    Best
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    Avg
                  </th>
                  <th className="w-10 pb-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="group border-b border-border/30 last:border-0 hover:bg-secondary/30"
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
                    <td className="py-3 text-right font-mono text-sm text-accent">
                      {formatAvg(session.best_time)}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-foreground">
                      {formatAvg(session.avg_time)}
                    </td>
                    <td className="py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                        onClick={() => setEditingSession(session)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {editingSession && (
        <EditSessionModal
          open={!!editingSession}
          onOpenChange={(open) => {
            if (!open) setEditingSession(null)
          }}
          session={editingSession}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
