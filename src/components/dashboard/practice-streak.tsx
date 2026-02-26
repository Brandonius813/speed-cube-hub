"use client"

import { useMemo, useState, useCallback } from "react"
import { Flame, Trophy, Star } from "lucide-react"
import { HeatmapTooltip } from "@/components/dashboard/heatmap-tooltip"
import type { Session } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const MILESTONES = [
  { days: 7, label: "7d", icon: Star },
  { days: 30, label: "30d", icon: Star },
  { days: 100, label: "100d", icon: Trophy },
  { days: 365, label: "365d", icon: Trophy },
]

function getIntensity(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes <= 15) return 1
  if (minutes <= 45) return 2
  if (minutes <= 90) return 3
  return 4
}

const INTENSITY_CLASSES = [
  "bg-secondary/50",
  "bg-primary/25",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary",
]

type DayData = {
  date: string
  minutes: number
  intensity: number
}

export function PracticeStreak({
  sessions,
  currentStreak,
  longestStreak,
}: {
  sessions: Session[]
  currentStreak: number
  longestStreak: number
}) {
  const [tooltip, setTooltip] = useState<{
    date: string
    mouseX: number
    mouseY: number
  } | null>(null)

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const s of sessions) {
      const existing = map.get(s.session_date) ?? []
      existing.push(s)
      map.set(s.session_date, existing)
    }
    return map
  }, [sessions])

  const { weeks, monthLabels } = useMemo(() => {
    const minutesByDate = new Map<string, number>()
    for (const s of sessions) {
      const current = minutesByDate.get(s.session_date) ?? 0
      minutesByDate.set(s.session_date, current + s.duration_minutes)
    }

    const today = new Date()
    const days: DayData[] = []

    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364)
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)

    const cursor = new Date(startDate)
    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0]
      const minutes = minutesByDate.get(dateStr) ?? 0
      days.push({ date: dateStr, minutes, intensity: getIntensity(minutes) })
      cursor.setDate(cursor.getDate() + 1)
    }

    while (days.length % 7 !== 0) {
      days.push({ date: "", minutes: 0, intensity: -1 })
    }

    const weekList: DayData[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weekList.push(days.slice(i, i + 7))
    }

    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    for (let w = 0; w < weekList.length; w++) {
      const firstDay = weekList[w][0]
      if (!firstDay.date) continue
      const month = new Date(firstDay.date + "T00:00:00").getMonth()
      if (month !== lastMonth) {
        labels.push({ label: MONTH_LABELS[month], col: w })
        lastMonth = month
      }
    }

    return { weeks: weekList, monthLabels: labels }
  }, [sessions])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, day: DayData) => {
      if (day.intensity < 0) return
      setTooltip({ date: day.date, mouseX: e.clientX, mouseY: e.clientY })
    },
    []
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  const isActive = currentStreak > 0

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
      {/* Header: streak counters + milestones */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          {/* Current streak */}
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isActive ? "bg-orange-500/15" : "bg-secondary"
              }`}
            >
              <Flame
                className={`h-5 w-5 ${isActive ? "text-orange-500" : "text-muted-foreground"}`}
                style={isActive ? { animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" } : undefined}
              />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold leading-none text-foreground">
                {currentStreak}
              </p>
              <p className="text-[11px] text-muted-foreground">day streak</p>
            </div>
          </div>
          {/* Longest streak */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Trophy className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-mono text-lg font-bold leading-none text-foreground">
                {longestStreak}
              </p>
              <p className="text-[11px] text-muted-foreground">longest</p>
            </div>
          </div>
        </div>
        {/* Milestones */}
        <div className="flex flex-wrap gap-1.5">
          {MILESTONES.map((m) => {
            const earned = longestStreak >= m.days
            return (
              <div
                key={m.days}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  earned
                    ? "bg-accent/15 text-accent"
                    : "bg-secondary/50 text-muted-foreground/50"
                }`}
              >
                <m.icon className="h-3 w-3" />
                {m.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Month labels */}
          <div className="mb-1 flex">
            <div className="w-8 shrink-0" />
            <div className="relative flex-1">
              {monthLabels.map((m) => (
                <span
                  key={`${m.label}-${m.col}`}
                  className="absolute text-[10px] text-muted-foreground sm:text-xs"
                  style={{ left: `${(m.col / weeks.length) * 100}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-4 flex gap-[3px]">
            <div className="flex w-8 shrink-0 flex-col gap-[3px]">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-[13px] items-center text-[10px] text-muted-foreground sm:text-xs"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="flex flex-1 gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-1 flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`aspect-square w-full rounded-[2px] ${
                        day.intensity === -1
                          ? "invisible"
                          : INTENSITY_CLASSES[day.intensity]
                      }`}
                      onMouseMove={(e) => handleMouseMove(e, day)}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-between">
            <div className="min-h-[20px] text-xs text-muted-foreground">
              {tooltip && tooltip.date && (
                <span>
                  {new Date(tooltip.date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {" — "}
                  {(() => {
                    const daySessions = sessionsByDate.get(tooltip.date) ?? []
                    const total = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0)
                    return total > 0
                      ? `${formatDuration(total)} practiced`
                      : "No practice"
                  })()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
              <span>Less</span>
              {INTENSITY_CLASSES.map((cls, i) => (
                <div key={i} className={`h-[13px] w-[13px] rounded-[2px] ${cls}`} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating tooltip via portal */}
      <HeatmapTooltip
        sessions={tooltip ? sessionsByDate.get(tooltip.date) ?? [] : []}
        date={tooltip?.date ?? ""}
        mouseX={tooltip?.mouseX ?? 0}
        mouseY={tooltip?.mouseY ?? 0}
        visible={!!tooltip}
      />
    </div>
  )
}
