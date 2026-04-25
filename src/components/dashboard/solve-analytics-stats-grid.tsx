"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"
import type { RangeSummaryStats } from "@/lib/timer/range-stats"

type Cell = {
  label: string
  value: string
  highlight?: boolean
}

function fmtTime(ms: number | null): string {
  if (ms === null) return "—"
  return formatTimeMsCentiseconds(ms)
}

function fmtCount(n: number): string {
  return n.toLocaleString("en-US")
}

function fmtPercent(p: number): string {
  if (!Number.isFinite(p)) return "—"
  return `${p.toFixed(1)}%`
}

function buildCells(stats: RangeSummaryStats): Cell[] {
  const ao12Std = stats.ao12StdDev
  const ao5Std = stats.ao5StdDev
  const stdLabel = ao12Std !== null ? "σ (Ao12)" : "σ (Ao5)"
  const stdValue = ao12Std !== null ? ao12Std : ao5Std

  return [
    { label: "Solves", value: fmtCount(stats.count) },
    { label: "Sessions", value: fmtCount(stats.sessions) },
    { label: "Best", value: fmtTime(stats.best), highlight: true },
    { label: "Mean", value: fmtTime(stats.mean) },
    { label: "Ao5 (current)", value: fmtTime(stats.ao5) },
    { label: "Best Ao5", value: fmtTime(stats.bestAo5), highlight: true },
    { label: "Ao12 (current)", value: fmtTime(stats.ao12) },
    { label: "Best Ao12", value: fmtTime(stats.bestAo12), highlight: true },
    { label: "DNF %", value: fmtPercent(stats.dnfRate) },
    { label: stdLabel, value: fmtTime(stdValue) },
  ]
}

export function SolveAnalyticsStatsGrid({
  stats,
  rangeLabel,
}: {
  stats: RangeSummaryStats
  rangeLabel: string
}) {
  const cells = buildCells(stats)

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Summary
          </p>
          <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {cells.map((cell) => (
            <div
              key={cell.label}
              className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border/40 bg-secondary/30 px-2.5 py-2 sm:px-3 sm:py-2.5"
            >
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                {cell.label}
              </p>
              <p
                className={`truncate font-mono text-base font-bold sm:text-lg ${
                  cell.highlight ? "text-primary" : "text-foreground"
                }`}
              >
                {cell.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
