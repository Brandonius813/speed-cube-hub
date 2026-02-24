"use client"

import { useState, useMemo } from "react"
import { DashboardFilters } from "@/components/dashboard/filters"
import type { DateRange, CustomDateRange } from "@/components/dashboard/filters"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { PracticeHeatmap } from "@/components/dashboard/practice-heatmap"
import { EventPieChart } from "@/components/dashboard/event-pie-chart"
import { DailyBarChart } from "@/components/dashboard/daily-bar-chart"
import { SessionLog } from "@/components/dashboard/session-log"
import type { Session } from "@/lib/types"

export function DashboardContent({
  initialSessions,
  initialStats,
}: {
  initialSessions: Session[]
  initialStats: {
    sessionsThisWeek: number
    totalMinutes: number
    currentStreak: number
    weeklyMinutes: number
    weeklyChange: number
  }
}) {
  const [selectedEvent, setSelectedEvent] = useState("all")
  const [selectedRange, setSelectedRange] = useState<DateRange>("30d")
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null)

  const filteredSessions = useMemo(() => {
    let result = initialSessions

    // Filter by event
    if (selectedEvent !== "all") {
      result = result.filter((s) => s.event === selectedEvent)
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
  }, [initialSessions, selectedEvent, selectedRange, customRange])

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <DashboardFilters
        selectedEvent={selectedEvent}
        selectedRange={selectedRange}
        customRange={customRange}
        onEventChange={setSelectedEvent}
        onRangeChange={setSelectedRange}
        onCustomRangeChange={setCustomRange}
      />
      <StatsCards stats={initialStats} />
      <PracticeHeatmap sessions={initialSessions} />

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <EventPieChart sessions={filteredSessions} />
        <DailyBarChart sessions={filteredSessions} />
      </div>

      <SessionLog sessions={filteredSessions} />
    </div>
  )
}
