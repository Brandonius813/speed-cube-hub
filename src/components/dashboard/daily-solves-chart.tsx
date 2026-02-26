"use client"

import { useMemo, useState } from "react"
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

type GroupMode = "daily" | "weekly" | "monthly"
type WeekStart = 0 | 1 // 0 = Sunday, 1 = Monday

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0)
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
            {getEventLabel(entry.dataKey) || entry.dataKey}: {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <p className="mt-1 border-t border-border/50 pt-1 font-medium text-foreground">
          Total: {total.toLocaleString()}
        </p>
      )}
    </div>
  )
}

function getGroupSortKey(dateStr: string, mode: GroupMode, weekStart: WeekStart): number {
  const date = new Date(dateStr + "T00:00:00")
  if (mode === "daily") return date.getTime()
  if (mode === "weekly") {
    const start = new Date(date)
    const day = start.getDay()
    const diff = weekStart === 1
      ? (day === 0 ? -6 : 1 - day) // Monday start
      : -day // Sunday start
    start.setDate(start.getDate() + diff)
    return start.getTime()
  }
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

function getGroupKey(dateStr: string, mode: GroupMode, weekStart: WeekStart): string {
  const date = new Date(dateStr + "T00:00:00")
  if (mode === "daily") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return `${date.getMonth() + 1}/${date.getDate()} ${dayNames[date.getDay()]}`
  }
  if (mode === "weekly") {
    const start = new Date(date)
    const day = start.getDay()
    const diff = weekStart === 1 ? (day === 0 ? -6 : 1 - day) : -day
    start.setDate(start.getDate() + diff)
    return `${start.getMonth() + 1}/${start.getDate()}`
  }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`
}

function autoGroupMode(sessions: Session[]): GroupMode {
  if (sessions.length === 0) return "daily"
  const dates = sessions.map((s) => new Date(s.session_date + "T00:00:00").getTime())
  const span = Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)) + 1
  if (span <= 31) return "daily"
  if (span <= 90) return "weekly"
  return "monthly"
}

export function DailySolvesChart({ sessions }: { sessions: Session[] }) {
  const [weekStart, setWeekStart] = useState<WeekStart>(1) // Monday default
  const [groupOverride, setGroupOverride] = useState<GroupMode | "auto">("auto")

  const { chartData, topEvents, title, mode } = useMemo(() => {
    if (sessions.length === 0) {
      return { chartData: [], topEvents: [], title: "Solves Over Time", mode: "daily" as GroupMode }
    }

    const mode = groupOverride === "auto" ? autoGroupMode(sessions) : groupOverride
    const titleMap: Record<GroupMode, string> = {
      daily: "Daily Solves",
      weekly: "Weekly Solves",
      monthly: "Monthly Solves",
    }

    // Top 3 events by solve count
    const eventTotals: Record<string, number> = {}
    for (const s of sessions) {
      eventTotals[s.event] = (eventTotals[s.event] || 0) + (s.num_solves ?? 0)
    }
    const top = Object.entries(eventTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)

    // Group by time period
    const groups: Record<string, Record<string, number>> = {}
    const sortKeys: Record<string, number> = {}

    for (const s of sessions) {
      const key = getGroupKey(s.session_date, mode, weekStart)
      if (!groups[key]) {
        groups[key] = {}
        sortKeys[key] = getGroupSortKey(s.session_date, mode, weekStart)
      }
      const ev = top.includes(s.event) ? s.event : "other"
      groups[key][ev] = (groups[key][ev] || 0) + (s.num_solves ?? 0)
    }

    const sorted = Object.keys(groups).sort((a, b) => sortKeys[a] - sortKeys[b])
    const data = sorted.map((key) => ({ label: key, ...groups[key] }))

    return { chartData: data, topEvents: top, title: titleMap[mode], mode }
  }, [sessions, weekStart, groupOverride])

  // Summary stats
  const summary = useMemo(() => {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const monthAgo = new Date(now.getTime() - 30 * 86400000)

    let today = 0, week = 0, month = 0, total = 0
    for (const s of sessions) {
      const count = s.num_solves ?? 0
      total += count
      if (s.session_date === todayStr) today += count
      if (new Date(s.session_date + "T00:00:00") >= weekAgo) week += count
      if (new Date(s.session_date + "T00:00:00") >= monthAgo) month += count
    }
    return { today, week, month, total }
  }, [sessions])

  if (sessions.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Solves Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sessions yet. Log your first session to see solve count chart.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-foreground">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {/* Group mode selector */}
            <div className="flex rounded-md border border-border overflow-hidden text-[10px]">
              {(["auto", "daily", "weekly", "monthly"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupOverride(g)}
                  className={`px-2 py-1 capitalize transition-colors ${
                    groupOverride === g
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            {/* Week start toggle — only visible for weekly */}
            {mode === "weekly" && (
              <button
                onClick={() => setWeekStart((p) => (p === 0 ? 1 : 0))}
                className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-secondary/50 transition-colors"
                title={`Week starts on ${weekStart === 0 ? "Sunday" : "Monday"}`}
              >
                {weekStart === 0 ? "Sun" : "Mon"} start
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats row */}
        <div className="flex gap-4 mb-3 text-xs">
          <div>
            <span className="text-muted-foreground">Today</span>
            <span className="ml-1.5 font-mono font-medium text-foreground">{summary.today.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">7d</span>
            <span className="ml-1.5 font-mono font-medium text-foreground">{summary.week.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">30d</span>
            <span className="ml-1.5 font-mono font-medium text-foreground">{summary.month.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">All</span>
            <span className="ml-1.5 font-mono font-medium text-foreground">{summary.total.toLocaleString()}</span>
          </div>
        </div>

        {/* Chart */}
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
                allowDecimals={false}
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
