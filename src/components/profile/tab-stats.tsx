"use client"

import { useMemo } from "react"
import { ProfileStats } from "@/components/profile/profile-stats"
import { PracticeStreak } from "@/components/dashboard/practice-streak"
import { PracticeHeatmap } from "@/components/dashboard/practice-heatmap"
import { DailyBarChart } from "@/components/dashboard/daily-bar-chart"
import { TimeByEventChart } from "@/components/dashboard/time-by-event-chart"
import { EventBreakdownTable } from "@/components/dashboard/event-breakdown-table"
import { SessionLog } from "@/components/dashboard/session-log"
import type { Session } from "@/lib/types"

/** Compute current and longest streaks from sessions */
function computeStreaks(sessions: Session[]): {
  currentStreak: number
  longestStreak: number
} {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 }

  // Get unique dates (sorted newest first)
  const dates = [...new Set(sessions.map((s) => s.session_date))].sort(
    (a, b) => b.localeCompare(a)
  )

  // Convert to day offsets from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayMs = 86400000

  const daySet = new Set(
    dates.map((d) => {
      const date = new Date(d + "T00:00:00")
      return Math.round((today.getTime() - date.getTime()) / dayMs)
    })
  )

  // Current streak: consecutive days from today (or yesterday)
  let currentStreak = 0
  const start = daySet.has(0) ? 0 : daySet.has(1) ? 1 : -1
  if (start >= 0) {
    for (let i = start; daySet.has(i); i++) currentStreak++
  }

  // Longest streak: find longest consecutive run
  const sortedDays = [...daySet].sort((a, b) => a - b)
  let longestStreak = 0
  let streak = 1
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === sortedDays[i - 1] + 1) {
      streak++
    } else {
      longestStreak = Math.max(longestStreak, streak)
      streak = 1
    }
  }
  longestStreak = Math.max(longestStreak, streak)

  return { currentStreak, longestStreak }
}

export function TabStats({
  sessions,
  isOwner,
}: {
  sessions: Session[]
  isOwner: boolean
}) {
  const { currentStreak, longestStreak } = useMemo(
    () => computeStreaks(sessions),
    [sessions]
  )

  return (
    <div className="flex flex-col gap-6">
      <ProfileStats sessions={sessions} />
      <PracticeStreak
        sessions={sessions}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
      />
      <PracticeHeatmap sessions={sessions} />
      <DailyBarChart sessions={sessions} />
      <TimeByEventChart sessions={sessions} />
      <EventBreakdownTable sessions={sessions} />
      <SessionLog sessions={sessions} readOnly={!isOwner} />
    </div>
  )
}
