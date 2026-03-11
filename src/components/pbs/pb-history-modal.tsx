"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Pencil, Trash2 } from "lucide-react"
import { EditPBModal } from "@/components/pbs/edit-pb-modal"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { WCA_EVENTS } from "@/lib/constants"
import { getPBHistory, deletePB } from "@/lib/actions/personal-bests"
import type { PBRecord } from "@/lib/types"
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

/** MBLD points = solved - unsolved = 2*solved - attempted */
function mbldPoints(pb: PBRecord): number {
  return 2 * (pb.mbld_solved || 0) - (pb.mbld_attempted || 0)
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

  // For MBLD, find the matching record to show the full score
  let displayValue: string
  if (isMBLD && history) {
    const matchingPB = history.find(
      (pb) => new Date(pb.date_achieved + "T12:00:00").getTime() === label
    )
    displayValue = matchingPB ? formatMBLD(matchingPB) : `${payload[0].value} pts`
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

export function PBHistoryModal({
  event,
  pbType,
  open,
  onOpenChange,
  onUpdate,
}: {
  event: string
  pbType: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}) {
  const [history, setHistory] = useState<PBRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingPB, setEditingPB] = useState<PBRecord | null>(null)

  const isMBLD = event === "333mbf"

  async function loadHistory() {
    setLoading(true)
    const result = await getPBHistory(event, pbType)
    setHistory(result.data)
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      loadHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event, pbType])

  async function handleDelete(pbId: string) {
    if (!confirm("Delete this PB record?")) return

    setDeleting(pbId)
    const result = await deletePB(pbId)
    if (result.success) {
      await loadHistory()
      onUpdate()
    }
    setDeleting(null)
  }

  // Chart data — history is newest-first, reverse for chronological
  // For MBLD: chart "points" (higher = better). For others: chart time (lower = better).
  const chartData = [...history]
    .reverse()
    .map((pb) => ({
      timestamp: new Date(pb.date_achieved + "T12:00:00").getTime(),
      time: isMBLD ? mbldPoints(pb) : pb.time_seconds,
    }))

  const showChart = chartData.length >= 2

  // Adaptive Y-axis with 15% padding
  const yDomain = (() => {
    if (!showChart) return [0, 1]
    const values = chartData.map((d) => d.time)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const padding = range > 0 ? range * 0.15 : Math.max(1, Math.abs(min * 0.1))
    return [Math.max(0, min - padding), max + padding]
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {getEventLabel(event)} — {pbType} History
          </DialogTitle>
          <DialogDescription>
            All recorded PBs for this event and type.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading...</p>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No PB records found.
          </p>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Progression chart */}
            {showChart && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {isMBLD ? "Score Progression" : "Progression"}
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fontSize: 11, fill: "#8B8BA3" }}
                      stroke="#2A2A3C"
                      tickFormatter={(ts: number) =>
                        new Date(ts).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "2-digit",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#8B8BA3" }}
                      stroke="#2A2A3C"
                      tickFormatter={(v: number) =>
                        isMBLD ? `${v} pts` : formatTime(v, event)
                      }
                      width={65}
                      domain={yDomain}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          pbType={pbType}
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
                      dot={{ fill: "#22D3EE", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* History list */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {history.map((pb) => (
                <div
                  key={pb.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    pb.is_current
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-border/50 bg-secondary/30"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-lg font-bold ${
                          pb.is_current
                            ? "text-green-400"
                            : "text-foreground"
                        }`}
                      >
                        {isMBLD ? formatMBLD(pb) : formatTime(pb.time_seconds, event)}
                      </span>
                      {pb.is_current && (
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                          Current PB
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
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
                  <div className="ml-2 flex items-center">
                    <button
                      onClick={() => setEditingPB(pb)}
                      className="min-h-11 min-w-11 flex items-center justify-center rounded-md text-muted-foreground/60 transition hover:text-foreground"
                      title="Edit this PB"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pb.id)}
                      disabled={deleting === pb.id}
                      className="min-h-11 min-w-11 flex items-center justify-center rounded-md text-destructive/60 transition hover:text-destructive disabled:opacity-50"
                      title="Delete this PB"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>

      {editingPB && (
        <EditPBModal
          pb={editingPB}
          open={!!editingPB}
          onOpenChange={(open) => {
            if (!open) setEditingPB(null)
          }}
          onSaved={() => {
            setEditingPB(null)
            loadHistory()
            onUpdate()
          }}
        />
      )}
    </Dialog>
  )
}
