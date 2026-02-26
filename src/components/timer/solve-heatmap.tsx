"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { Solve } from "@/lib/types"

type SolveHeatmapProps = {
  solves: Solve[]
  weeks?: number
}

function getDateStr(isoDate: string): string {
  const d = new Date(isoDate)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getIntensity(count: number): number {
  if (count === 0) return 0
  if (count <= 5) return 1
  if (count <= 15) return 2
  if (count <= 30) return 3
  return 4
}

const INTENSITY_CLASSES = [
  "bg-secondary/30",       // 0 — no solves
  "bg-indigo-900/60",      // 1 — 1-5 solves
  "bg-indigo-700/70",      // 2 — 6-15 solves
  "bg-indigo-500/80",      // 3 — 16-30 solves
  "bg-indigo-400",         // 4 — 31+ solves
]

export function SolveHeatmap({ solves, weeks = 16 }: SolveHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const { grid, monthLabels, todayCount, totalDays, activeDays } = useMemo(() => {
    // Build a map of date -> solve count
    const countMap = new Map<string, number>()
    for (const s of solves) {
      const key = getDateStr(s.solved_at)
      countMap.set(key, (countMap.get(key) ?? 0) + 1)
    }

    // Build grid: weeks × 7 days
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDay = today.getDay() // 0=Sun

    // Start from (weeks) weeks ago, aligned to Sunday
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - todayDay - (weeks - 1) * 7)

    const cols: Array<Array<{ date: string; count: number }>> = []
    const months: Array<{ label: string; col: number }> = []
    let lastMonth = -1
    let active = 0
    let total = 0

    const current = new Date(startDate)
    for (let w = 0; w < weeks; w++) {
      const col: Array<{ date: string; count: number }> = []
      for (let d = 0; d < 7; d++) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
        const count = countMap.get(dateStr) ?? 0

        // Only include if date is not in the future
        if (current <= today) {
          col.push({ date: dateStr, count })
          total++
          if (count > 0) active++
        } else {
          col.push({ date: dateStr, count: -1 }) // -1 = future, skip rendering
        }

        // Month label on first row
        if (d === 0 && current.getMonth() !== lastMonth) {
          lastMonth = current.getMonth()
          months.push({ label: MONTH_LABELS[lastMonth], col: w })
        }

        current.setDate(current.getDate() + 1)
      }
      cols.push(col)
    }

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    return {
      grid: cols,
      monthLabels: months,
      todayCount: countMap.get(todayStr) ?? 0,
      totalDays: total,
      activeDays: active,
    }
  }, [solves, weeks])

  if (solves.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs text-muted-foreground font-medium">Solve Activity</h4>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Today: <span className="font-mono font-medium text-foreground">{todayCount}</span></span>
          <span>{activeDays}/{totalDays}d active</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="relative overflow-hidden">
        <div className="flex gap-px pl-0" style={{ height: 12 }}>
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="text-[9px] text-muted-foreground/60 absolute"
              style={{ left: m.col * 11 }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-px">
          {grid.map((col, w) => (
            <div key={w} className="flex flex-col gap-px">
              {col.map((cell, d) => (
                <div
                  key={d}
                  className={cn(
                    "w-2.5 h-2.5 rounded-[2px] transition-colors",
                    cell.count === -1 ? "opacity-0" : INTENSITY_CLASSES[getIntensity(cell.count)]
                  )}
                  onMouseEnter={(e) => {
                    if (cell.count < 0) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 4,
                      text: `${cell.date}: ${cell.count} solve${cell.count !== 1 ? "s" : ""}`,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[9px] text-muted-foreground/50">Less</span>
          {INTENSITY_CLASSES.map((cls, i) => (
            <div key={i} className={cn("w-2 h-2 rounded-[1px]", cls)} />
          ))}
          <span className="text-[9px] text-muted-foreground/50">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-[10px] bg-background border border-border rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
