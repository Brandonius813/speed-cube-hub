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
type HistogramBucket = {
  tickLabel: string
  tooltipLabel: string
  count: number
  cumulative: number
  percent: number
}

const TARGET_BIN_COUNT = 12

function getIntervalDecimals(bucketSize: number): number {
  if (bucketSize >= 10) return 0
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

function getPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 1) return sortedValues[0]

  const index = (sortedValues.length - 1) * percentile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex]

  const weight = index - lowerIndex
  return (
    sortedValues[lowerIndex] +
    (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight
  )
}

function snapBucketSize(rawSize: number): number {
  if (!Number.isFinite(rawSize) || rawSize <= 0) return 0.1

  const exponent = Math.floor(Math.log10(rawSize))
  const base = 10 ** exponent

  for (const multiplier of [1, 2, 5, 10]) {
    const candidate = multiplier * base
    if (candidate >= rawSize) return candidate
  }

  return 10 ** (exponent + 1)
}

function buildHistogram(times: number[]): HistogramBucket[] {
  if (times.length === 0) return []

  const sortedTimes = [...times].sort((a, b) => a - b)
  const minTime = sortedTimes[0]
  const maxTime = sortedTimes[sortedTimes.length - 1]
  const q1 = getPercentile(sortedTimes, 0.25)
  const q3 = getPercentile(sortedTimes, 0.75)
  const iqr = q3 - q1

  let coreMin = minTime
  let coreMax = maxTime

  if (iqr > 0) {
    const nextCoreMin = Math.max(minTime, q1 - 1.5 * iqr)
    const nextCoreMax = Math.min(maxTime, q3 + 1.5 * iqr)
    if (Number.isFinite(nextCoreMin) && Number.isFinite(nextCoreMax) && nextCoreMax > nextCoreMin) {
      coreMin = nextCoreMin
      coreMax = nextCoreMax
    }
  }

  const bucketSize = snapBucketSize((coreMax - coreMin) / TARGET_BIN_COUNT)
  const intervalDecimals = getIntervalDecimals(bucketSize)
  const binCount = coreMax > coreMin
    ? Math.max(1, Math.ceil((coreMax - coreMin) / bucketSize))
    : 1
  const counts = Array.from({ length: binCount }, () => 0)
  let lowOverflow = 0
  let highOverflow = 0

  for (const time of sortedTimes) {
    if (time < coreMin) {
      lowOverflow += 1
      continue
    }
    if (time > coreMax) {
      highOverflow += 1
      continue
    }

    const index = coreMax > coreMin
      ? Math.min(binCount - 1, Math.floor((time - coreMin) / bucketSize))
      : 0
    counts[index] += 1
  }

  const total = sortedTimes.length
  const buckets: HistogramBucket[] = []
  let cumulative = 0

  if (lowOverflow > 0) {
    cumulative += lowOverflow
    buckets.push({
      tickLabel: `< ${formatIntervalBoundary(coreMin, intervalDecimals)}`,
      tooltipLabel: `< ${formatIntervalBoundary(coreMin, intervalDecimals)}`,
      count: lowOverflow,
      cumulative,
      percent: (lowOverflow / total) * 100,
    })
  }

  for (let index = 0; index < binCount; index += 1) {
    const start = coreMin + index * bucketSize
    const end = coreMax > coreMin
      ? Math.min(coreMax, start + bucketSize)
      : start + bucketSize
    const count = counts[index]
    cumulative += count

    buckets.push({
      tickLabel: formatIntervalBoundary(start, intervalDecimals),
      tooltipLabel: `${formatIntervalBoundary(start, intervalDecimals)}-${formatIntervalBoundary(end, intervalDecimals)}`,
      count,
      cumulative,
      percent: (count / total) * 100,
    })
  }

  if (highOverflow > 0) {
    cumulative += highOverflow
    buckets.push({
      tickLabel: `> ${formatIntervalBoundary(coreMax, intervalDecimals)}`,
      tooltipLabel: `> ${formatIntervalBoundary(coreMax, intervalDecimals)}`,
      count: highOverflow,
      cumulative,
      percent: (highOverflow / total) * 100,
    })
  }

  return buckets
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    value: number
    dataKey: string
    payload: HistogramBucket
  }>
}) {
  if (active && payload && payload.length) {
    const entry = payload[0]
    const bucket = entry.payload
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-medium text-foreground">{bucket.tooltipLabel}</p>
        <p className="text-muted-foreground font-mono">
          {bucket.count} solve{bucket.count !== 1 ? "s" : ""} ({bucket.percent.toFixed(1)}%)
        </p>
        {entry.dataKey === "cumulative" ? (
          <p className="text-muted-foreground font-mono">
            {bucket.cumulative} cumulative
          </p>
        ) : null}
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
    const times = solves
      .map(getEffectiveTime)
      .filter((t) => t !== Infinity)
      .map((t) => t / 1000)

    return buildHistogram(times)
  }, [solves])

  if (chartData.length === 0) {
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
                dataKey="tickLabel"
                tick={{ fill: "#8B8BA3", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={10}
                height={24}
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
    <Card className="border-border/50 bg-card">
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
      <CardContent>
        <div className="h-[260px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A3C"
                vertical={false}
              />
              <XAxis
                dataKey="tickLabel"
                tick={{ fill: "#8B8BA3", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={14}
                height={28}
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
