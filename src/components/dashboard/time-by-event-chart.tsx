"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Session } from "@/lib/types"
import { EVENT_COLORS, getEventLabel } from "@/lib/constants"
import { formatDuration } from "@/lib/utils"

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { event: string; minutes: number; color: string } }>
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="font-medium text-foreground">{data.event}</p>
        <p className="text-muted-foreground">{formatDuration(data.minutes)}</p>
      </div>
    )
  }
  return null
}

export function TimeByEventChart({ sessions }: { sessions: Session[] }) {
  const eventMinutes: Record<string, number> = {}
  for (const s of sessions) {
    eventMinutes[s.event] = (eventMinutes[s.event] || 0) + s.duration_minutes
  }

  const data = Object.entries(eventMinutes)
    .map(([id, minutes]) => ({
      event: getEventLabel(id),
      eventId: id,
      minutes,
      color: EVENT_COLORS[id] || "#6366F1",
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8)

  if (data.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Time by Event</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sessions yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  const barHeight = Math.max(200, data.length * 36)

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Time by Event</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: barHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A3C"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#8B8BA3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatDuration(v)}
              />
              <YAxis
                type="category"
                dataKey="event"
                tick={{ fill: "#8B8BA3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry) => (
                  <Cell key={entry.eventId} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
