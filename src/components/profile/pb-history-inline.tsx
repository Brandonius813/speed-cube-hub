"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, History } from "lucide-react"
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
import { getPBHistory } from "@/lib/actions/personal-bests"
import { deletePB } from "@/lib/actions/personal-bests"
import { CubingIcon } from "@/components/shared/cubing-icon"
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

/**
 * Inline PB history section — shows a progression chart and a list of
 * all recorded PBs for a given event + type. Rendered directly on the page
 * (not in a modal).
 */
export function PBHistoryInline({
  event,
  pbType,
  isOwner,
  onUpdate,
}: {
  event: string
  pbType: string
  isOwner: boolean
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
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, pbType])

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

  // Chart data
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

  if (loading) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading history...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No PB records found for {getEventLabel(event)} {pbType}.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CubingIcon event={event} className="text-sm" />
          {getEventLabel(event)} — {pbType} History
        </h3>
      </div>

      {/* Progression chart */}
      {showChart && (
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isMBLD ? "Score Progression" : "Progression"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
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
          </CardContent>
        </Card>
      )}

      {/* History list */}
      <div className="space-y-2">
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
                    pb.is_current ? "text-green-400" : "text-foreground"
                  }`}
                >
                  {isMBLD
                    ? formatMBLD(pb)
                    : formatTime(pb.time_seconds, event)}
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
            {isOwner && (
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
            )}
          </div>
        ))}
      </div>

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
    </div>
  )
}
