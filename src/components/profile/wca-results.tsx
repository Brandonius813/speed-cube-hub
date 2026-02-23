"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Medal } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
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

const EVENT_COLORS: Record<string, string> = {
  "333": "#EF4444",
  "222": "#22D3EE",
  "444": "#6366F1",
  "555": "#F97316",
  "666": "#A855F7",
  "777": "#A855F7",
  "333oh": "#EF4444",
  "333bf": "#22D3EE",
  minx: "#F97316",
  pyram: "#A855F7",
  clock: "#6366F1",
  skewb: "#22D3EE",
  sq1: "#EF4444",
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

export function WcaResults({
  personalRecords,
  competitionCount,
}: {
  personalRecords: WcaPersonalRecords
  competitionCount: number
}) {
  const events = Object.entries(personalRecords)
    .map(([eventId, records]) => ({
      eventId,
      label: getEventLabel(eventId),
      single: records.single,
      average: records.average,
      color: EVENT_COLORS[eventId] || "#6366F1",
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
          <span className="text-xs text-muted-foreground">
            {competitionCount} comp{competitionCount !== 1 ? "s" : ""}
          </span>
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
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: event.color }}
                />
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
