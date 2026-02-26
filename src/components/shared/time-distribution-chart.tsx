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
import { getEffectiveTime, formatTimeMs } from "@/lib/timer/averages"

type DisplayMode = "frequency" | "cumulative"

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

export function TimeDistributionChart({ solves }: { solves: Solve[] }) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("frequency")

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

    const bucketStart = Math.floor(min / bucketSize) * bucketSize
    const bucketEnd = Math.ceil(max / bucketSize) * bucketSize

    const buckets: { label: string; count: number; cumulative: number }[] = []
    let cumulative = 0

    for (let start = bucketStart; start < bucketEnd; start += bucketSize) {
      const end = start + bucketSize
      const count = times.filter((t) => t >= start && t < end).length
      cumulative += count

      // Format label — show seconds nicely
      const startLabel = formatTimeMs(start * 1000)
      const endLabel = formatTimeMs(end * 1000)
      buckets.push({
        label: `${startLabel}–${endLabel}`,
        count,
        cumulative,
      })
    }

    return buckets
  }, [solves])

  if (solves.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Time Distribution</CardTitle>
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

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-foreground">Time Distribution</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={displayMode === "frequency" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setDisplayMode("frequency")}
          >
            Count
          </Button>
          <Button
            variant={displayMode === "cumulative" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setDisplayMode("cumulative")}
          >
            Cumulative
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
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
