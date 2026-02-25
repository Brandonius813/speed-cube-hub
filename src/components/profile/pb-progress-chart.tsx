"use client"

import { useMemo, useState } from "react"
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
import type { Session } from "@/lib/types"

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

type ChartPoint = {
  date: string
  displayDate: string
  runningSingle: number | null
  runningAvg: number | null
}

function CustomTooltip({
  active,
  payload,
  label,
  eventId,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; color: string; name: string }>
  label?: string
  eventId?: string
}) {
  if (active && payload && payload.length) {
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
                  {entry.name}: <span className="font-mono text-foreground">{formatTime(entry.value, eventId)}</span>
                </span>
              </div>
            )
        )}
      </div>
    )
  }
  return null
}

export function PBProgressChart({ sessions }: { sessions: Session[] }) {
  // Find events that have at least one time value (single or avg)
  const eventsWithTimes = useMemo(() => {
    const eventSet = new Set<string>()
    for (const s of sessions) {
      if (s.best_time !== null || s.avg_time !== null) {
        eventSet.add(s.event)
      }
    }
    // Sort by WCA event order
    return Array.from(eventSet).sort((a, b) => {
      const aIdx = WCA_EVENTS.findIndex((e) => e.id === a)
      const bIdx = WCA_EVENTS.findIndex((e) => e.id === b)
      return aIdx - bIdx
    })
  }, [sessions])

  const [selectedEvent, setSelectedEvent] = useState<string>(
    eventsWithTimes[0] ?? ""
  )

  // Compute running PB minimums for the selected event
  const chartData: ChartPoint[] = useMemo(() => {
    if (!selectedEvent) return []

    // Filter sessions for this event that have at least one time, sort chronologically
    const eventSessions = sessions
      .filter(
        (s) =>
          s.event === selectedEvent &&
          (s.best_time !== null || s.avg_time !== null)
      )
      .sort(
        (a, b) =>
          new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      )

    let runningSingle: number | null = null
    let runningAvg: number | null = null
    const points: ChartPoint[] = []

    for (const session of eventSessions) {
      let changed = false

      if (
        session.best_time !== null &&
        (runningSingle === null || session.best_time < runningSingle)
      ) {
        runningSingle = session.best_time
        changed = true
      }

      if (
        session.avg_time !== null &&
        (runningAvg === null || session.avg_time < runningAvg)
      ) {
        runningAvg = session.avg_time
        changed = true
      }

      // Only add a point when a PB was broken (or for the first session)
      if (changed) {
        const d = new Date(session.session_date + "T00:00:00")
        points.push({
          date: session.session_date,
          displayDate: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          runningSingle,
          runningAvg,
        })
      }
    }

    return points
  }, [sessions, selectedEvent])

  // Don't render at all if there are no events with times
  if (eventsWithTimes.length === 0) return null

  const hasSingles = chartData.some((p) => p.runningSingle !== null)
  const hasAvgs = chartData.some((p) => p.runningAvg !== null)

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingDown className="h-5 w-5 text-primary" />
            PB Progress
          </CardTitle>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="min-h-11 w-full border-border bg-secondary/50 sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              {eventsWithTimes.map((eventId) => (
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
        {chartData.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Log more sessions with times for {getEventLabel(selectedEvent)} to see your PB progression.
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
                <Tooltip content={<CustomTooltip eventId={selectedEvent} />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#8B8BA3" }}
                />
                {hasSingles && (
                  <Line
                    type="stepAfter"
                    dataKey="runningSingle"
                    name="Best Single"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#22D3EE" }}
                    connectNulls
                  />
                )}
                {hasAvgs && (
                  <Line
                    type="stepAfter"
                    dataKey="runningAvg"
                    name="Best Avg"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#6366F1" }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
