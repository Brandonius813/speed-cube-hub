"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatSolveTime } from "@/lib/utils"
import type { Session } from "@/lib/types"

type ChartPoint = {
  index: number
  ao5: number
  date: string
  event: string
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">Attempt #{d.index}</p>
      <p className="text-muted-foreground">
        Ao5: <span className="font-mono">{formatSolveTime(d.ao5)}</span>
      </p>
      <p className="text-muted-foreground">{d.event} &middot; {d.date}</p>
    </div>
  )
}

export function CompSimAnalytics({ sessions }: { sessions: Session[] }) {
  const validSessions = useMemo(
    () => sessions.filter((s) => s.avg_time !== null && s.avg_time > 0),
    [sessions],
  )

  const stats = useMemo(() => {
    if (validSessions.length === 0) return null
    const times = validSessions.map((s) => s.avg_time!)
    return {
      best: Math.min(...times),
      worst: Math.max(...times),
      average: times.reduce((a, b) => a + b, 0) / times.length,
      count: sessions.length,
    }
  }, [validSessions, sessions.length])

  const chartData = useMemo<ChartPoint[]>(() => {
    return validSessions
      .sort(
        (a, b) =>
          a.created_at.localeCompare(b.created_at),
      )
      .map((s, i) => ({
        index: i + 1,
        ao5: s.avg_time!,
        date: s.session_date,
        event: s.event,
      }))
  }, [validSessions])

  if (!stats || validSessions.length === 0) return null

  const tickInterval = Math.max(1, Math.floor(chartData.length / 10)) - 1

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Comp Sim Analytics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Best Ao5" value={formatSolveTime(stats.best)} highlight />
          <StatBox label="Average Ao5" value={formatSolveTime(stats.average)} />
          <StatBox label="Worst Ao5" value={formatSolveTime(stats.worst)} />
          <StatBox label="Attempts" value={String(stats.count)} />
        </div>

        {/* Ao5 trend chart */}
        {chartData.length >= 2 && (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2A2A3C"
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  tick={{ fill: "#8B8BA3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                  label={{
                    value: "Attempt #",
                    position: "insideBottom",
                    offset: -5,
                    fill: "#8B8BA3",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: "#8B8BA3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatSolveTime(v)}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="ao5"
                  name="Ao5"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#EF4444" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`font-mono text-lg font-semibold ${
          highlight ? "text-green-400" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  )
}
