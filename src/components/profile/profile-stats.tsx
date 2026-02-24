"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { Session } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

export function ProfileStats({
  sessions,
}: {
  sessions: Session[]
}) {
  const totalSessions = sessions.length

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  )

  const totalSolves = sessions.reduce(
    (sum, s) => sum + (s.num_solves ?? 0),
    0
  )

  const stats: { label: string; value: string }[] = [
    { label: "Total Sessions", value: String(totalSessions) },
    { label: "Practice Time", value: formatDuration(totalMinutes) },
    { label: "Total Solves", value: totalSolves.toLocaleString() },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50 bg-card">
          <CardContent className="p-3 text-center sm:p-4">
            <p className="font-mono text-lg font-bold text-foreground sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
