"use client"

import type { CompSimRoundConfig } from "@/lib/timer/comp-sim-round"
import { CompSimSettingsPanel } from "@/components/timer/comp-sim-settings-panel"

type Props = {
  config: CompSimRoundConfig
  onConfigChange: (config: CompSimRoundConfig) => void
  onStart: () => void
}

export function CompSimHero({ config, onConfigChange, onStart }: Props) {
  return (
    <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(10,12,18,0.96))] px-4 py-5 sm:px-5 lg:px-6">
      <CompSimSettingsPanel
        config={config}
        onChange={onConfigChange}
        onStart={onStart}
        title="Train the round, not just the solve"
        description="Launch competition-style attempts with real round formats, cutoffs, cumulative time pressure, and a configurable crowd mix. This runs separately from your normal timer sessions and saves dedicated Comp Sim tracking."
        startLabel="Start Competition Simulation"
      />
    </div>
  )
}
