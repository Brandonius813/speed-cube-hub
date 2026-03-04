"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { X, BarChart3, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { WCA_EVENTS, type WcaEventId } from "@/lib/constants"
import {
  getDailySolveCounts,
  getSolvePeriodSummary,
  type DailySolveCount,
} from "@/lib/actions/timer-stats"

type DailyStatsModalProps = {
  isOpen: boolean
  onClose: () => void
  currentEvent: string
}

type ViewMode = "heatmap" | "bar"
type EventFilter = "all" | WcaEventId

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]

function getIntensity(count: number): number {
  if (count === 0) return 0
  if (count <= 10) return 1
  if (count <= 30) return 2
  if (count <= 60) return 3
  return 4
}

const INTENSITY_CLASSES = [
  "bg-secondary/50",
  "bg-emerald-500/25",
  "bg-emerald-500/50",
  "bg-emerald-500/75",
  "bg-emerald-500",
]

export function DailyStatsModal({ isOpen, onClose, currentEvent }: DailyStatsModalProps) {
  const [eventFilter, setEventFilter] = useState<EventFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap")
  const [dailyCounts, setDailyCounts] = useState<DailySolveCount[]>([])
  const [summary, setSummary] = useState({
    today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0,
  })
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const eventId = eventFilter === "all" ? null : eventFilter
    const [countsResult, summaryResult] = await Promise.all([
      getDailySolveCounts(365, eventId),
      getSolvePeriodSummary(eventId),
    ])
    setDailyCounts(countsResult.data)
    setSummary({
      today: summaryResult.today,
      thisWeek: summaryResult.thisWeek,
      thisMonth: summaryResult.thisMonth,
      thisYear: summaryResult.thisYear,
      total: summaryResult.total,
    })
    setLoading(false)
  }, [eventFilter])

  useEffect(() => {
    if (isOpen) loadData()
  }, [isOpen, loadData])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Daily Statistics</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary/50 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-wrap">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as EventFilter)}
            className="h-8 px-2 text-xs rounded-md bg-secondary/50 border border-border text-foreground"
          >
            <option value="all">All Events</option>
            {WCA_EVENTS.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.label}</option>
            ))}
          </select>

          <div className="flex gap-0.5 bg-secondary/30 rounded-md p-0.5 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 text-xs", viewMode === "heatmap" && "bg-secondary")}
              onClick={() => setViewMode("heatmap")}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Heatmap
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 text-xs", viewMode === "bar" && "bg-secondary")}
              onClick={() => setViewMode("bar")}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Chart
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm text-muted-foreground">Loading statistics...</span>
            </div>
          ) : (
            <>
              <PeriodSummary summary={summary} />
              {viewMode === "heatmap" ? (
                <SolveHeatmap dailyCounts={dailyCounts} />
              ) : (
                <SolveBarChart dailyCounts={dailyCounts} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Period summary cards ----

function PeriodSummary({ summary }: {
  summary: { today: number; thisWeek: number; thisMonth: number; thisYear: number; total: number }
}) {
  const items = [
    { label: "Today", value: summary.today },
    { label: "This Week", value: summary.thisWeek },
    { label: "This Month", value: summary.thisMonth },
    { label: "This Year", value: summary.thisYear },
    { label: "All Time", value: summary.total },
  ]

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-lg bg-secondary/30 px-2 py-2"
        >
          <span className="font-mono text-lg font-bold tabular-nums">
            {item.value.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---- Heatmap ----

type DayData = { date: string; count: number; intensity: number }

function SolveHeatmap({ dailyCounts }: { dailyCounts: DailySolveCount[] }) {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)

  const { weeks, monthLabels } = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const d of dailyCounts) {
      countMap.set(d.date, d.count)
    }

    const today = new Date()
    const days: DayData[] = []

    // Go back ~52 weeks, align to Sunday
    const start = new Date(today)
    start.setDate(start.getDate() - 364 - start.getDay())

    const current = new Date(start)
    while (current <= today) {
      const dateStr = current.toLocaleDateString("en-CA", {
        timeZone: "America/Los_Angeles",
      })
      const count = countMap.get(dateStr) ?? 0
      days.push({ date: dateStr, count, intensity: getIntensity(count) })
      current.setDate(current.getDate() + 1)
    }

    // Organize into weeks (columns)
    const wks: DayData[][] = []
    for (let i = 0; i < days.length; i += 7) {
      wks.push(days.slice(i, i + 7))
    }

    // Month labels
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    for (let col = 0; col < wks.length; col++) {
      const firstDay = wks[col][0]
      if (firstDay) {
        const month = new Date(firstDay.date + "T12:00:00").getMonth()
        if (month !== lastMonth) {
          labels.push({ label: MONTH_LABELS[month], col })
          lastMonth = month
        }
      }
    }

    return { weeks: wks, monthLabels: labels }
  }, [dailyCounts])

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Solve Activity (Last Year)</h3>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5 min-w-fit">
          {/* Month labels */}
          <div className="flex gap-0.5 ml-7">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[9px] text-muted-foreground"
                style={{ position: "absolute", left: `${m.col * 13 + 28}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div style={{ height: "14px" }} />

          {/* Grid */}
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="h-[11px] text-[9px] text-muted-foreground leading-[11px] w-5 text-right">
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-0.5">
                {week.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className={cn(
                      "w-[11px] h-[11px] rounded-[2px] cursor-default",
                      INTENSITY_CLASSES[day.intensity]
                    )}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    title={`${day.date}: ${day.count} solves`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] text-muted-foreground mr-1">Less</span>
            {INTENSITY_CLASSES.map((cls, i) => (
              <div key={i} className={cn("w-[11px] h-[11px] rounded-[2px]", cls)} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">More</span>
          </div>
        </div>
      </div>

      {hoveredDay && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{hoveredDay.count} solves</span>
          {" "}on {hoveredDay.date}
        </p>
      )}
    </div>
  )
}

// ---- Bar chart (last 30 days) ----

function SolveBarChart({ dailyCounts }: { dailyCounts: DailySolveCount[] }) {
  const { bars, maxCount } = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const d of dailyCounts) {
      countMap.set(d.date, d.count)
    }

    const today = new Date()
    const result: { date: string; count: number; label: string }[] = []

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString("en-CA", {
        timeZone: "America/Los_Angeles",
      })
      const count = countMap.get(dateStr) ?? 0
      const label = d.toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short",
        day: "numeric",
      })
      result.push({ date: dateStr, count, label })
    }

    const max = Math.max(...result.map((r) => r.count), 1)
    return { bars: result, maxCount: max }
  }, [dailyCounts])

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Solves Per Day (Last 30 Days)</h3>
      <div className="flex items-end gap-[2px] h-40">
        {bars.map((bar) => {
          const height = bar.count > 0 ? Math.max((bar.count / maxCount) * 100, 4) : 0
          return (
            <div
              key={bar.date}
              className="flex-1 flex flex-col items-center justify-end h-full group"
            >
              <div className="relative w-full flex justify-center">
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                  <div className="bg-card border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                    <span className="font-mono font-medium">{bar.count}</span>
                    <span className="text-muted-foreground ml-1">{bar.label}</span>
                  </div>
                </div>
                <div
                  className="w-full rounded-t bg-emerald-500/70 hover:bg-emerald-500 transition-colors min-w-[4px]"
                  style={{ height: `${height}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {/* X-axis labels (every 5 days) */}
      <div className="flex gap-[2px]">
        {bars.map((bar, i) => (
          <div key={bar.date} className="flex-1 text-center">
            {i % 5 === 0 && (
              <span className="text-[9px] text-muted-foreground">{bar.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
