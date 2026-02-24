"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { Session } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

export function ProfileStats({ sessions }: { sessions: Session[] }) {
  const totalSessions = sessions.length

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  )

  // Calculate current streak
  const uniqueDates = [
    ...new Set(sessions.map((s) => s.session_date)),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  let currentStreak = 0
  if (uniqueDates.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let checkDate = new Date(today)
    const latestSession = new Date(uniqueDates[0] + "T00:00:00")
    if (latestSession < today) {
      checkDate = latestSession
    }

    for (const dateStr of uniqueDates) {
      const sessionDate = new Date(dateStr + "T00:00:00")
      if (sessionDate.getTime() === checkDate.getTime()) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (sessionDate < checkDate) {
        break
      }
    }
  }

  const stats = [
    { label: "Total Sessions", value: String(totalSessions) },
    { label: "Practice Time", value: formatDuration(totalMinutes) },
    {
      label: "Current Streak",
      value: `${currentStreak} day${currentStreak !== 1 ? "s" : ""}`,
    },
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
