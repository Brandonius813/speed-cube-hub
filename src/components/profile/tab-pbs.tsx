"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trophy, Upload, Settings, Star } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { getCurrentPBs } from "@/lib/actions/personal-bests"
import { updatePBDisplayTypes } from "@/lib/actions/profiles"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { LogPBModal } from "@/components/pbs/log-pb-modal"
import { ImportPBsModal } from "@/components/pbs/import-pbs-modal"
import { PBSettingsModal } from "@/components/pbs/pb-settings-modal"
import {
  EventDetailModal,
  getDefaultDisplayTypes,
} from "@/components/profile/event-detail-modal"
import type { Profile, PBRecord } from "@/lib/types"
import { formatEventTime } from "@/lib/utils"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number, eventId?: string): string {
  return formatEventTime(seconds, eventId)
}

function formatMBLD(pb: PBRecord): string {
  if (pb.mbld_solved && pb.mbld_attempted) {
    return `${pb.mbld_solved}/${pb.mbld_attempted} in ${formatTime(pb.time_seconds)}`
  }
  return formatTime(pb.time_seconds)
}

function isBetterMBLD(a: PBRecord, b: PBRecord): boolean {
  const pointsA = 2 * (a.mbld_solved || 0) - (a.mbld_attempted || 0)
  const pointsB = 2 * (b.mbld_solved || 0) - (b.mbld_attempted || 0)
  if (pointsA !== pointsB) return pointsA > pointsB
  return a.time_seconds < b.time_seconds
}

