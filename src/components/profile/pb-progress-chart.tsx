"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrendingDown } from "lucide-react"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { WCA_EVENTS } from "@/lib/constants"
import { getPBHistoryForEvent } from "@/lib/actions/personal-bests"
import type { PBRecord } from "@/lib/types"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number, eventId?: string): string {
  if (eventId === "333fm")
    return Number.isInteger(seconds) ? `${seconds}` : `${seconds.toFixed(2)}`
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

/** Colors for different PB types */
const PB_TYPE_COLORS: Record<string, string> = {
  Single: "#22D3EE",
  Ao5: "#6366F1",
  Ao12: "#F97316",
  Ao25: "#10B981",
  Ao50: "#EC4899",
  Ao100: "#F59E0B",
  Ao200: "#A855F7",
  Ao1000: "#EF4444",
  Mo3: "#6366F1",
}

function getTypeColor(pbType: string): string {
  return PB_TYPE_COLORS[pbType] ?? "#8B8BA3"
}

function ChartTooltip({
  active,
  payload,
  label,
  eventId,
}: {
  active?: boolean
  payload?: Array<{
    dataKey: string
    value: number | null
    color: string
    name: string
  }>
  label?: string
  eventId?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map(
        (entry) =>
          entry.value !== null && (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name}:{" "}
                <span className="font-mono text-foreground">
                  {formatTime(entry.value, eventId)}
                </span>
              </span>
            </div>
          )
      )}
    </div>
  )
}

export function PBProgressChart({
  pbs,
  userId,
  selectedEvent: externalEvent,
  onEventChange,
}: {
  pbs: PBRecord[]
  userId?: string
  selectedEvent?: string
  onEventChange?: (event: string) => void
}) {
  // Derive available events from current PB records
  const eventsWithPBs = useMemo(() => {
    const eventSet = new Set<string>()
    for (const pb of pbs) {
      eventSet.add(pb.event)
    }
    return Array.from(eventSet).sort((a, b) => {
      const aIdx = WCA_EVENTS.findIndex((e) => e.id === a)
      const bIdx = WCA_EVENTS.findIndex((e) => e.id === b)
      return aIdx - bIdx
    })
  }, [pbs])

  const [internalEvent, setInternalEvent] = useState<string>(
    eventsWithPBs[0] ?? ""
  )

  // Use external event if provided, otherwise internal
  const selectedEvent = externalEvent ?? internalEvent

  // Sync internal state when external event changes
  useEffect(() => {
    if (externalEvent && eventsWithPBs.includes(externalEvent)) {
      setInternalEvent(externalEvent)
    }
  }, [externalEvent, eventsWithPBs])

  function handleEventChange(event: string) {
    setInternalEvent(event)
    onEventChange?.(event)
  }

  // Fetch PB history for the selected event
  const [history, setHistory] = useState<PBRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedEvent) return

    let cancelled = false
    setLoading(true)

    getPBHistoryForEvent(selectedEvent, userId).then((result) => {
      if (!cancelled) {
        setHistory(result.data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedEvent, userId])

  // Group history by pb_type and build chart data
  const { chartData, pbTypes } = useMemo(() => {
    if (history.length === 0) return { chartData: [], pbTypes: [] }

    // Group by pbType
    const byType: Record<string, PBRecord[]> = {}
    for (const pb of history) {
      if (!byType[pb.pb_type]) byType[pb.pb_type] = []
      byType[pb.pb_type].push(pb)
    }

    // Get all unique dates across all types, sorted chronologically
    const allDates = new Set<string>()
    for (const records of Object.values(byType)) {
      for (const pb of records) {
        allDates.add(pb.date_achieved)
      }
    }
    const sortedDates = Array.from(allDates).sort()

    // Build the running-best per type at each date
    const types = Object.keys(byType)

    // For each type, sort records by date and compute running best
    const runningBests: Record<string, Map<string, number>> = {}
    for (const type of types) {
      const records = byType[type].sort(
        (a, b) =>
          new Date(a.date_achieved).getTime() -
          new Date(b.date_achieved).getTime()
      )
      let best: number | null = null
      const bestMap = new Map<string, number>()

      for (const pb of records) {
        if (best === null || pb.time_seconds < best) {
          best = pb.time_seconds
        }
        bestMap.set(pb.date_achieved, best)
      }
      runningBests[type] = bestMap
    }

    // Build chart points — one per date, with the running best per type
    const points: Record<string, unknown>[] = []
    const lastKnown: Record<string, number | null> = {}
    for (const type of types) lastKnown[type] = null

    for (const date of sortedDates) {
      const d = new Date(date + "T12:00:00")
      const point: Record<string, unknown> = {
        displayDate: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }

      for (const type of types) {
        const val = runningBests[type].get(date)
        if (val !== undefined) lastKnown[type] = val
        point[type] = lastKnown[type]
      }

      points.push(point)
    }

    return { chartData: points, pbTypes: types }
  }, [history])

  if (eventsWithPBs.length === 0) return null

  const hasEnoughData = chartData.length >= 2

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingDown className="h-5 w-5 text-primary" />
            PB History
          </CardTitle>
          <Select value={selectedEvent} onValueChange={handleEventChange}>
            <SelectTrigger className="min-h-11 w-full border-border bg-secondary/50 sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              {eventsWithPBs.map((eventId) => (
                <SelectItem key={eventId} value={eventId}>
                  <span className="flex items-center gap-2">
                    <CubingIcon event={eventId} className="text-sm" />
                    {getEventLabel(eventId)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !hasEnoughData ? (
          <p className="text-sm text-muted-foreground">
            Log more PBs for {getEventLabel(selectedEvent)} to see your
            progression.
          </p>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2A2A3C"
                  vertical={false}
                />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: "#8B8BA3", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8B8BA3", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatTime(v, selectedEvent)}
                  domain={["dataMin", "dataMax"]}
                />
                <Tooltip
                  content={<ChartTooltip eventId={selectedEvent} />}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#8B8BA3" }}
                />
                {pbTypes.map((type) => (
                  <Line
                    key={type}
                    type="stepAfter"
                    dataKey={type}
                    name={type}
                    stroke={getTypeColor(type)}
                    strokeWidth={2}
                    dot={{ r: 3, fill: getTypeColor(type) }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
