"use client"

import { useState, useMemo } from "react"
import { DashboardFilters } from "@/components/dashboard/filters"
import type { DateRange, CustomDateRange } from "@/components/dashboard/filters"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { StreakCard } from "@/components/dashboard/streak-card"
import { PracticeHeatmap } from "@/components/dashboard/practice-heatmap"
import { EventPieChart } from "@/components/dashboard/event-pie-chart"
import { DailyBarChart } from "@/components/dashboard/daily-bar-chart"
import { SessionLog } from "@/components/dashboard/session-log"
import { GoalsSection } from "@/components/dashboard/goals-section"
import { PBProgressChart } from "@/components/profile/pb-progress-chart"
import type { Session, Goal } from "@/lib/types"

export function DashboardContent({
  initialSessions,
  initialStats,
  initialGoals = [],
}: {
  initialSessions: Session[]
  initialStats: {
    sessionsThisWeek: number
    totalMinutes: number
    currentStreak: number
    longestStreak: number
    weeklyMinutes: number
    weeklyChange: number
  }
  initialGoals?: Goal[]
}) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedRange, setSelectedRange] = useState<DateRange>("30d")
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null)

  const filteredSessions = useMemo(() => {
    let result = initialSessions

    // Filter by events (empty array = all events)
    if (selectedEvents.length > 0) {
      result = result.filter((s) => selectedEvents.includes(s.event))
    }

    // Filter by date range
    if (selectedRange === "custom" && customRange) {
      const startDate = customRange.from
      const endDate = customRange.to
      result = result.filter((s) => {
        const sessionDate = new Date(s.session_date + "T00:00:00")
        return sessionDate >= startDate && sessionDate <= endDate
      })
    } else if (selectedRange !== "all") {
      const now = new Date()
      const days = selectedRange === "7d" ? 7 : selectedRange === "30d" ? 30 : 90
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      result = result.filter(
        (s) => new Date(s.session_date + "T00:00:00") >= startDate
      )
    }

    return result
  }, [initialSessions, selectedEvents, selectedRange, customRange])

  // Compute current averages for each goal's event from session data
  const goalAverages = useMemo(() => {
    const averages: Record<string, number | null> = {}
    const goalEvents = new Set(initialGoals.map((g) => g.event))
    for (const eventId of goalEvents) {
      const eventSessions = initialSessions
        .filter((s) => s.event === eventId && s.avg_time != null)
        .slice(0, 5)
      if (eventSessions.length === 0) {
        averages[eventId] = null
      } else {
        averages[eventId] =
          eventSessions.reduce((sum, s) => sum + (s.avg_time ?? 0), 0) /
          eventSessions.length
      }
    }
    return averages
  }, [initialSessions, initialGoals])

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <DashboardFilters
        selectedEvents={selectedEvents}
        selectedRange={selectedRange}
        customRange={customRange}
        onEventsChange={setSelectedEvents}
        onRangeChange={setSelectedRange}
        onCustomRangeChange={setCustomRange}
      />
      <StatsCards stats={initialStats} />
      <StreakCard
        currentStreak={initialStats.currentStreak}
        longestStreak={initialStats.longestStreak}
      />
      <GoalsSection initialGoals={initialGoals} goalAverages={goalAverages} />
      <PracticeHeatmap sessions={initialSessions} />

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <EventPieChart sessions={filteredSessions} />
        <DailyBarChart sessions={filteredSessions} />
      </div>

      <PBProgressChart sessions={initialSessions} />

      <SessionLog sessions={filteredSessions} />
    </div>
  )
}
