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
import { Trash2 } from "lucide-react"
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

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number, eventId?: string): string {
  if (eventId === "333fm") return `${Math.round(seconds)}`
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

function ChartTooltip({
  active,
  payload,
  label,
  pbType,
  eventId,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: number
  pbType: string
  eventId: string
}) {
  if (!active || !payload?.length) return null

  const date = new Date(label!).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{date}</p>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-cyan-400" />
        <span className="text-muted-foreground">
          {pbType}:{" "}
          <span className="font-mono text-foreground">
            {formatTime(payload[0].value, eventId)}
          </span>
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
  const chartData = [...history]
    .reverse()
    .map((pb) => ({
      timestamp: new Date(pb.date_achieved + "T12:00:00").getTime(),
      time: pb.time_seconds,
    }))

  const showChart = chartData.length >= 2

  // Adaptive Y-axis with 15% padding
  const yDomain = (() => {
    if (!showChart) return [0, 1]
    const times = chartData.map((d) => d.time)
    const min = Math.min(...times)
    const max = Math.max(...times)
    const range = max - min
    const padding = range > 0 ? range * 0.15 : min * 0.1
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
                  Progression
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
                      tickFormatter={(v: number) => formatTime(v, event)}
                      width={65}
                      domain={yDomain}
                    />
                    <Tooltip
                      content={<ChartTooltip pbType={pbType} eventId={event} />}
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
                        {formatTime(pb.time_seconds, event)}
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
                  <button
                    onClick={() => handleDelete(pb.id)}
                    disabled={deleting === pb.id}
                    className="ml-2 min-h-11 min-w-11 flex items-center justify-center rounded-md text-destructive/60 transition hover:text-destructive disabled:opacity-50"
                    title="Delete this PB"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
