"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { Solve } from "@/lib/types"

type GroupMode = "daily" | "weekly" | "monthly"

function getDateStr(isoDate: string): string {
  const d = new Date(isoDate)
  // YYYY-MM-DD in local time
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getGroupMode(solves: Solve[]): GroupMode {
  if (solves.length === 0) return "daily"
  const dates = solves.map((s) => new Date(getDateStr(s.solved_at) + "T00:00:00").getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const daySpan = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1
  if (daySpan <= 31) return "daily"
  if (daySpan <= 90) return "weekly"
  return "monthly"
}

function getGroupSortKey(dateStr: string, mode: GroupMode): number {
  const date = new Date(dateStr + "T00:00:00")
  if (mode === "daily") return date.getTime()
  if (mode === "weekly") {
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay())
    return start.getTime()
  }
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

function getGroupKey(dateStr: string, mode: GroupMode): string {
  const date = new Date(dateStr + "T00:00:00")
  if (mode === "daily") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return `${date.getMonth() + 1}/${date.getDate()} ${dayNames[date.getDay()]}`
  }
  if (mode === "weekly") {
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay())
    return `${start.getMonth() + 1}/${start.getDate()}`
  }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (active && payload && payload.length) {
    const count = payload[0].value
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-muted-foreground">
          {count} solve{count !== 1 ? "s" : ""}
        </p>
      </div>
    )
  }
  return null
}

export function DailySolveChart({ solves }: { solves: Solve[] }) {
  const { chartData, title } = useMemo(() => {
    if (solves.length === 0) return { chartData: [], title: "Daily Solve Count" }

    const mode = getGroupMode(solves)
    const titleMap: Record<GroupMode, string> = {
      daily: "Daily Solve Count",
      weekly: "Weekly Solve Count",
      monthly: "Monthly Solve Count",
    }

    // Group solves by time period
    const groups: Record<string, number> = {}
    const groupSortKeys: Record<string, number> = {}

    for (const s of solves) {
      const dateStr = getDateStr(s.solved_at)
      const key = getGroupKey(dateStr, mode)
      if (!groups[key]) {
        groups[key] = 0
        groupSortKeys[key] = getGroupSortKey(dateStr, mode)
      }
      groups[key]++
    }

    const sortedKeys = Object.keys(groups).sort(
      (a, b) => groupSortKeys[a] - groupSortKeys[b]
    )

    const data = sortedKeys.map((key) => ({
      label: key,
      count: groups[key],
    }))

    return { chartData: data, title: titleMap[mode] }
  }, [solves])

  if (solves.length === 0) return null

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs text-muted-foreground font-medium px-1">{title}</h4>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2A2A3C"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8B8BA3", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#8B8BA3", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="#6366F1"
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
