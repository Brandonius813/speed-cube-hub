"use client"

import { useMemo, useState } from "react"
import {
  BarChart,
  Bar,
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

type DisplayMode = "frequency" | "cumulative"
type ChartScope = "session" | "all"

function getIntervalDecimals(bucketSize: number): number {
  if (bucketSize >= 1) return 0
  if (bucketSize >= 0.1) return 1
  return 2
}

function formatIntervalBoundary(seconds: number, decimals: number): string {
  if (seconds < 60) {
    return decimals === 0 ? String(Math.round(seconds)) : seconds.toFixed(decimals)
  }

  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (decimals === 0) {
    return `${min}:${Math.round(sec).toString().padStart(2, "0")}`
  }
  return `${min}:${sec.toFixed(decimals).padStart(decimals + 3, "0")}`
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
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-medium text-foreground">{label}</p>
        <p className="text-muted-foreground font-mono">
          {payload[0].value} solve{payload[0].value !== 1 ? "s" : ""}
        </p>
      </div>
    )
  }
  return null
}

export function TimeDistributionChart({
  solves,
  scope,
  embedded = false,
  onScopeChange,
}: {
  solves: Solve[]
  scope?: ChartScope
  embedded?: boolean
  onScopeChange?: (scope: ChartScope) => void
}) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("frequency")
  const activeScope: ChartScope = scope === "all" ? "all" : "session"

  const chartData = useMemo(() => {
    // Filter out DNFs and get effective times
    const times = solves
      .map(getEffectiveTime)
      .filter((t) => t !== Infinity)
      .map((t) => t / 1000) // Convert ms to seconds

    if (times.length === 0) return []

    const min = Math.min(...times)
    const max = Math.max(...times)
    const range = max - min

    // Adaptive bucket size based on time range
    let bucketSize: number
    if (range <= 5) bucketSize = 0.5
    else if (range <= 15) bucketSize = 1
    else if (range <= 60) bucketSize = 2
    else if (range <= 180) bucketSize = 5
    else bucketSize = 10

    const intervalDecimals = getIntervalDecimals(bucketSize)
    const bucketStart = Math.floor(min / bucketSize) * bucketSize
    const bucketEnd = Math.ceil(max / bucketSize) * bucketSize

    const buckets: { label: string; count: number; cumulative: number }[] = []
    let cumulative = 0

    for (let start = bucketStart; start < bucketEnd; start += bucketSize) {
      const end = start + bucketSize
      const count = times.filter((t) => t >= start && t < end).length
      cumulative += count

      const startLabel = formatIntervalBoundary(start, intervalDecimals)
      const endLabel = formatIntervalBoundary(end, intervalDecimals)
      buckets.push({
        label: `${startLabel}–${endLabel}`,
        count,
        cumulative,
      })
    }

    return buckets
  }, [solves])

  if (solves.length === 0) {
    if (embedded) {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-1 flex items-center justify-end gap-1">
            {onScopeChange ? (
              <>
                <Button
                  variant={activeScope === "session" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => onScopeChange("session")}
                >
                  Session
                </Button>
                <Button
                  variant={activeScope === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => onScopeChange("all")}
                >
                  All Time
                </Button>
              </>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-border/50 bg-card px-3 text-center text-sm text-muted-foreground">
            No solve data yet.
          </div>
        </div>
      )
    }
    return (
      <Card className="h-full border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-foreground">Time Distribution</CardTitle>
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

  const dataKey = displayMode === "frequency" ? "count" : "cumulative"

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-1 flex items-center justify-end gap-1">
          {onScopeChange ? (
            <>
              <Button
                variant={activeScope === "session" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => onScopeChange("session")}
              >
                Session
              </Button>
              <Button
                variant={activeScope === "all" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => onScopeChange("all")}
              >
                All Time
              </Button>
            </>
          ) : null}
          <Button
            variant={displayMode === "frequency" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setDisplayMode("frequency")}
          >
            Count
          </Button>
          <Button
            variant={displayMode === "cumulative" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setDisplayMode("cumulative")}
          >
            Cumulative
          </Button>
        </div>
        <div className="min-h-0 flex-1 rounded-md border border-border/50 bg-card px-1 pb-1 pt-2">
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
                angle={-20}
                textAnchor="end"
                height={34}
              />
              <YAxis
                tick={{ fill: "#8B8BA3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={34}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={dataKey}
                fill="#22D3EE"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full border-border/50 bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-foreground">Time Distribution</CardTitle>
        <div className="flex items-center gap-1">
          {onScopeChange ? (
            <>
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
            </>
          ) : null}
          <Button
            variant={displayMode === "frequency" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDisplayMode("frequency")}
          >
            Count
          </Button>
          <Button
            variant={displayMode === "cumulative" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDisplayMode("cumulative")}
          >
            Cumulative
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="h-full">
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
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: "#8B8BA3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={dataKey}
                fill="#22D3EE"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
