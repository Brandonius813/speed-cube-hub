"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
import { DashboardFilters } from "@/components/dashboard/filters"
import type { DateRange, CustomDateRange } from "@/components/dashboard/filters"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { EventPieChart } from "@/components/dashboard/event-pie-chart"
import { DailyBarChart } from "@/components/dashboard/daily-bar-chart"
import { DailySolvesChart } from "@/components/dashboard/daily-solves-chart"
import { TimeByEventChart } from "@/components/dashboard/time-by-event-chart"
import { EventBreakdownTable } from "@/components/dashboard/event-breakdown-table"
import { SessionLog } from "@/components/dashboard/session-log"
import { SolveAnalytics } from "@/components/dashboard/solve-analytics"
import { computeSessionStats } from "@/lib/utils"
import type { Session } from "@/lib/types"

export function TabStats({
  sessions,
  isOwner,
}: {
  sessions: Session[]
  isOwner: boolean
}) {
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

  // Derive practiced events for solve analytics (only for owner)
  const practicedEvents = useMemo(() => {
    const events = new Set<string>()
    for (const s of sessions) events.add(s.event)
    return Array.from(events)
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

  const filteredStats = useMemo(
    () => computeSessionStats(filteredSessions),
    [filteredSessions]
  )

  const compSimSessions = useMemo(
    () => filteredSessions.filter((s) => s.practice_type === "Comp Sim"),
    [filteredSessions],
  )

  function handleClearFilters() {
    setSelectedEvents([])
    setSelectedPracticeTypes([])
    setSelectedRange("all")
    setCustomRange(null)
  }

  return (
    <div className="flex flex-col gap-6">
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

      {/* Stats Cards (session count + total practice time) */}
      <StatsCards
        stats={{ ...filteredStats, sessionsThisWeek: filteredSessions.length }}
        selectedRange={selectedRange}
      />

      {/* Charts grid: Time by Event + Event Pie */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <TimeByEventChart sessions={filteredSessions} />
        <EventPieChart sessions={filteredSessions} />
      </div>

      <DailyBarChart sessions={filteredSessions} />
      <DailySolvesChart sessions={filteredSessions} />
      <EventBreakdownTable sessions={filteredSessions} />

      {/* Solve Analytics (timer solve-level charts) — owner only */}
      {isOwner && <SolveAnalytics practicedEvents={practicedEvents} />}

      {compSimSessions.length > 0 && (
        <Link
          href="?tab=comp-sim"
          className="block rounded-3xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(217,70,239,0.14))] p-5 transition-transform hover:scale-[1.01]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Comp Sim Preview
          </p>
          <h3 className="mt-2 text-xl font-bold text-foreground">
            {compSimSessions.length} dedicated round{compSimSessions.length !== 1 ? "s" : ""} saved
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the Comp Sim tab for separate round history, result trends, cutoff stats, and comp-vs-practice comparison.
          </p>
        </Link>
      )}

      <SessionLog sessions={filteredSessions} readOnly={!isOwner} />
    </div>
  )
}
