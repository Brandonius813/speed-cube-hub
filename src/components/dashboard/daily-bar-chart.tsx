"use client"

import { useMemo } from "react"
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
import { EVENT_COLORS, getEventLabel } from "@/lib/constants"
import { formatDuration } from "@/lib/utils"

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
              {getEventLabel(entry.dataKey) || entry.dataKey}: {formatDuration(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

type GroupMode = "daily" | "weekly" | "monthly"

function getGroupMode(sessions: Session[]): GroupMode {
  if (sessions.length === 0) return "daily"
  const dates = sessions.map((s) => new Date(s.session_date + "T00:00:00").getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const daySpan = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1
  if (daySpan <= 14) return "daily"
  if (daySpan <= 90) return "weekly"
  return "monthly"
}

function getGroupKey(dateStr: string, mode: GroupMode): string {
  const date = new Date(dateStr + "T00:00:00")
  if (mode === "daily") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return `${date.getMonth() + 1}/${date.getDate()} ${dayNames[date.getDay()]}`
  }
  if (mode === "weekly") {
    // Start of week (Sunday)
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay())
    return `${start.getMonth() + 1}/${start.getDate()}`
  }
  // Monthly
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`
}

export function DailyBarChart({ sessions }: { sessions: Session[] }) {
  const { chartData, topEvents, title } = useMemo(() => {
    if (sessions.length === 0) return { chartData: [], topEvents: [], title: "Practice Over Time" }

    const mode = getGroupMode(sessions)
    const titleMap: Record<GroupMode, string> = {
      daily: "Daily Practice",
      weekly: "Weekly Practice",
      monthly: "Monthly Practice",
    }

    // Find top 3 events
    const eventTotals: Record<string, number> = {}
    for (const s of sessions) {
      eventTotals[s.event] = (eventTotals[s.event] || 0) + s.duration_minutes
    }
    const top = Object.entries(eventTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)

    // Group by time period
    const groups: Record<string, Record<string, number>> = {}
    const groupOrder: string[] = []

    for (const s of sessions) {
      const key = getGroupKey(s.session_date, mode)
      if (!groups[key]) {
        groups[key] = {}
        groupOrder.push(key)
      }
      const event = top.includes(s.event) ? s.event : "other"
      groups[key][event] = (groups[key][event] || 0) + s.duration_minutes
    }

    // De-dupe order (in case sessions aren't sorted)
    const seen = new Set<string>()
    const uniqueOrder = groupOrder.filter((k) => {
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    const data = uniqueOrder.map((key) => ({
      label: key,
      ...groups[key],
    }))

    return { chartData: data, topEvents: top, title: titleMap[mode] }
  }, [sessions])

  if (sessions.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Practice Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sessions yet. Log your first session to see practice chart.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
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
                dataKey="label"
                tick={{ fill: "#8B8BA3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8B8BA3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatDuration(v)}
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
