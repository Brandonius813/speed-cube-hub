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
import {
  buildSessionChartData,
  getAutoSessionChartGroupMode,
  type SessionChartGroupMode,
  type SessionChartRow,
  type SessionChartWeekStart,
} from "@/lib/helpers/session-chart-data"

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{
    color: string
    dataKey: string
    payload: SessionChartRow
    value: number
  }>
  label?: string
}) {
  const visibleEntries = payload?.filter((entry) => (entry.value ?? 0) > 0) ?? []
  if (!active || visibleEntries.length === 0) return null

  const total = visibleEntries.reduce((sum, entry) => sum + (entry.value || 0), 0)

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {visibleEntries.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {String(entry.payload[`_label_${entry.dataKey}`] ?? entry.dataKey)}: {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
      {visibleEntries.length > 1 && (
        <p className="mt-1 border-t border-border/50 pt-1 font-medium text-foreground">
          Total: {total.toLocaleString()}
        </p>
      )}
    </div>
  )
}

export function DailySolvesChart({ sessions }: { sessions: Session[] }) {
  const [weekStart, setWeekStart] = useState<SessionChartWeekStart>(1)
  const [groupOverride, setGroupOverride] = useState<SessionChartGroupMode | "auto">("auto")

  const { chartData, series, title, mode } = useMemo(() => {
    if (sessions.length === 0) {
      return {
        chartData: [],
        series: [],
        title: "Solves Over Time",
        mode: "daily" as SessionChartGroupMode,
      }
    }

    const mode = groupOverride === "auto" ? getAutoSessionChartGroupMode(sessions) : groupOverride
    const titleMap: Record<SessionChartGroupMode, string> = {
      daily: "Daily Solves",
      weekly: "Weekly Solves",
      monthly: "Monthly Solves",
    }

    const { chartData, series } = buildSessionChartData({
      sessions,
      groupMode: mode,
      valueMode: "solves",
      weekStart,
    })

    const data = chartData.map((row) => {
      const labels = Object.fromEntries(
        series.map((entry) => [`_label_${entry.eventId}`, entry.label]),
      )
      return {
        ...row,
        ...labels,
      }
    })

    return { chartData: data, series, title: titleMap[mode], mode }
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
              {series.map((seriesEntry, i) => (
                <Bar
                  key={seriesEntry.eventId}
                  dataKey={seriesEntry.eventId}
                  name={seriesEntry.label}
                  stackId="a"
                  fill={seriesEntry.color}
                  radius={
                    i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
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
