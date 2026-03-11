"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Plus, Eye, EyeOff, Pencil, Trash2 } from "lucide-react"
import { WCA_EVENTS, getPBTypesForEvent } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { getPBHistoryForEvent } from "@/lib/actions/personal-bests"
import { deletePB } from "@/lib/actions/personal-bests"
import { EditPBModal } from "@/components/pbs/edit-pb-modal"
import type { PBRecord } from "@/lib/types"
import { formatEventTime } from "@/lib/utils"

const MAX_DISPLAY_TYPES = 3

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

function mbldPoints(pb: PBRecord): number {
  return 2 * (pb.mbld_solved || 0) - (pb.mbld_attempted || 0)
}

/** Default PB types shown on the compact grid per event */
export function getDefaultDisplayTypes(eventId: string): string[] {
  if (["333bf", "444bf", "555bf", "333fm"].includes(eventId)) {
    return ["Single", "Mo3"]
  }
  if (eventId === "333mbf") return ["Single"]
  if (["666", "777"].includes(eventId)) return ["Single", "Mo3"]
  return ["Single", "Ao5"]
}

function ChartTooltip({
  active,
  payload,
  label,
  pbType,
  eventId,
  isMBLD,
  history,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: number
  pbType: string
  eventId: string
  isMBLD?: boolean
  history?: PBRecord[]
}) {
  if (!active || !payload?.length) return null

  const date = new Date(label!).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  let displayValue: string
  if (isMBLD && history) {
    const matchingPB = history.find(
      (pb) => new Date(pb.date_achieved + "T12:00:00").getTime() === label
    )
    displayValue = matchingPB
      ? formatMBLD(matchingPB)
      : `${payload[0].value} pts`
  } else {
    displayValue = formatTime(payload[0].value, eventId)
  }

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{date}</p>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-cyan-400" />
        <span className="text-muted-foreground">
          {pbType}:{" "}
          <span className="font-mono text-foreground">{displayValue}</span>
        </span>
      </div>
    </div>
  )
}

