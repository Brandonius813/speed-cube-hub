"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import type { Session } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

export function PBGrid({ sessions }: { sessions: Session[] }) {
  // Compute best averages per event from session data
  const eventBests: Record<string, { bestAvg: number }> = {}

  for (const session of sessions) {
    if (session.avg_time === null) continue
    const current = eventBests[session.event]
    if (!current || session.avg_time < current.bestAvg) {
      eventBests[session.event] = { bestAvg: session.avg_time }
    }
  }

  const pbs = Object.entries(eventBests)
    .map(([event, data]) => ({
      event,
      label: getEventLabel(event),
      bestAvg: data.bestAvg,
    }))
    .sort((a, b) => {
      // Sort by event order in WCA_EVENTS
      const aIdx = WCA_EVENTS.findIndex((e) => e.id === a.event)
      const bIdx = WCA_EVENTS.findIndex((e) => e.id === b.event)
      return aIdx - bIdx
    })

  if (pbs.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-accent" />
            Personal Bests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Log sessions with averages to see your PBs here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Trophy className="h-5 w-5 text-accent" />
          Personal Bests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {pbs.map((pb) => (
            <div
              key={pb.event}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CubingIcon event={pb.event} className="shrink-0 text-base text-muted-foreground" />
                <span className="truncate font-medium text-foreground">{pb.label}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Best Avg</p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {formatTime(pb.bestAvg)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
