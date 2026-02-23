"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Session } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"

const EVENT_COLORS: Record<string, string> = {
  "333": "#EF4444",
  "444": "#6366F1",
  "555": "#F97316",
  "222": "#22D3EE",
  minx: "#A855F7",
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-medium text-foreground">{label}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {entry.dataKey}: {entry.value}m
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function DailyBarChart({ sessions }: { sessions: Session[] }) {
  // Group sessions by day and event
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const last7Days: Record<string, Record<string, number>> = {}

  // Build the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split("T")[0]
    last7Days[key] = {}
  }

  // Find top events for chart bars
  const eventTotals: Record<string, number> = {}
  for (const session of sessions) {
    eventTotals[session.event] =
      (eventTotals[session.event] || 0) + session.duration_minutes
  }
  const topEvents = Object.entries(eventTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)

  // Fill in session data
  for (const session of sessions) {
    const dateKey = session.session_date
    if (dateKey in last7Days) {
      const event = topEvents.includes(session.event)
        ? session.event
        : "other"
      last7Days[dateKey][event] =
        (last7Days[dateKey][event] || 0) + session.duration_minutes
    }
  }

  const chartData = Object.entries(last7Days).map(([dateStr, events]) => {
    const date = new Date(dateStr + "T00:00:00")
    return {
      day: dayNames[date.getDay()],
      ...events,
    }
  })

  if (sessions.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Daily Practice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sessions yet. Log your first session to see daily practice chart.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Daily Practice</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A3C"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "#8B8BA3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8B8BA3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}m`}
              />
              <Tooltip content={<CustomTooltip />} />
              {topEvents.map((eventId, i) => (
                <Bar
                  key={eventId}
                  dataKey={eventId}
                  name={getEventLabel(eventId)}
                  stackId="a"
                  fill={EVENT_COLORS[eventId] || "#6366F1"}
                  radius={
                    i === topEvents.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
