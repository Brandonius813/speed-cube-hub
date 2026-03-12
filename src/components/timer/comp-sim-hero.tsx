"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Play, SlidersHorizontal } from "lucide-react"
import type { CompSimRoundConfig } from "@/lib/timer/comp-sim-round"
import { CompSimSettingsPanel } from "@/components/timer/comp-sim-settings-panel"
import {
  formatCompSimConstraintSummary,
  getCompSimSceneLabel,
} from "@/lib/timer/comp-sim-round"
import { cn } from "@/lib/utils"

type Props = {
  config: CompSimRoundConfig
  onConfigChange: (config: CompSimRoundConfig) => void
  onStart: () => void
}

export function CompSimHero({ config, onConfigChange, onStart }: Props) {
  const [expanded, setExpanded] = useState(false)
  const roundSummary = formatCompSimConstraintSummary(config).join(" • ")
  const noiseSummary =
    config.scene === "off"
      ? "Silent room"
      : `${getCompSimSceneLabel(config.scene)} at ${config.intensity}%`
  const atmosphereSummary = [
    config.randomReactionsEnabled ? "Random reactions on" : "Random reactions off",
    config.judgeCuesEnabled ? "Judge calls on" : "Judge calls off",
  ].join(" • ")

  return (
    <div
      data-onboarding-target="comp-sim-hero"
      className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(10,12,18,0.96))] px-4 py-3 sm:px-5 lg:px-6"
    >
      <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-border/70 bg-card/90 p-4 shadow-xl sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Competition Simulator
            </p>
            <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              Train the round without losing the timer
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Run WCA-style formats, cutoffs, cumulative time limits, and crowd pressure in a
              separate Comp Sim session.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              data-onboarding-target="comp-sim-customize"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-cyan-400/50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {expanded ? "Hide Full Setup" : "Customize Comp Sim"}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              data-onboarding-target="comp-sim-start"
              onClick={onStart}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 px-4 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.01]"
            >
              <Play className="h-4 w-4 fill-current" />
              Start Competition Simulation
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
          <SummaryChip label="Round" value={roundSummary} accent="cyan" />
          <SummaryChip label="Crowd" value={noiseSummary} accent="fuchsia" />
          <SummaryChip label="Atmosphere" value={atmosphereSummary} accent="emerald" />
          <SummaryChip
            label="Tracking"
            value="Saved separately from normal sessions"
            accent="amber"
            className="md:col-span-3 xl:col-span-1"
          />
        </div>

        {expanded && (
          <CompSimSettingsPanel
            config={config}
            onChange={onConfigChange}
            onStart={onStart}
            title="Build the exact pressure you want"
            description="Fine-tune format, crowd scene, cutoff pressure, and cumulative time before you launch the round."
            startLabel="Start Competition Simulation"
            className="mt-4"
          />
        )}
      </div>
    </div>
  )
}

function SummaryChip({
  label,
  value,
  accent,
  className,
}: {
  label: string
  value: string
  accent: "cyan" | "fuchsia" | "emerald" | "amber"
  className?: string
}) {
  const accentClassName =
    accent === "cyan"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
      : accent === "fuchsia"
        ? "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100"
        : accent === "emerald"
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
          : "border-amber-400/25 bg-amber-400/10 text-amber-100"

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-background/70 px-4 py-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 rounded-xl border px-3 py-2 text-sm font-medium", accentClassName)}>
        {value}
      </p>
    </div>
  )
}
