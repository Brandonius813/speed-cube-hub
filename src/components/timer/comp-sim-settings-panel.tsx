"use client"

import { useEffect, useRef, useState } from "react"
import { Mic2, Play, Square, TimerReset, Volume2 } from "lucide-react"
import { previewSoundscape, stopSoundscapePreview } from "@/lib/timer/comp-sim-audio"
import { cn } from "@/lib/utils"
import {
  COMP_SIM_SCENE_LABELS,
  formatCompSimTimeInput,
  normalizeCompSimConfig,
  parseCompSimTimeInput,
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

const FORMAT_OPTIONS = [
  { value: "mo3", label: "Mo3" },
  { value: "ao5", label: "Ao5" },
] as const

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
  const [timeLimitInput, setTimeLimitInput] = useState(
    formatCompSimTimeInput(config.cumulativeTimeLimitMs)
  )
  const [cutoffInput, setCutoffInput] = useState(
    formatCompSimTimeInput(config.cutoff?.cutoffMs ?? null)
  )
  const [waitMinInput, setWaitMinInput] = useState(
    formatCompSimTimeInput(config.waitTimeRangeMs.minMs)
  )
  const [waitMaxInput, setWaitMaxInput] = useState(
    formatCompSimTimeInput(config.waitTimeRangeMs.maxMs)
  )
  const [previewingScene, setPreviewingScene] = useState<CompSimScene | null>(null)
  const previewResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (previewResetTimeoutRef.current) {
        clearTimeout(previewResetTimeoutRef.current)
      }
      stopSoundscapePreview()
    }
  }, [])

  function update(next: Partial<CompSimRoundConfig>) {
    onChange(normalizeCompSimConfig({ ...config, ...next }))
  }

  function updateCutoff(enabled: boolean) {
    if (!enabled) {
      update({ cutoff: null })
      return
    }
    const nextCutoffMs = config.cutoff?.cutoffMs ?? 15000
    setCutoffInput(formatCompSimTimeInput(nextCutoffMs))
    update({
      cutoff: {
        attempt: config.cutoff?.attempt ?? 1,
        cutoffMs: nextCutoffMs,
      },
    })
  }

  function handleTimeLimitChange(raw: string) {
    setTimeLimitInput(raw)
    const parsed = parseCompSimTimeInput(raw)
    if (parsed != null) {
      update({ cumulativeTimeLimitMs: parsed })
    }
  }

  function handleCutoffChange(raw: string) {
    setCutoffInput(raw)
    const parsed = parseCompSimTimeInput(raw)
    if (parsed != null && config.cutoff) {
      update({
        cutoff: {
          attempt: config.cutoff.attempt,
          cutoffMs: parsed,
        },
      })
    }
  }

  function handleWaitRangeChange(bound: "min" | "max", raw: string) {
    if (bound === "min") {
      setWaitMinInput(raw)
    } else {
      setWaitMaxInput(raw)
    }

    const parsed = parseCompSimTimeInput(raw)
    if (parsed == null) return

    const nextRange =
      bound === "min"
        ? {
            minMs: parsed,
            maxMs: Math.max(parsed, config.waitTimeRangeMs.maxMs),
          }
        : {
            minMs: Math.min(config.waitTimeRangeMs.minMs, parsed),
            maxMs: parsed,
          }

    update({ waitTimeRangeMs: nextRange })
  }

  function resetPreviewState() {
    if (previewResetTimeoutRef.current) {
      clearTimeout(previewResetTimeoutRef.current)
    }
    previewResetTimeoutRef.current = null
    setPreviewingScene(null)
  }

  function handlePreview(scene: CompSimScene) {
    if (scene === "off") {
      stopSoundscapePreview()
      resetPreviewState()
      return
    }

    if (previewingScene === scene) {
      stopSoundscapePreview()
      resetPreviewState()
      return
    }

    stopSoundscapePreview()
    if (previewResetTimeoutRef.current) {
      clearTimeout(previewResetTimeoutRef.current)
    }

    previewSoundscape({
      scene,
      intensity: config.intensity,
      randomReactionsEnabled: config.randomReactionsEnabled,
    })
    setPreviewingScene(scene)
    previewResetTimeoutRef.current = setTimeout(() => {
      setPreviewingScene((current) => (current === scene ? null : current))
      previewResetTimeoutRef.current = null
    }, 4300)
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
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => update({ format: option.value })}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    config.format === option.value
                      ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-100"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
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
                <div>
                  <p className="text-sm font-semibold text-foreground">Wait Between Solves</p>
                  <p className="text-xs text-muted-foreground">
                    Randomized between your lower and upper bound after the cube is covered.
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <TimeInput
                    label="Lower Bound"
                    value={waitMinInput}
                    onChange={(value) => handleWaitRangeChange("min", value)}
                    onBlur={() =>
                      setWaitMinInput(formatCompSimTimeInput(config.waitTimeRangeMs.minMs))
                    }
                    placeholder="0:30"
                  />
                  <TimeInput
                    label="Upper Bound"
                    value={waitMaxInput}
                    onChange={(value) => handleWaitRangeChange("max", value)}
                    onBlur={() =>
                      setWaitMaxInput(formatCompSimTimeInput(config.waitTimeRangeMs.maxMs))
                    }
                    placeholder="2:30"
                  />
                </div>
              </div>

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
                        setTimeLimitInput(formatCompSimTimeInput(60000))
                      } else {
                        update({ cumulativeTimeLimitMs: null })
                        setTimeLimitInput("")
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
                    <TimeInput
                      label="Total Limit"
                      value={timeLimitInput}
                      onChange={handleTimeLimitChange}
                      onBlur={() =>
                        setTimeLimitInput(formatCompSimTimeInput(config.cumulativeTimeLimitMs))
                      }
                      placeholder="10:00"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cutoff</p>
                    <p className="text-xs text-muted-foreground">
                      Stop the round early if you miss the checkpoint.
                    </p>
                  </div>
                  <button
                    onClick={() => updateCutoff(config.cutoff == null)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.14em]",
                      config.cutoff != null
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {config.cutoff != null ? "On" : "Off"}
                  </button>
                </div>
                {config.cutoff != null && (
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
                    <TimeInput
                      label="Checkpoint Time"
                      value={cutoffInput}
                      onChange={handleCutoffChange}
                      onBlur={() =>
                        setCutoffInput(formatCompSimTimeInput(config.cutoff?.cutoffMs ?? null))
                      }
                      placeholder="0:18.50"
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
            <p className="mb-3 text-xs text-muted-foreground">
              Pick a room, then preview it before you start.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SCENE_OPTIONS.map(([value, label]) => (
                <div key={value} className="flex gap-2">
                  <button
                    onClick={() => update({ scene: value })}
                    className={cn(
                      "min-h-11 flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                      config.scene === value
                        ? "border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                  <button
                    onClick={() => handlePreview(value)}
                    disabled={value === "off"}
                    className={cn(
                      "inline-flex min-h-11 w-11 items-center justify-center rounded-xl border transition-colors",
                      value === "off"
                        ? "cursor-not-allowed border-border bg-background text-muted-foreground/40"
                        : previewingScene === value
                          ? "border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                    title={previewingScene === value ? "Stop preview" : `Preview ${label}`}
                    aria-label={previewingScene === value ? "Stop preview" : `Preview ${label}`}
                  >
                    {previewingScene === value ? (
                      <Square className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" />
                    )}
                  </button>
                </div>
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

function TimeInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-cyan-400/70"
        placeholder={placeholder}
      />
    </label>
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
