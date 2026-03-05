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
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Solve } from "@/lib/types"
import { getEffectiveTime } from "@/lib/timer/averages"

type DataPoint = {
  index: number
  time: number | null
  line1: number | null
  line2: number | null
}
type ChartScope = "session" | "all"

function formatTimeMs2(ms: number): string {
  if (ms === Infinity) return "DNF"
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) {
    return totalSeconds.toFixed(2)
  }
  const min = Math.floor(totalSeconds / 60)
  const sec = (totalSeconds % 60).toFixed(2).padStart(5, "0")
  return `${min}:${sec}`
}

function formatStatLabel(key: string): string {
  const n = Number.parseInt(key.slice(2), 10)
  if (!Number.isFinite(n) || n <= 0) return key
  if (key.startsWith("ao")) return `Avg ${n}`
  if (key.startsWith("mo")) return `Mean ${n}`
  return key
}

// Compute rolling moX/aoX values for chart lines.
function rollingStat(times: (number | null)[], key: string): (number | null)[] {
  const n = Number.parseInt(key.slice(2), 10)
  if (!Number.isFinite(n) || n <= 0) {
    return times.map(() => null)
  }

  const isMo = key.startsWith("mo")
  const result: (number | null)[] = []
  for (let i = 0; i < times.length; i++) {
    if (i < n - 1) {
      result.push(null)
      continue
    }
    const window = times.slice(i - n + 1, i + 1)
    if (isMo) {
      const numericWindow = window.filter((t): t is number => t !== null)
      if (numericWindow.length !== n) {
        result.push(null)
        continue
      }
      const moAvg = numericWindow.reduce((acc, t) => acc + t, 0) / n
      result.push(Math.round(moAvg))
      continue
    }

    const nums = window.map((t) => t ?? Infinity)
    const dnfCount = nums.filter((t) => t === Infinity).length
    if (dnfCount > 1) {
      result.push(null)
      continue
    }

    const sorted = [...nums].sort((a, b) => a - b)
    const trimmed = sorted.slice(1, -1)
    if (trimmed.some((t) => t === Infinity)) {
      result.push(null)
      continue
    }

    const aoAvg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
    result.push(Math.round(aoAvg))
  }
  return result
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; color: string; name: string }>
  label?: number
}) {
  if (active && payload && payload.length && label != null) {
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
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
                <span className="font-mono">{formatTimeMs2(entry.value)}</span>
              </span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

export function TimeTrendChart({
  solves,
  statCols = ["ao5", "ao200"],
  scope,
  onScopeChange,
}: {
  solves: Solve[]
  statCols?: [string, string]
  scope?: ChartScope
  onScopeChange?: (scope: ChartScope) => void
}) {
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set())
  const [line1Stat, line2Stat] = statCols
  const activeScope: ChartScope = scope === "all" ? "all" : "session"
  const line1Label = formatStatLabel(line1Stat)
  const line2Label = formatStatLabel(line2Stat)

  const chartData = useMemo<DataPoint[]>(() => {
    if (solves.length === 0) return []

    // Get effective times (null = DNF for chart purposes)
    const times = solves.map((s) => {
      const t = getEffectiveTime(s)
      return t === Infinity ? null : t
    })

    const line1Values = rollingStat(times, line1Stat)
    const line2Values = rollingStat(times, line2Stat)

    return times.map((time, i) => ({
      index: i + 1,
      time,
      line1: line1Values[i],
      line2: line2Values[i],
    }))
  }, [line1Stat, line2Stat, solves])

  if (solves.length === 0) {
    return (
      <Card className="h-full border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-foreground">Time Trend</CardTitle>
          {onScopeChange ? (
            <div className="flex gap-1">
              <Button
                variant={activeScope === "session" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onScopeChange("session")}
              >
                Session
              </Button>
              <Button
                variant={activeScope === "all" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onScopeChange("all")}
              >
                All Time
              </Button>
            </div>
          ) : null}
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
    <Card className="h-full border-border/50 bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="text-foreground">Time Trend</CardTitle>
        {onScopeChange ? (
          <div className="flex gap-1">
            <Button
              variant={activeScope === "session" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onScopeChange("session")}
            >
              Session
            </Button>
            <Button
              variant={activeScope === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onScopeChange("all")}
            >
              All Time
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-2 pb-2 pt-1">
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2A2A3C"
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  tick={{ fill: "#8B8BA3", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                  tickMargin={6}
                  minTickGap={18}
                  height={28}
                />
                <YAxis
                  tick={{ fill: "#8B8BA3", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatTimeMs2(Number(v))}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
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
                {!hiddenLines.has("line1") && (
                  <Line
                    type="monotone"
                    dataKey="line1"
                    name={line1Label}
                    stroke="#EF4444"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
                {!hiddenLines.has("line2") && (
                  <Line
                    type="monotone"
                    dataKey="line2"
                    name={line2Label}
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
          <div className="mt-1 flex items-center justify-center gap-3 whitespace-nowrap text-[11px] text-muted-foreground">
            {[
              { key: "time", label: "Time", color: "#6B7280" },
              { key: "line1", label: line1Label, color: "#EF4444" },
              { key: "line2", label: line2Label, color: "#3B82F6" },
            ].map((series) => {
              const hidden = hiddenLines.has(series.key)
              return (
                <button
                  key={series.key}
                  type="button"
                  onClick={() => toggleLine(series.key)}
                  className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity ${
                    hidden ? "opacity-35" : "opacity-100"
                  }`}
                  title={hidden ? `Show ${series.label}` : `Hide ${series.label}`}
                >
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: series.color }}
                  />
                  <span>{series.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
