"use client"

import { Volume2, Mic2, TimerReset } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  COMP_SIM_FORMAT_LABELS,
  COMP_SIM_SCENE_LABELS,
  formatCompSimTimeInput,
  normalizeCompSimConfig,
  parseCompSimTimeInput,
  type CompSimFormat,
  type CompSimRoundConfig,
  type CompSimScene,
} from "@/lib/timer/comp-sim-round"

type Props = {
  config: CompSimRoundConfig
  onChange: (config: CompSimRoundConfig) => void
  onStart?: () => void
  title: string
  description: string
  className?: string
  startLabel?: string
}

const FORMAT_OPTIONS = Object.entries(COMP_SIM_FORMAT_LABELS) as Array<
  [CompSimFormat, string]
>
const SCENE_OPTIONS = Object.entries(COMP_SIM_SCENE_LABELS) as Array<
  [CompSimScene, string]
>

export function CompSimSettingsPanel({
  config,
  onChange,
  onStart,
  title,
  description,
  className,
  startLabel = "Start Comp Sim",
}: Props) {
  function update(next: Partial<CompSimRoundConfig>) {
    onChange(normalizeCompSimConfig({ ...config, ...next }))
  }

  function updateCutoff(enabled: boolean) {
    if (!enabled) {
      update({ cutoff: null })
      return
    }
    update({
      cutoff: {
        attempt: config.cutoff?.attempt ?? 1,
        cutoffMs: config.cutoff?.cutoffMs ?? 15000,
      },
    })
  }

  return (
    <div className={cn("rounded-3xl border border-border/70 bg-card/90 p-5 shadow-xl", className)}>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          Competition Simulator
        </p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TimerReset className="h-4 w-4 text-cyan-300" />
              Round Format
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => update({ format: value })}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    config.format === value
                      ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-100"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TimerReset className="h-4 w-4 text-amber-300" />
              Competition Constraints
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cumulative Time Limit</p>
                    <p className="text-xs text-muted-foreground">Counts official attempt time only.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (config.cumulativeTimeLimitMs == null) {
                        update({ cumulativeTimeLimitMs: 60000 })
                      } else {
                        update({ cumulativeTimeLimitMs: null })
                      }
                    }}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.14em]",
                      config.cumulativeTimeLimitMs != null
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {config.cumulativeTimeLimitMs != null ? "On" : "Off"}
                  </button>
                </div>
                {config.cumulativeTimeLimitMs != null && (
                  <div className="mt-3">
                    <input
                      key={`time-limit-${config.cumulativeTimeLimitMs ?? "off"}`}
                      defaultValue={formatCompSimTimeInput(config.cumulativeTimeLimitMs)}
                      onChange={(event) => {
                        const parsed = parseCompSimTimeInput(event.target.value)
                        if (parsed != null) {
                          update({ cumulativeTimeLimitMs: parsed })
                        }
                      }}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-cyan-400/70"
                      placeholder="e.g. 10:00"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cutoff</p>
                    <p className="text-xs text-muted-foreground">
                      Disabled for single-attempt rounds.
                    </p>
                  </div>
                  <button
                    disabled={config.format === "single"}
                    onClick={() => updateCutoff(config.cutoff == null)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.14em]",
                      config.format === "single" && "cursor-not-allowed opacity-40",
                      config.cutoff != null
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {config.cutoff != null ? "On" : "Off"}
                  </button>
                </div>
                {config.cutoff != null && config.format !== "single" && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2].map((attempt) => (
                        <button
                          key={attempt}
                          onClick={() =>
                            update({
                              cutoff: {
                                attempt: attempt as 1 | 2,
                                cutoffMs: config.cutoff?.cutoffMs ?? 15000,
                              },
                            })
                          }
                          className={cn(
                            "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                            config.cutoff?.attempt === attempt
                              ? "border-amber-400/70 bg-amber-500/15 text-amber-100"
                              : "border-border bg-background text-muted-foreground"
                          )}
                        >
                          After Solve {attempt}
                        </button>
                      ))}
                    </div>
                    <input
                      key={`cutoff-${config.cutoff?.attempt ?? "off"}-${config.cutoff?.cutoffMs ?? "none"}`}
                      defaultValue={formatCompSimTimeInput(config.cutoff?.cutoffMs ?? null)}
                      onChange={(event) => {
                        const parsed = parseCompSimTimeInput(event.target.value)
                        if (parsed != null && config.cutoff) {
                          update({
                            cutoff: {
                              attempt: config.cutoff.attempt,
                              cutoffMs: parsed,
                            },
                          })
                        }
                      }}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-amber-400/70"
                      placeholder="e.g. 0:18.50"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Volume2 className="h-4 w-4 text-fuchsia-300" />
              Crowd Scene
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SCENE_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => update({ scene: value })}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    config.scene === value
                      ? "border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>Intensity</span>
                <span className="font-mono text-foreground">{config.intensity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={config.intensity}
                onChange={(event) => update({ intensity: Number(event.target.value) })}
                className="w-full accent-fuchsia-400"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mic2 className="h-4 w-4 text-emerald-300" />
              Atmosphere Controls
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="Random Crowd Reactions"
                description="Uses 20 rotating cheers, applause bursts, and shout cues."
                enabled={config.randomReactionsEnabled}
                onToggle={() =>
                  update({ randomReactionsEnabled: !config.randomReactionsEnabled })
                }
              />
              <ToggleRow
                label="Judge / MC Calls"
                description="Phase-boundary calls only, never during active timing."
                enabled={config.judgeCuesEnabled}
                onToggle={() =>
                  update({ judgeCuesEnabled: !config.judgeCuesEnabled })
                }
              />
            </div>
          </section>

          {onStart && (
            <button
              onClick={onStart}
              className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 px-4 text-base font-bold text-slate-950 transition-transform hover:scale-[1.01]"
            >
              {startLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-3 text-left transition-colors hover:border-border"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span
        className={cn(
          "inline-flex h-7 w-14 rounded-full border p-1 transition-colors",
          enabled ? "border-emerald-400/60 bg-emerald-500/20" : "border-border bg-background"
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full bg-white transition-transform",
            enabled ? "translate-x-7" : "translate-x-0"
          )}
        />
      </span>
    </button>
  )
}
