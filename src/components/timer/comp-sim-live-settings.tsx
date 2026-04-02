"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  COMP_SIM_SCENE_LABELS,
  formatCompSimTimeInput,
  normalizeCompSimConfig,
  parseCompSimTimeInput,
  type CompSimRoundConfig,
  type CompSimScene,
} from "@/lib/timer/comp-sim-round"

const SCENE_OPTIONS = Object.entries(COMP_SIM_SCENE_LABELS) as Array<[CompSimScene, string]>

export function LiveSettingsPopover({
  config,
  onChange,
}: {
  config: CompSimRoundConfig
  onChange: (config: CompSimRoundConfig) => void
}) {
  const [waitMinInput, setWaitMinInput] = useState(
    formatCompSimTimeInput(config.waitTimeRangeMs.minMs)
  )
  const [waitMaxInput, setWaitMaxInput] = useState(
    formatCompSimTimeInput(config.waitTimeRangeMs.maxMs)
  )

  function update(next: Partial<CompSimRoundConfig>) {
    onChange(normalizeCompSimConfig({ ...config, ...next }))
  }

  function handleWaitChange(bound: "min" | "max", raw: string) {
    if (bound === "min") setWaitMinInput(raw)
    else setWaitMaxInput(raw)

    const parsed = parseCompSimTimeInput(raw)
    if (parsed == null) return

    const nextRange =
      bound === "min"
        ? { minMs: parsed, maxMs: Math.max(parsed, config.waitTimeRangeMs.maxMs) }
        : { minMs: Math.min(config.waitTimeRangeMs.minMs, parsed), maxMs: parsed }
    update({ waitTimeRangeMs: nextRange })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:text-foreground"
          title="Round settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-80 space-y-4"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Live Settings
        </p>

        {/* Scene */}
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Crowd Scene</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SCENE_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => update({ scene: value })}
                className={cn(
                  "min-h-9 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors",
                  config.scene === value
                    ? "border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Intensity</span>
            <span className="font-mono text-foreground">{config.intensity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={config.intensity}
            onChange={(e) => update({ intensity: Number(e.target.value) })}
            className="w-full accent-fuchsia-400"
          />
        </div>

        {/* Random Reactions */}
        <button
          onClick={() => update({ randomReactionsEnabled: !config.randomReactionsEnabled })}
          className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-left"
        >
          <span className="text-sm font-semibold text-foreground">Random Reactions</span>
          <span
            className={cn(
              "inline-flex h-5 w-10 rounded-full border p-0.5 transition-colors",
              config.randomReactionsEnabled
                ? "border-emerald-400/60 bg-emerald-500/20"
                : "border-border bg-background"
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full bg-white transition-transform",
                config.randomReactionsEnabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </span>
        </button>

        {/* Wait Between Solves */}
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Wait Between Solves</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Min
              </span>
              <input
                value={waitMinInput}
                onChange={(e) => handleWaitChange("min", e.target.value)}
                onBlur={() => setWaitMinInput(formatCompSimTimeInput(config.waitTimeRangeMs.minMs))}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-cyan-400/70"
                placeholder="0:30"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Max
              </span>
              <input
                value={waitMaxInput}
                onChange={(e) => handleWaitChange("max", e.target.value)}
                onBlur={() => setWaitMaxInput(formatCompSimTimeInput(config.waitTimeRangeMs.maxMs))}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-cyan-400/70"
                placeholder="2:30"
              />
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
