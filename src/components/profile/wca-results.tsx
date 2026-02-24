"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Medal } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import type { WcaPersonalRecords } from "@/lib/actions/wca"

function formatWcaTime(centiseconds: number): string {
  const seconds = centiseconds / 100
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

export function WcaResults({
  personalRecords,
  competitionCount,
  wcaId,
}: {
  personalRecords: WcaPersonalRecords
  competitionCount: number
  wcaId?: string | null
}) {
  const events = Object.entries(personalRecords)
    .map(([eventId, records]) => ({
      eventId,
      label: getEventLabel(eventId),
      single: records.single,
      average: records.average,
    }))
    .sort((a, b) => {
      const aIdx = WCA_EVENTS.findIndex((e) => e.id === a.eventId)
      const bIdx = WCA_EVENTS.findIndex((e) => e.id === b.eventId)
      return aIdx - bIdx
    })

  if (events.length === 0) {
    return null
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Medal className="h-5 w-5 text-accent" />
            Official WCA Results
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {competitionCount} comp{competitionCount !== 1 ? "s" : ""}
            </span>
            {wcaId && (
              <a
                href={`https://www.worldcubeassociation.org/persons/${wcaId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                WCA Profile
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <div
              key={event.eventId}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-4"
            >
              <div className="flex items-center gap-3">
                <CubingIcon event={event.eventId} className="shrink-0 text-base text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {event.label}
                </span>
              </div>
              <div className="flex gap-6 text-right">
                {event.single && (
                  <div>
                    <p className="text-xs text-muted-foreground">Single</p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {formatWcaTime(event.single.best)}
                    </p>
                  </div>
                )}
                {event.average && (
                  <div>
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {formatWcaTime(event.average.best)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
