"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
import { TabCompSim } from "@/components/profile/tab-comp-sim"
import type { Session } from "@/lib/types"
import { computeSessionStats } from "@/lib/utils"
import { cn } from "@/lib/utils"

type StatsSubview = "general" | "comp-sim"

function parseStatsSubviewParam(raw: string | null, fallbackTab: string | null): StatsSubview {
  if (raw === "comp-sim") return "comp-sim"
  if (fallbackTab === "comp-sim") return "comp-sim"
  return "general"
}

export function TabStats({
  sessions,
  isOwner,
}: {
  sessions: Session[]
  isOwner: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialSubview = parseStatsSubviewParam(
    searchParams.get("stats_view"),
    searchParams.get("tab")
  )
  const [activeSubview, setActiveSubview] = useState<StatsSubview>(initialSubview)

  useEffect(() => {
    setActiveSubview(
      parseStatsSubviewParam(searchParams.get("stats_view"), searchParams.get("tab"))
    )
  }, [searchParams])

  const compSimSessionCount = useMemo(
    () => sessions.filter((session) => session.practice_type === "Comp Sim").length,
    [sessions]
  )

  function setSubview(next: StatsSubview) {
    setActiveSubview(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "stats")
    if (next === "comp-sim") {
      params.set("stats_view", "comp-sim")
    } else {
      params.delete("stats_view")
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full rounded-2xl border border-border/60 bg-card/80 p-1 sm:w-auto">
          <button
            onClick={() => setSubview("general")}
            className={cn(
              "min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold transition-colors sm:flex-none",
              activeSubview === "general"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            General Stats
          </button>
          <button
            onClick={() => setSubview("comp-sim")}
            className={cn(
              "min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold transition-colors sm:flex-none",
              activeSubview === "comp-sim"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Comp Sim Results
          </button>
        </div>

        {activeSubview === "comp-sim" && (
          <p className="text-sm text-muted-foreground">
            {compSimSessionCount} saved round{compSimSessionCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {activeSubview === "general" ? (
        <GeneralStatsContent sessions={sessions} isOwner={isOwner} onOpenCompSim={() => setSubview("comp-sim")} />
      ) : (
        <TabCompSim sessions={sessions} isOwner={isOwner} />
      )}
    </div>
  )
}

function GeneralStatsContent({
  sessions,
  isOwner,
  onOpenCompSim,
}: {
  sessions: Session[]
  isOwner: boolean
  onOpenCompSim: () => void
}) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<string[]>([])
  const [selectedRange, setSelectedRange] = useState<DateRange>("all")
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null)

  const availablePracticeTypes = useMemo(() => {
    const types = new Set<string>()
    for (const s of sessions) types.add(s.practice_type)
    return Array.from(types).sort()
  }, [sessions])

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
    <>
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

      <StatsCards
        stats={{ ...filteredStats, sessionsThisWeek: filteredSessions.length }}
        selectedRange={selectedRange}
      />

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <TimeByEventChart sessions={filteredSessions} />
        <EventPieChart sessions={filteredSessions} />
      </div>

      <DailyBarChart sessions={filteredSessions} />
      <DailySolvesChart sessions={filteredSessions} />
      <EventBreakdownTable sessions={filteredSessions} />

      {isOwner && <SolveAnalytics practicedEvents={practicedEvents} />}

      {compSimSessions.length > 0 && (
        <button
          onClick={onOpenCompSim}
          className="block w-full rounded-3xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(217,70,239,0.14))] p-5 text-left transition-transform hover:scale-[1.01]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Comp Sim Preview
          </p>
          <h3 className="mt-2 text-xl font-bold text-foreground">
            {compSimSessions.length} dedicated round{compSimSessions.length !== 1 ? "s" : ""} saved
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Switch to the Comp Sim Results sub-tab for separate round history, trends, and comp-vs-practice comparison.
          </p>
        </button>
      )}

      <SessionLog sessions={filteredSessions} readOnly={!isOwner} />
    </>
  )
}
