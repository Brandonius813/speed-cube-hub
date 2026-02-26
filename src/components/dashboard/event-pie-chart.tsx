"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Session } from "@/lib/types"
import { EVENT_COLORS, getEventLabel } from "@/lib/constants"

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string; solves: number } }>
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="font-medium text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].value}% of practice</p>
        {data.solves > 0 && (
          <p className="text-muted-foreground">{data.solves.toLocaleString()} solves</p>
        )}
      </div>
    )
  }
  return null
}

export function EventPieChart({ sessions }: { sessions: Session[] }) {
  // Compute time per event as percentages
  const eventMinutes: Record<string, number> = {}
  const eventSolves: Record<string, number> = {}
  let total = 0

  for (const session of sessions) {
    eventMinutes[session.event] =
      (eventMinutes[session.event] || 0) + session.duration_minutes
    eventSolves[session.event] =
      (eventSolves[session.event] || 0) + (session.num_solves ?? 0)
    total += session.duration_minutes
  }

  const data = Object.entries(eventMinutes)
    .map(([event, minutes]) => ({
      name: getEventLabel(event),
      value: total > 0 ? Math.round((minutes / total) * 100) : 0,
      solves: eventSolves[event] || 0,
      color: EVENT_COLORS[event] || "#6366F1",
    }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Time Per Event</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sessions yet. Log your first session to see event breakdown.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Time Per Event</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <div className="h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:flex-col sm:gap-3">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
                <span className="font-mono text-sm font-medium text-foreground">
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
