"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { Session } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

type SorKinchStats = {
  sorRank: number | null
  sorTotal: number | null
  kinchScore: number | null
  kinchRank: number | null
} | null

export function ProfileStats({
  sessions,
  sorKinchStats,
}: {
  sessions: Session[]
  sorKinchStats?: SorKinchStats
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

  // Add SOR rank if available
  if (sorKinchStats?.sorRank != null) {
    stats.push({
      label: "SOR Rank",
      value: `#${sorKinchStats.sorRank.toLocaleString()}`,
    })
  }

  // Add Kinch score if available
  if (sorKinchStats?.kinchScore != null) {
    stats.push({
      label: "Kinch Score",
      value: sorKinchStats.kinchScore.toFixed(2),
    })
  }

  // Dynamically set grid columns based on number of stats
  const gridCols =
    stats.length <= 3
      ? "grid-cols-3"
      : stats.length === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-3 sm:grid-cols-5"

  return (
    <div className={`grid gap-2 sm:gap-4 ${gridCols}`}>
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
