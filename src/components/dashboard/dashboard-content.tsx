"use client"

import { useState, useMemo } from "react"
import { DashboardFilters } from "@/components/dashboard/filters"
import type { DateRange, CustomDateRange } from "@/components/dashboard/filters"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { PracticeStreak } from "@/components/dashboard/practice-streak"
import { EventPieChart } from "@/components/dashboard/event-pie-chart"
import { TimeByEventChart } from "@/components/dashboard/time-by-event-chart"
import { DailyBarChart } from "@/components/dashboard/daily-bar-chart"
import { EventBreakdownTable } from "@/components/dashboard/event-breakdown-table"
import { SessionLog } from "@/components/dashboard/session-log"
import { SolveAnalytics } from "@/components/dashboard/solve-analytics"
import { computeSessionStats } from "@/lib/utils"
import type { Session } from "@/lib/types"

export function DashboardContent({
  initialSessions,
}: {
  initialSessions: Session[]
}) {
  // Compute streak stats from ALL sessions (unfiltered)
  const allStats = useMemo(() => computeSessionStats(initialSessions), [initialSessions])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<string[]>([])

  const [selectedRange, setSelectedRange] = useState<DateRange>("30d")
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null)

  // Derive available practice types from session data
  const availablePracticeTypes = useMemo(() => {
    const types = new Set<string>()
    for (const s of initialSessions) {
      types.add(s.practice_type)
    }
    return Array.from(types).sort()
  }, [initialSessions])

  // Derive practiced events for solve analytics
  const practicedEvents = useMemo(() => {
    const events = new Set<string>()
    for (const s of initialSessions) {
      events.add(s.event)
    }
    return Array.from(events)
  }, [initialSessions])

  const filteredSessions = useMemo(() => {
    let result = initialSessions

    // Filter by events
    if (selectedEvents.length > 0) {
      result = result.filter((s) => selectedEvents.includes(s.event))
    }

    // Filter by practice types
    if (selectedPracticeTypes.length > 0) {
      result = result.filter((s) => selectedPracticeTypes.includes(s.practice_type))
    }

    // Filter by date range
    if (selectedRange === "custom" && customRange) {
      result = result.filter((s) => {
        const sessionDate = new Date(s.session_date + "T00:00:00")
        return sessionDate >= customRange.from && sessionDate <= customRange.to
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
          // This year (Jan 1 to today)
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
  }, [initialSessions, selectedEvents, selectedPracticeTypes, selectedRange, customRange])

  // Compute stats from filtered sessions (so stats cards reflect filters)
  const filteredStats = useMemo(() => computeSessionStats(filteredSessions), [filteredSessions])

  function handleClearFilters() {
    setSelectedEvents([])
    setSelectedPracticeTypes([])
    setSelectedRange("30d")
    setCustomRange(null)
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* 1. Practice Streak (heatmap + streak counters) */}
      <PracticeStreak
        sessions={initialSessions}
        currentStreak={allStats.currentStreak}
        longestStreak={allStats.longestStreak}
      />

      {/* 2. Filters */}
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

      {/* 3. Stats Cards */}
      <StatsCards stats={{ ...filteredStats, sessionsThisWeek: filteredSessions.length }} selectedRange={selectedRange} />

      {/* 4. Charts grid: Time by Event + Event Pie */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <TimeByEventChart sessions={filteredSessions} />
        <EventPieChart sessions={filteredSessions} />
      </div>

      {/* 5. Practice Over Time bar chart */}
      <DailyBarChart sessions={filteredSessions} />

      {/* 6. Event Breakdown Table */}
      <EventBreakdownTable sessions={filteredSessions} />

      {/* 7. Solve Analytics (timer solve-level charts) */}
      <SolveAnalytics practicedEvents={practicedEvents} />

      {/* 8. Session Log */}
      <SessionLog sessions={filteredSessions} />
    </div>
  )
}
