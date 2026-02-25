"use client"

import { formatTimeMs } from "@/lib/timer/averages"
import type { SessionStats } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"

type StatsPanelProps = {
  stats: SessionStats
  mode: "normal" | "comp_sim"
  currentCompSimProgress?: { current: number; total: number }
}

export function StatsPanel({
  stats,
  mode,
  currentCompSimProgress,
}: StatsPanelProps) {
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Session Stats
        </h3>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {stats.count} solve{stats.count !== 1 ? "s" : ""}
        </span>
      </div>

      {mode === "comp_sim" && currentCompSimProgress && (
        <div className="rounded-md bg-secondary/50 p-2 text-center">
          <span className="text-xs text-muted-foreground">Current Ao5: </span>
          <span className="text-sm font-mono font-medium tabular-nums">
            Solve {currentCompSimProgress.current}/
            {currentCompSimProgress.total}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Best" value={stats.best} />
        <StatCard label="Worst" value={stats.worst} />
        <StatCard label="Mean" value={stats.mean} />
        <StatCard
          label="Ao5"
          value={stats.ao5}
          highlight={stats.count >= 5}
        />
        <StatCard
          label="Ao12"
          value={stats.ao12}
          highlight={stats.count >= 12}
        />
        <StatCard label="Ao50" value={stats.ao50} />
        <StatCard label="Ao100" value={stats.ao100} />
        <StatCard label="Best Ao5" value={stats.bestAo5} accent />
        <StatCard label="Best Ao12" value={stats.bestAo12} accent />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
  accent,
}: {
  label: string
  value: number | null
  highlight?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/50 bg-card p-2",
        highlight && "border-primary/30",
        accent && "border-accent/30"
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-sm tabular-nums font-medium",
          value === null && "text-muted-foreground/50"
        )}
      >
        {value !== null ? formatTimeMs(value) : "–"}
      </p>
    </div>
  )
}
