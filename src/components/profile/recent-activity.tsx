"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Pencil } from "lucide-react"
import type { Session } from "@/lib/types"
import { EventBadge } from "@/components/shared/event-badge"
import { formatDuration } from "@/lib/utils"
import { EditSessionModal } from "@/components/dashboard/edit-session-modal"

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

export function RecentActivity({ sessions, isOwner = false }: { sessions: Session[]; isOwner?: boolean }) {
  const router = useRouter()
  const [editSession, setEditSession] = useState<Session | null>(null)
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
                    <div className="ml-auto flex items-center gap-2">
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditSession(session)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(session.session_date)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {editSession && (
          <EditSessionModal
            open={!!editSession}
            onOpenChange={(open) => { if (!open) setEditSession(null) }}
            session={editSession}
            onSaved={() => {
              setEditSession(null)
              router.refresh()
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