export function TabPBs({
  profile,
  pbs: initialPBs = [],
  isOwner,
  onMainEventsChange,
}: {
  profile: Profile
  sessions?: unknown[]
  pbs?: PBRecord[]
  isOwner: boolean
  onMainEventsChange?: (mainEvents: string[]) => void
}) {
  const [pbs, setPbs] = useState<PBRecord[]>(initialPBs)
  const [mainEvents, setMainEvents] = useState<string[] | null>(
    profile.pbs_main_events
  )

  // Per-event display type overrides (persisted to profile.pb_display_types)
  const [displayTypeOverrides, setDisplayTypeOverrides] = useState<
    Record<string, string[]>
  >(profile.pb_display_types ?? {})

  // Modals
  const [showLogModal, setShowLogModal] = useState(false)
  const [logModalDefaults, setLogModalDefaults] = useState<{
    event?: string
    pbType?: string
  }>({})
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Event detail modal
  const [detailEvent, setDetailEvent] = useState<string | null>(null)


  async function reloadPBs() {
    const result = await getCurrentPBs()
    setPbs(result.data)
  }

  function handleAddPB(event?: string, pbType?: string) {
    setLogModalDefaults({ event, pbType })
    setShowLogModal(true)
  }

  function getDisplayTypesForEvent(eventId: string): string[] {
    return displayTypeOverrides[eventId] ?? getDefaultDisplayTypes(eventId)
  }

  function handleDisplayTypesChange(eventId: string, types: string[]) {
    setDisplayTypeOverrides((prev) => {
      const next = { ...prev, [eventId]: types }
      // Save to database (fire-and-forget — optimistic update)
      if (isOwner) {
        updatePBDisplayTypes(next)
      }
      return next
    })
  }

  // Group PBs by event — keep only the best per event+type
  const pbsByEvent: Record<string, Record<string, PBRecord>> = {}
  for (const pb of pbs) {
    if (!pbsByEvent[pb.event]) pbsByEvent[pb.event] = {}
    const existing = pbsByEvent[pb.event][pb.pb_type]
    if (!existing) {
      pbsByEvent[pb.event][pb.pb_type] = pb
    } else if (pb.event === "333mbf") {
      if (isBetterMBLD(pb, existing)) pbsByEvent[pb.event][pb.pb_type] = pb
    } else if (pb.time_seconds < existing.time_seconds) {
      pbsByEvent[pb.event][pb.pb_type] = pb
    }
  }

  const allEventsWithPBs = WCA_EVENTS
    .map((e) => e.id)
    .filter((id) => pbsByEvent[id])

  const savedOrder = mainEvents ?? []
  const mainEventIds = savedOrder.slice(0, 3).filter((id) => pbsByEvent[id])
  const orderedOtherIds = savedOrder.slice(3).filter((id) => pbsByEvent[id])
  const savedSet = new Set(savedOrder)
  const unorderedIds = allEventsWithPBs.filter((id) => !savedSet.has(id))

  const hasMainEvents = mainEventIds.length > 0
  const otherEventIds = [...orderedOtherIds, ...unorderedIds]

  /** Compact event card — shows icon, name, and 1-2 display PB types */
  function renderCompactCard(eventId: string) {
    const eventPBs = pbsByEvent[eventId]
    const displayTypes = getDisplayTypesForEvent(eventId)

    return (
      <div
        key={eventId}
        className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-4 cursor-pointer transition hover:bg-secondary/80"
        onClick={() => setDetailEvent(eventId)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <CubingIcon
            event={eventId}
            className="shrink-0 text-base text-muted-foreground"
          />
          <span className="truncate font-medium text-foreground">
            {getEventLabel(eventId)}
          </span>
        </div>
        <div className="flex gap-4 text-right shrink-0">
          {displayTypes.map((type) => {
            const pb = eventPBs[type]
            if (!pb) return null
            return (
              <div key={type}>
                <p className="text-xs text-muted-foreground">{type}</p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {eventId === "333mbf"
                    ? formatMBLD(pb)
                    : formatTime(pb.time_seconds, eventId)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Build the grid content
  const gridContent =
    allEventsWithPBs.length === 0 ? (
      <Card className="border-border/50 bg-card">
        <CardContent className="py-12 text-center">
          <Trophy className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            No PBs logged yet.{" "}
            {isOwner && "Start by logging your first personal best!"}
          </p>
        </CardContent>
      </Card>
    ) : hasMainEvents ? (
      <>
        {mainEventIds.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Main Events
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {mainEventIds.map(renderCompactCard)}
            </div>
          </div>
        )}

        {otherEventIds.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Other Events
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {otherEventIds.map(renderCompactCard)}
            </div>
          </div>
        )}
      </>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        {allEventsWithPBs.map(renderCompactCard)}
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {/* Action buttons — owner only */}
      {isOwner && (
        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
          <Button
            onClick={() => handleAddPB()}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Log New PB
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettingsModal(true)}
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
            title="Customize PB settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Compact PB grid */}
      {gridContent}

      {/* Event Detail Modal */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          open={!!detailEvent}
          onOpenChange={(open) => {
            if (!open) setDetailEvent(null)
          }}
          pbsByType={pbsByEvent[detailEvent] ?? {}}
          isOwner={isOwner}
          displayTypes={getDisplayTypesForEvent(detailEvent)}
          onDisplayTypesChange={handleDisplayTypesChange}
          onAddPB={handleAddPB}
          onUpdate={reloadPBs}
          userId={profile.id}
        />
      )}

      {/* Modals */}
      <LogPBModal
        open={showLogModal}
        onOpenChange={setShowLogModal}
        defaultEvent={logModalDefaults.event}
        defaultPBType={logModalDefaults.pbType}
        onSaved={() => {
          setShowLogModal(false)
          reloadPBs()
        }}
      />

      <ImportPBsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSaved={() => {
          setShowImportModal(false)
          reloadPBs()
        }}
      />

      <PBSettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        currentVisibleTypes={profile.pb_visible_types}
        currentMainEvents={mainEvents}
        onSaved={(types, main) => {
          setMainEvents(main)
          const mainEventsOnly = (main ?? []).slice(0, 3)
          onMainEventsChange?.(mainEventsOnly)
        }}
      />
    </div>
  )
}