export function EventDetailModal({
  event,
  open,
  onOpenChange,
  pbsByType,
  isOwner,
  displayTypes,
  onDisplayTypesChange,
  onAddPB,
  onUpdate,
  userId,
}: {
  event: string
  open: boolean
  onOpenChange: (open: boolean) => void
  pbsByType: Record<string, PBRecord>
  isOwner: boolean
  displayTypes: string[]
  onDisplayTypesChange?: (eventId: string, types: string[]) => void
  onAddPB?: (event: string, pbType?: string) => void
  onUpdate?: () => void
  userId?: string
}) {
  const allTypes = getPBTypesForEvent(event)
  const [localDisplayTypes, setLocalDisplayTypes] = useState<Set<string>>(
    () => new Set(displayTypes)
  )

  // History state
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [history, setHistory] = useState<PBRecord[]>([])
  const [allEventHistory, setAllEventHistory] = useState<PBRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingPB, setEditingPB] = useState<PBRecord | null>(null)

  const isMBLD = event === "333mbf"
  const atMaxDisplayTypes = localDisplayTypes.size >= MAX_DISPLAY_TYPES

  // Load all history for this event when modal opens
  useEffect(() => {
    if (!open) {
      setSelectedType(null)
      setHistoryLoaded(false)
      return
    }

    let cancelled = false
    setLoadingHistory(true)

    getPBHistoryForEvent(event, userId).then((result) => {
      if (!cancelled) {
        setAllEventHistory(result.data)
        setHistoryLoaded(true)
        setLoadingHistory(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, event, userId])

  // Filter history when selected type changes
  useEffect(() => {
    if (!selectedType || !historyLoaded) {
      setHistory([])
      return
    }
    const filtered = allEventHistory
      .filter((pb) => pb.pb_type === selectedType)
      .sort(
        (a, b) =>
          new Date(b.date_achieved).getTime() -
          new Date(a.date_achieved).getTime()
      )
    setHistory(filtered)
  }, [selectedType, allEventHistory, historyLoaded])

  function toggleDisplayType(type: string) {
    setLocalDisplayTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size <= 1) return prev
        next.delete(type)
      } else {
        if (next.size >= MAX_DISPLAY_TYPES) return prev
        next.add(type)
      }
      const arr = allTypes.filter((t) => next.has(t))
      onDisplayTypesChange?.(event, arr)
      return next
    })
  }

  async function handleDelete(pbId: string) {
    if (!confirm("Delete this PB record?")) return

    setDeleting(pbId)
    const result = await deletePB(pbId)
    if (result.success) {
      // Reload history
      const updated = await getPBHistoryForEvent(event, userId)
      setAllEventHistory(updated.data)
      onUpdate?.()
    }
    setDeleting(null)
  }

  // Chart data for selected type
  const chartData = [...history]
    .reverse()
    .map((pb) => ({
      timestamp: new Date(pb.date_achieved + "T12:00:00").getTime(),
      time: isMBLD ? mbldPoints(pb) : pb.time_seconds,
    }))

  const showChart = chartData.length >= 2

  const yDomain = (() => {
    if (!showChart) return [0, 1]
    const values = chartData.map((d) => d.time)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const padding =
      range > 0 ? range * 0.15 : Math.max(1, Math.abs(min * 0.1))
    return [Math.max(0, min - padding), max + padding]
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CubingIcon event={event} className="text-base" />
            {getEventLabel(event)}
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Tap a time to view history. Toggle the eye to show/hide on your card."
              : "Tap a time to view progression history."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Max display types notice */}
          {isOwner && atMaxDisplayTypes && (
            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2 text-center">
              Maximum of {MAX_DISPLAY_TYPES} stats visible on card. Hide one to show another.
            </p>
          )}

          {/* PB type list */}
          <div className="space-y-1">
            {allTypes.map((type) => {
              const pb = pbsByType[type]
              const isDisplayed = localDisplayTypes.has(type)
              const isSelected = selectedType === type

              return (
                <div
                  key={type}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 transition ${
                    pb ? "cursor-pointer hover:bg-secondary/80" : ""
                  } ${isSelected ? "bg-secondary/80 ring-1 ring-primary/50" : ""}`}
                  onClick={
                    pb
                      ? () =>
                          setSelectedType(
                            isSelected ? null : type
                          )
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleDisplayType(type)
                        }}
                        className={`shrink-0 transition ${
                          isDisplayed
                            ? "text-primary"
                            : atMaxDisplayTypes
                              ? "text-muted-foreground/20 cursor-not-allowed"
                              : "text-muted-foreground/30 hover:text-muted-foreground/60"
                        }`}
                        title={
                          isDisplayed
                            ? "Shown on card — click to hide"
                            : atMaxDisplayTypes
                              ? "Max 3 stats shown — hide one first"
                              : "Hidden — click to show on card"
                        }
                        disabled={!isDisplayed && atMaxDisplayTypes}
                      >
                        {isDisplayed ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <span className="text-sm font-medium text-muted-foreground">
                      {type}
                    </span>
                  </div>

                  {pb ? (
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-semibold text-foreground">
                        {event === "333mbf"
                          ? formatMBLD(pb)
                          : formatTime(pb.time_seconds, event)}
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
                  ) : isOwner ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddPB?.(event, type)
                      }}
                      className="text-sm text-muted-foreground/40 transition hover:text-foreground shrink-0"
                    >
                      — add
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground/30 shrink-0">
                      —
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* History section — shown when a PB type is selected */}
          {selectedType && (
            <div className="space-y-3 border-t border-border/50 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedType} History
              </h3>

              {loadingHistory ? (
                <p className="text-sm text-muted-foreground animate-pulse py-4 text-center">
                  Loading...
                </p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No history records found.
                </p>
              ) : (
                <>
                  {/* Progression chart */}
                  {showChart && (
                    <div className="h-[180px] rounded-lg bg-secondary/30 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#2A2A3C"
                          />
                          <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={["dataMin", "dataMax"]}
                            tick={{ fontSize: 10, fill: "#8B8BA3" }}
                            stroke="#2A2A3C"
                            tickFormatter={(ts: number) =>
                              new Date(ts).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#8B8BA3" }}
                            stroke="#2A2A3C"
                            tickFormatter={(v: number) =>
                              isMBLD ? `${v}` : formatTime(v, event)
                            }
                            width={55}
                            domain={yDomain}
                          />
                          <Tooltip
                            content={
                              <ChartTooltip
                                pbType={selectedType}
                                eventId={event}
                                isMBLD={isMBLD}
                                history={history}
                              />
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="time"
                            stroke="#22D3EE"
                            strokeWidth={2}
                            dot={{ fill: "#22D3EE", r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* History list */}
                  <div className="space-y-1.5">
                    {history.map((pb) => (
                      <div
                        key={pb.id}
                        className={`flex items-center justify-between rounded-md px-3 py-2 ${
                          pb.is_current
                            ? "border border-green-500/30 bg-green-500/10"
                            : "bg-secondary/30"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-sm font-bold ${
                                pb.is_current
                                  ? "text-green-400"
                                  : "text-foreground"
                              }`}
                            >
                              {isMBLD
                                ? formatMBLD(pb)
                                : formatTime(pb.time_seconds, event)}
                            </span>
                            {pb.is_current && (
                              <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-green-400">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              pb.date_achieved + "T12:00:00"
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {pb.notes && ` — ${pb.notes}`}
                          </p>
                        </div>
                        {isOwner && (
                          <div className="ml-2 flex items-center">
                            <button
                              onClick={() => setEditingPB(pb)}
                              className="min-h-11 min-w-11 flex items-center justify-center rounded-md text-muted-foreground/60 transition hover:text-foreground"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(pb.id)}
                              disabled={deleting === pb.id}
                              className="min-h-11 min-w-11 flex items-center justify-center rounded-md text-destructive/60 transition hover:text-destructive disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {isOwner && (
          <div className="pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 min-h-11"
              onClick={() => onAddPB?.(event)}
            >
              <Plus className="h-4 w-4" />
              Add PB
            </Button>
          </div>
        )}
      </DialogContent>

      {editingPB && (
        <EditPBModal
          pb={editingPB}
          open={!!editingPB}
          onOpenChange={(o) => {
            if (!o) setEditingPB(null)
          }}
          onSaved={async () => {
            setEditingPB(null)
            const updated = await getPBHistoryForEvent(event, userId)
            setAllEventHistory(updated.data)
            onUpdate?.()
          }}
        />
      )}
    </Dialog>
  )
}
