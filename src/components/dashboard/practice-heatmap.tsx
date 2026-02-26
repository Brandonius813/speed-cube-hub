"use client"

import { useMemo, useState } from "react"
import type { Session } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function getIntensity(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes <= 15) return 1
  if (minutes <= 45) return 2
  if (minutes <= 90) return 3
  return 4
}

const INTENSITY_CLASSES = [
  "bg-secondary/50",                     // 0 — no activity
  "bg-primary/25",                       // 1 — light
  "bg-primary/50",                       // 2 — medium
  "bg-primary/75",                       // 3 — heavy
  "bg-primary",                          // 4 — very heavy
]

type DayData = {
  date: string
  minutes: number
  intensity: number
}

export function PracticeHeatmap({ sessions }: { sessions: Session[] }) {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)

  const { weeks, monthLabels } = useMemo(() => {
    // Build a map of date → total minutes
    const minutesByDate = new Map<string, number>()
    for (const s of sessions) {
      const current = minutesByDate.get(s.session_date) ?? 0
      minutesByDate.set(s.session_date, current + s.duration_minutes)
    }

    // Build 52 weeks of data ending today
    const today = new Date()
    const days: DayData[] = []

    // Find the start: go back ~52 weeks, aligned to Sunday
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364) // 52 weeks = 364 days
    // Align to previous Sunday
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)

    // Fill each day from start to today
    const cursor = new Date(startDate)
    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0]
      const minutes = minutesByDate.get(dateStr) ?? 0
      days.push({
        date: dateStr,
        minutes,
        intensity: getIntensity(minutes),
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    // Pad to fill the last week if needed
    while (days.length % 7 !== 0) {
      const nextDate = new Date(today)
      nextDate.setDate(nextDate.getDate() + (days.length - Math.floor(days.length / 7) * 7))
      days.push({ date: "", minutes: 0, intensity: -1 }) // invisible placeholder
    }

    // Group into weeks (columns)
    const weekList: DayData[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weekList.push(days.slice(i, i + 7))
    }

    // Build month labels with column positions
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    for (let w = 0; w < weekList.length; w++) {
      // Use the first day of the week to determine month
      const firstDay = weekList[w][0]
      if (!firstDay.date) continue
      const month = new Date(firstDay.date + "T00:00:00").getMonth()
      if (month !== lastMonth) {
        labels.push({ label: MONTH_LABELS[month], col: w })
        lastMonth = month
      }
    }

    // Remove labels that are too close together (< 3 columns apart) to prevent overlap
    const filtered: typeof labels = []
    for (const lbl of labels) {
      if (filtered.length === 0 || lbl.col - filtered[filtered.length - 1].col >= 3) {
        filtered.push(lbl)
      }
    }

    return { weeks: weekList, monthLabels: filtered }
  }, [sessions])

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Practice Activity</h3>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Month labels */}
          <div className="mb-1 flex">
            <div className="w-8 shrink-0" /> {/* spacer for day labels */}
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
            {/* Day labels column */}
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

            {/* Weeks */}
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
                      onMouseEnter={() => day.intensity >= 0 ? setHoveredDay(day) : undefined}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip area */}
          <div className="mt-3 flex items-center justify-between">
            <div className="min-h-[20px] text-xs text-muted-foreground">
              {hoveredDay && hoveredDay.date && (
                <span>
                  {new Date(hoveredDay.date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {" — "}
                  {hoveredDay.minutes > 0
                    ? `${formatDuration(hoveredDay.minutes)} practiced`
                    : "No practice"}
                </span>
              )}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
              <span>Less</span>
              {INTENSITY_CLASSES.map((cls, i) => (
                <div
                  key={i}
                  className={`h-[13px] w-[13px] rounded-[2px] ${cls}`}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
