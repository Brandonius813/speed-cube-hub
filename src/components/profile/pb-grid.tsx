"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import type { Session } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { ShareButton } from "@/components/feed/share-button"
import { formatEventTime } from "@/lib/utils"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number, eventId?: string): string {
  return formatEventTime(seconds, eventId)
}

export function PBGrid({
  sessions,
  displayName,
  handle,
  onEventClick,
}: {
  sessions: Session[]
  displayName?: string
  handle?: string
  onEventClick?: (event: string) => void
}) {
  // Compute best singles and averages per event from session data
  const eventBests: Record<string, { bestSingle: number | null; bestAvg: number | null }> = {}

  for (const session of sessions) {
    const current = eventBests[session.event] ?? { bestSingle: null, bestAvg: null }

    if (session.best_time !== null) {
      if (current.bestSingle === null || session.best_time < current.bestSingle) {
        current.bestSingle = session.best_time
      }
    }

    if (session.avg_time !== null) {
      if (current.bestAvg === null || session.avg_time < current.bestAvg) {
        current.bestAvg = session.avg_time
      }
    }

    eventBests[session.event] = current
  }

  const pbs = Object.entries(eventBests)
    .filter(([, data]) => data.bestSingle !== null || data.bestAvg !== null)
    .map(([event, data]) => ({
      event,
      label: getEventLabel(event),
      bestSingle: data.bestSingle,
      bestAvg: data.bestAvg,
    }))
    .sort((a, b) => {
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
            Log sessions with times to see your PBs here.
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
              className={`flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-4${onEventClick ? " cursor-pointer transition hover:bg-secondary/80" : ""}`}
              onClick={onEventClick ? () => onEventClick(pb.event) : undefined}
            >
              <div className="flex min-w-0 items-center gap-3">
                <CubingIcon event={pb.event} className="shrink-0 text-base text-muted-foreground" />
                <span className="truncate font-medium text-foreground">{pb.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-4 text-right">
                  {pb.bestSingle !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Single</p>
                      <p className="font-mono text-sm font-semibold text-accent">
                        {formatTime(pb.bestSingle, pb.event)}
                      </p>
                    </div>
                  )}
                  {pb.bestAvg !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Avg</p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {formatTime(pb.bestAvg, pb.event)}
                      </p>
                    </div>
                  )}
                </div>
                {displayName && handle && (
                  <ShareButton
                    type="pb"
                    name={displayName}
                    handle={handle}
                    event={pb.event}
                    time={pb.bestSingle !== null ? String(pb.bestSingle) : null}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
