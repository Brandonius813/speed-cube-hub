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
import type { SessionChartRow } from "@/lib/helpers/session-chart-data"
import {
  buildSessionChartData,
  getAutoSessionChartGroupMode,
} from "@/lib/helpers/session-chart-data"
import { formatDuration } from "@/lib/utils"

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

  if (active && visibleEntries.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-medium text-foreground">{label}</p>
        {visibleEntries.map((entry) => {
          const solves = Number(entry.payload[`_solves_${entry.dataKey}`] || 0)
          return (
            <div key={entry.dataKey}>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">
                  {String(entry.payload[`_label_${entry.dataKey}`] ?? entry.dataKey)}: {formatDuration(entry.value)}
                </span>
              </div>
              {solves > 0 && (
                <p className="ml-4 text-muted-foreground">{solves.toLocaleString()} solves</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

export function DailyBarChart({ sessions }: { sessions: Session[] }) {
  const { chartData, series, title } = useMemo(() => {
    if (sessions.length === 0) return { chartData: [], series: [], title: "Practice Over Time" }

    const mode = getAutoSessionChartGroupMode(sessions)
    const titleMap = {
      daily: "Daily Practice",
      weekly: "Weekly Practice",
      monthly: "Monthly Practice",
    }

    const { chartData, series } = buildSessionChartData({
      sessions,
      groupMode: mode,
      valueMode: "duration",
      weekStart: 0,
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

    return { chartData: data, series, title: titleMap[mode] }
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
