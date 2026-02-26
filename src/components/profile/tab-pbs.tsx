"use client"

import { PBGrid } from "@/components/profile/pb-grid"
import { PBProgressChart } from "@/components/profile/pb-progress-chart"
import type { Profile, Session, PBRecord } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { Card, CardContent } from "@/components/ui/card"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number, eventId?: string): string {
  if (eventId === "333fm") return Number.isInteger(seconds) ? `${seconds}` : `${seconds.toFixed(2)}`
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

/** Read-only PB display for visitors (no edit/delete/add) */
function ReadOnlyPBGrid({ pbs }: { pbs: PBRecord[] }) {
  if (pbs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No personal bests logged yet.</p>
    )
  }

  // Group PBs by event
  const eventMap = new Map<string, PBRecord[]>()
  for (const pb of pbs) {
    const existing = eventMap.get(pb.event) ?? []
    existing.push(pb)
    eventMap.set(pb.event, existing)
  }

  // Sort events by WCA order
  const eventOrder = WCA_EVENTS.map((e) => String(e.id))
  const sortedEvents = Array.from(eventMap.keys()).sort(
    (a, b) => eventOrder.indexOf(a) - eventOrder.indexOf(b)
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sortedEvents.map((eventId) => {
        const eventPbs = eventMap.get(eventId)!
        return (
          <Card key={eventId} className="border-border/50 bg-card">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <CubingIcon event={eventId} className="h-5 w-5" />
                <span className="text-sm font-medium text-foreground">
                  {getEventLabel(eventId)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {eventPbs.map((pb) => (
                  <div key={pb.id} className="text-sm">
                    <span className="text-muted-foreground">{pb.pb_type}: </span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatTime(pb.time_seconds, eventId)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function TabPBs({
  profile,
  sessions,
  pbs = [],
  isOwner,
}: {
  profile: Profile
  sessions: Session[]
  pbs?: PBRecord[]
  isOwner: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      {isOwner ? (
        <PBGrid
          sessions={sessions}
          displayName={profile.display_name}
          handle={profile.handle}
        />
      ) : (
        <ReadOnlyPBGrid pbs={pbs} />
      )}
      <PBProgressChart sessions={sessions} />
    </div>
  )
}
