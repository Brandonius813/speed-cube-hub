"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Flame } from "lucide-react"
import type { Session } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

export function ProfileStats({ sessions }: { sessions: Session[] }) {
  const totalSessions = sessions.length

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  )

  // Get unique sorted dates for streak calculations
  const uniqueDates = [
    ...new Set(sessions.map((s) => s.session_date)),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Calculate current streak
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

  // Calculate longest streak
  let longestStreak = 0
  if (uniqueDates.length > 0) {
    let streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00")
      const curr = new Date(uniqueDates[i] + "T00:00:00")
      const diffDays = (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000)
      if (diffDays === 1) {
        streak++
      } else {
        longestStreak = Math.max(longestStreak, streak)
        streak = 1
      }
    }
    longestStreak = Math.max(longestStreak, streak)
  }

  const isActive = currentStreak > 0

  const stats = [
    { label: "Total Sessions", value: String(totalSessions) },
    { label: "Practice Time", value: formatDuration(totalMinutes) },
    { label: "Longest Streak", value: `${longestStreak}d` },
  ]

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      {/* Streak banner */}
      <Card className="border-border/50 bg-card">
        <CardContent className="flex items-center gap-3 p-3 sm:p-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isActive ? "bg-orange-500/15" : "bg-secondary"
            }`}
          >
            <Flame
              className={`h-5 w-5 ${
                isActive ? "text-orange-500" : "text-muted-foreground"
              }`}
              style={
                isActive
                  ? {
                      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }
                  : undefined
              }
            />
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-foreground sm:text-2xl">
              {currentStreak} day{currentStreak !== 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              {isActive ? "Current streak" : "No active streak"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
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
    </div>
  )
}
