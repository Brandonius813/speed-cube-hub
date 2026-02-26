"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trophy, Upload, Settings, Star } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { getPBTypesForEvent } from "@/lib/constants"
import { getCurrentPBs } from "@/lib/actions/personal-bests"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { LogPBModal } from "@/components/pbs/log-pb-modal"
import { ImportPBsModal } from "@/components/pbs/import-pbs-modal"
import { PBSettingsModal } from "@/components/pbs/pb-settings-modal"
import { PBHistoryModal } from "@/components/pbs/pb-history-modal"
import type { PBRecord } from "@/lib/types"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number, eventId?: string): string {
  if (eventId === "333fm") return Number.isInteger(seconds) ? `${seconds}` : `${seconds.toFixed(2)}`
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
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

export function PBsContent({
  initialPBs,
  initialVisibleTypes,
  initialMainEvents,
}: {
  initialPBs: PBRecord[]
  initialVisibleTypes: string[] | null
  initialMainEvents: string[] | null
}) {
  const [pbs, setPbs] = useState<PBRecord[]>(initialPBs)
  const [visibleTypes, setVisibleTypes] = useState<string[] | null>(
    initialVisibleTypes
  )
  const [mainEvents, setMainEvents] = useState<string[] | null>(
    initialMainEvents
  )
  const [showLogModal, setShowLogModal] = useState(false)
  const [logModalDefaults, setLogModalDefaults] = useState<{
    event?: string
    pbType?: string
  }>({})
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [historyModal, setHistoryModal] = useState<{
    event: string
    pbType: string
  } | null>(null)

  async function reloadPBs() {
    const result = await getCurrentPBs()
    setPbs(result.data)
  }

  function handleAddPB(event?: string, pbType?: string) {
    setLogModalDefaults({ event, pbType })
    setShowLogModal(true)
  }

  /**
   * Get the filtered PB types for an event, respecting the user's visibility settings.
   * If visibleTypes is null, all types for the event are shown (default).
   */
  function getFilteredPBTypes(eventId: string): string[] {
    const allTypes = getPBTypesForEvent(eventId)
    if (!visibleTypes) return allTypes
    return allTypes.filter((t) => visibleTypes.includes(t))
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

  // Split events into main and other
  const allEventsWithPBs = WCA_EVENTS
    .map((e) => e.id)
    .filter((id) => pbsByEvent[id])

  const hasMainEvents = mainEvents && mainEvents.length > 0
  const mainEventIds = hasMainEvents
    ? mainEvents.filter((id) => pbsByEvent[id])
    : []
  const mainEventSet = new Set(mainEvents ?? [])
  const otherEventIds = hasMainEvents
    ? allEventsWithPBs.filter((id) => !mainEventSet.has(id))
    : allEventsWithPBs

  function renderEventCard(eventId: string) {
    const eventPBs = pbsByEvent[eventId]
    const pbTypes = getFilteredPBTypes(eventId)
    if (pbTypes.length === 0) return null

    return (
      <Card key={eventId} className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CubingIcon
                event={eventId}
                className="text-base text-muted-foreground"
              />
              <span className="font-mono text-lg tracking-tight text-foreground">
                {getEventLabel(eventId)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddPB(eventId)}
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {pbTypes.map((type) => {
              const pb = eventPBs[type]
              return (
                <div
                  key={type}
                  className={`flex items-center justify-between rounded px-2 py-1.5 transition ${
                    pb ? "cursor-pointer hover:bg-secondary/80" : ""
                  }`}
                  onClick={
                    pb
                      ? () =>
                          setHistoryModal({
                            event: eventId,
                            pbType: type,
                          })
                      : undefined
                  }
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {type}
                  </span>
                  {pb ? (
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-foreground">
                        {eventId === "333mbf"
                          ? formatMBLD(pb)
                          : formatTime(pb.time_seconds, eventId)}
                      </div>
                      <div className="font-mono text-[10px] uppercase text-muted-foreground/60">
                        {new Date(
                          pb.date_achieved + "T12:00:00"
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddPB(eventId, type)
                      }}
                      className="text-sm text-muted-foreground/40 transition hover:text-foreground"
                    >
                      — (not set)
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
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

      {allEventsWithPBs.length === 0 ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No PBs logged yet. Start by logging your first personal best!
            </p>
          </CardContent>
        </Card>
      ) : hasMainEvents ? (
        <>
          {/* Main Events Section */}
          {mainEventIds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Main Events
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mainEventIds.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* Other Events Section */}
          {otherEventIds.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Other Events
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherEventIds.map(renderEventCard)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allEventsWithPBs.map(renderEventCard)}
        </div>
      )}

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
        currentVisibleTypes={visibleTypes}
        currentMainEvents={mainEvents}
        onSaved={(types, main) => {
          setVisibleTypes(types)
          setMainEvents(main)
        }}
      />

      {historyModal && (
        <PBHistoryModal
          event={historyModal.event}
          pbType={historyModal.pbType}
          open={!!historyModal}
          onOpenChange={(open) => {
            if (!open) setHistoryModal(null)
          }}
          onUpdate={reloadPBs}
        />
      )}
    </div>
  )
}
