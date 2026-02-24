"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trophy, Upload } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { getPBTypesForEvent } from "@/lib/constants"
import { getCurrentPBs } from "@/lib/actions/personal-bests"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { LogPBModal } from "@/components/pbs/log-pb-modal"
import { ImportPBsModal } from "@/components/pbs/import-pbs-modal"
import { PBHistoryModal } from "@/components/pbs/pb-history-modal"
import type { PBRecord } from "@/lib/types"

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

export function PBsContent({ initialPBs }: { initialPBs: PBRecord[] }) {
  const [pbs, setPbs] = useState<PBRecord[]>(initialPBs)
  const [showLogModal, setShowLogModal] = useState(false)
  const [logModalDefaults, setLogModalDefaults] = useState<{
    event?: string
    pbType?: string
  }>({})
  const [showImportModal, setShowImportModal] = useState(false)
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

  // Group PBs by event
  const pbsByEvent: Record<string, Record<string, PBRecord>> = {}
  for (const pb of pbs) {
    if (!pbsByEvent[pb.event]) pbsByEvent[pb.event] = {}
    pbsByEvent[pb.event][pb.pb_type] = pb
  }

  // Sort events by WCA order
  const eventsWithPBs = WCA_EVENTS
    .map((e) => e.id)
    .filter((id) => pbsByEvent[id])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center sm:justify-start gap-2">
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
      </div>

      {eventsWithPBs.length === 0 ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No PBs logged yet. Start by logging your first personal best!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventsWithPBs.map((eventId) => {
            const eventPBs = pbsByEvent[eventId]
            const pbTypes = getPBTypesForEvent(eventId)

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
                            pb
                              ? "cursor-pointer hover:bg-secondary/80"
                              : ""
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
                                {formatTime(pb.time_seconds)}
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
          })}
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
