"use client"

import { useState, useMemo } from "react"
import { PracticeStreak } from "@/components/dashboard/practice-streak"
import { DashboardFilters } from "@/components/dashboard/filters"
import type { DateRange, CustomDateRange } from "@/components/dashboard/filters"
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

  const dates = [...new Set(sessions.map((s) => s.session_date))].sort(
    (a, b) => b.localeCompare(a)
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayMs = 86400000

  const daySet = new Set(
    dates.map((d) => {
      const date = new Date(d + "T00:00:00")
      return Math.round((today.getTime() - date.getTime()) / dayMs)
    })
  )

  let currentStreak = 0
  const start = daySet.has(0) ? 0 : daySet.has(1) ? 1 : -1
  if (start >= 0) {
    for (let i = start; daySet.has(i); i++) currentStreak++
  }

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

  // Filter state
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<string[]>([])
  const [selectedRange, setSelectedRange] = useState<DateRange>("all")
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null)

  const availablePracticeTypes = useMemo(() => {
    const types = new Set<string>()
    for (const s of sessions) types.add(s.practice_type)
    return Array.from(types).sort()
  }, [sessions])

  const filteredSessions = useMemo(() => {
    let result = sessions

    if (selectedEvents.length > 0) {
      result = result.filter((s) => selectedEvents.includes(s.event))
    }

    if (selectedPracticeTypes.length > 0) {
      result = result.filter((s) => selectedPracticeTypes.includes(s.practice_type))
    }

    if (selectedRange === "custom" && customRange) {
      result = result.filter((s) => {
        const d = new Date(s.session_date + "T00:00:00")
        return d >= customRange.from && d <= customRange.to
      })
    } else if (selectedRange !== "all") {
      const now = new Date()
      let days: number
      switch (selectedRange) {
        case "1d": days = 1; break
        case "7d": days = 7; break
        case "30d": days = 30; break
        case "90d": days = 90; break
        case "1y": {
          const yearStart = new Date(now.getFullYear(), 0, 1)
          result = result.filter(
            (s) => new Date(s.session_date + "T00:00:00") >= yearStart
          )
          return result
        }
        case "365d": days = 365; break
        default: days = 30
      }
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      result = result.filter(
        (s) => new Date(s.session_date + "T00:00:00") >= startDate
      )
    }

    return result
  }, [sessions, selectedEvents, selectedPracticeTypes, selectedRange, customRange])

  function handleClearFilters() {
    setSelectedEvents([])
    setSelectedPracticeTypes([])
    setSelectedRange("all")
    setCustomRange(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PracticeStreak
        sessions={sessions}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
      />

      <DashboardFilters
        selectedEvents={selectedEvents}
        selectedRange={selectedRange}
        customRange={customRange}
        selectedPracticeTypes={selectedPracticeTypes}
        availablePracticeTypes={availablePracticeTypes}
        onEventsChange={setSelectedEvents}
        onRangeChange={setSelectedRange}
        onCustomRangeChange={setCustomRange}
        onPracticeTypesChange={setSelectedPracticeTypes}
        onClearFilters={handleClearFilters}
      />

      <DailyBarChart sessions={filteredSessions} />
      <TimeByEventChart sessions={filteredSessions} />
      <EventBreakdownTable sessions={filteredSessions} />
      <SessionLog sessions={filteredSessions} readOnly={!isOwner} />
    </div>
  )
}
