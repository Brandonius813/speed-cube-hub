"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { STAT_OPTIONS } from "@/lib/timer/stats"

export const TREND_STAT_OPTIONS = STAT_OPTIONS

export function formatStatLabel(key: string): string {
  const n = Number.parseInt(key.slice(2), 10)
  if (!Number.isFinite(n) || n <= 0) return key
  if (key.startsWith("ao")) return `Avg ${n}`
  if (key.startsWith("mo")) return `Mean ${n}`
  return key
}

export function TrendLegendBar({
  series,
  embedded = false,
}: {
  series: Array<{
    key: "time" | "line1" | "line2"
    label: string
    color: string
    hidden: boolean
    onToggle: () => void
    pickerStat?: string
    onChangeStat?: (next: string) => void
  }>
  embedded?: boolean
}) {
  const baseClass = embedded
    ? "mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px]"
    : "mt-1 flex items-center justify-center gap-3 whitespace-nowrap text-[11px] text-muted-foreground"

  return (
    <div className={baseClass}>
      {series.map((entry) => (
        <LegendItem key={entry.key} entry={entry} embedded={embedded} />
      ))}
    </div>
  )
}

function LegendItem({
  entry,
  embedded,
}: {
  entry: {
    key: "time" | "line1" | "line2"
    label: string
    color: string
    hidden: boolean
    onToggle: () => void
    pickerStat?: string
    onChangeStat?: (next: string) => void
  }
  embedded: boolean
}) {
  const swatchClass = embedded
    ? "h-2 w-2 rounded-full"
    : "h-2 w-2 rounded-sm"

  const hiddenStyle = entry.hidden
    ? embedded
      ? "line-through opacity-60"
      : ""
    : ""

  const containerClass = embedded
    ? `inline-flex items-center gap-1 text-muted-foreground hover:text-foreground ${hiddenStyle}`
    : `inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity ${
        entry.hidden ? "opacity-35" : "opacity-100"
      }`

  if (!entry.pickerStat || !entry.onChangeStat) {
    return (
      <button
        type="button"
        onClick={entry.onToggle}
        className={containerClass}
        title={entry.hidden ? `Show ${entry.label}` : `Hide ${entry.label}`}
      >
        <span
          className={swatchClass}
          style={{ backgroundColor: entry.color }}
        />
        <span>{entry.label}</span>
      </button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={containerClass}>
          <span
            className={swatchClass}
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="center">
        <button
          type="button"
          onClick={entry.onToggle}
          className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary/60"
        >
          <span>{entry.hidden ? "Show on chart" : "Hide on chart"}</span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.hidden ? "#4B5563" : entry.color }}
          />
        </button>
        <div className="my-1 border-t border-border/30" />
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Show stat
        </p>
        <div className="max-h-[220px] overflow-y-auto">
          {TREND_STAT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => entry.onChangeStat?.(opt)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors ${
                entry.pickerStat === opt
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground hover:bg-secondary/50"
              }`}
            >
              <span>{formatStatLabel(opt)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {opt}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
