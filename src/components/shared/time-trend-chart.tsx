"use client"

import { useMemo, useState } from "react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Solve } from "@/lib/types"
import { getEffectiveTime, formatTimeMs } from "@/lib/timer/averages"

type DataPoint = {
  index: number
  time: number | null
  ao5: number | null
  ao200: number | null
}

/**
 * Compute a rolling trimmed average of N at each position.
 * Returns null until there are N solves. Uses the standard AoN trim
 * (drop best and worst, average the rest). Returns null if >1 DNF in window.
 */
function rollingAoN(times: (number | null)[], n: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < times.length; i++) {
    if (i < n - 1) {
      result.push(null)
      continue
    }
    const window = times.slice(i - n + 1, i + 1)
    const dnfCount = window.filter((t) => t === null).length
    if (dnfCount > 1) {
      result.push(null)
      continue
    }
    // Replace DNF with Infinity for sorting
    const nums = window.map((t) => t ?? Infinity)
    const sorted = [...nums].sort((a, b) => a - b)
    const trimmed = sorted.slice(1, -1)
    if (trimmed.some((t) => t === Infinity)) {
      result.push(null)
      continue
    }
    const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
    result.push(Math.round(avg))
  }
  return result
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ dataKey: string; value: number | null; color: string; name: string }>
  label?: number
}) {
  if (active && payload && payload.length && label != null) {
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-medium text-foreground">Solve #{label}</p>
        {payload.map((entry) => {
          if (entry.value == null) return null
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name}:{" "}
                <span className="font-mono">{formatTimeMs(entry.value)}</span>
              </span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

export function TimeTrendChart({ solves }: { solves: Solve[] }) {
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set())

  const chartData = useMemo<DataPoint[]>(() => {
    if (solves.length === 0) return []

    // Get effective times (null = DNF for chart purposes)
    const times = solves.map((s) => {
      const t = getEffectiveTime(s)
      return t === Infinity ? null : t
    })

    const ao5Values = rollingAoN(times, 5)
    const ao200Values = rollingAoN(times, 200)

    return times.map((time, i) => ({
      index: i + 1,
      time,
      ao5: ao5Values[i],
      ao200: ao200Values[i],
    }))
  }, [solves])

  if (solves.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Time Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No individual solve data yet. Use the built-in timer to start tracking!
          </p>
        </CardContent>
      </Card>
    )
  }

  const toggleLine = (dataKey: string) => {
    setHiddenLines((prev) => {
      const next = new Set(prev)
      if (next.has(dataKey)) {
        next.delete(dataKey)
      } else {
        next.add(dataKey)
      }
      return next
    })
  }

  // Determine a reasonable tick interval for the X axis
  const tickInterval = Math.max(1, Math.floor(chartData.length / 10)) - 1

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Time Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A3C"
                vertical={false}
              />
              <XAxis
                dataKey="index"
                tick={{ fill: "#8B8BA3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
                label={{
                  value: "Solve #",
                  position: "insideBottom",
                  offset: -5,
                  fill: "#8B8BA3",
                  fontSize: 11,
                }}
              />
              <YAxis
                tick={{ fill: "#8B8BA3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatTimeMs(v)}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                onClick={(e) => {
                  if (e && e.dataKey) toggleLine(e.dataKey as string)
                }}
                wrapperStyle={{ cursor: "pointer", fontSize: 12 }}
              />
              {!hiddenLines.has("time") && (
                <Bar
                  dataKey="time"
                  name="Time"
                  fill="#6B7280"
                  opacity={0.4}
                  maxBarSize={4}
                  isAnimationActive={false}
                />
              )}
              {!hiddenLines.has("ao5") && (
                <Line
                  type="monotone"
                  dataKey="ao5"
                  name="Ao5"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {!hiddenLines.has("ao200") && (
                <Line
                  type="monotone"
                  dataKey="ao200"
                  name="Ao200"
                  stroke="#3B82F6"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
