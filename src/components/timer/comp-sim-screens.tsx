"use client"

import type { ComponentType } from "react"
import { Flag, Mic2, TimerReset, Volume2 } from "lucide-react"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import {
  TIMER_READOUT_SIZE_CLASSES,
  TimerReadout,
  type TimerTextSize,
  type TimerUpdateMode,
} from "@/components/timer/shared-timer-surface"
import type { CompSimApi } from "@/components/timer/use-comp-sim"
import { CompSimSettingsPanel } from "@/components/timer/comp-sim-settings-panel"
import {
  formatCompSimConstraintSummary,
  getCompSimEndedReasonLabel,
  getCompSimFormatLabel,
  getCompSimSceneLabel,
  getEffectiveTime,
  type CompSimRoundConfig,
  type CompSimRoundResult,
  type CompSimSolve,
} from "@/lib/timer/comp-sim-round"

function fmtTime(ms: number): string {
  return formatTimeMsCentiseconds(ms)
}

function fmtSeconds(seconds: number): string {
  return formatTimeMsCentiseconds(Math.round(seconds * 1000))
}

function describeDelta(currentSeconds: number | null, referenceSeconds: number | null, label: string): string {
  if (currentSeconds == null || referenceSeconds == null) return `No ${label.toLowerCase()} yet`
  const delta = currentSeconds - referenceSeconds
  if (Math.abs(delta) < 0.01) return `Matched ${label.toLowerCase()}`
  const direction = delta < 0 ? "faster" : "slower"
  return `${fmtSeconds(Math.abs(delta))} ${direction} than ${label.toLowerCase()}`
}

export function IdleScreen({
  compSim,
  onConfigChange,
}: {
  compSim: CompSimApi
  onConfigChange: (config: CompSimRoundConfig) => void
}) {
  return (
    <div className="w-full max-w-5xl">
      <CompSimSettingsPanel
        config={compSim.snapshot.roundConfig}
        onChange={onConfigChange}
        onStart={compSim.startSim}
        title="Build the exact pressure you want"
        description="Choose a round format, add cutoff pressure, cap your cumulative time, then dial in the room. Every attempt saves into dedicated Comp Sim tracking on your profile."
        startLabel="Start This Round"
      />
    </div>
  )
}

export function ScrambleScreen({ compSim }: { compSim: CompSimApi }) {
  const { snapshot } = compSim
  const scramble = snapshot.scrambles[snapshot.solveIndex] ?? "Loading..."
  const total = snapshot.roundConfig.plannedSolveCount
  const summaries = formatCompSimConstraintSummary(snapshot.roundConfig)

  return (
    <div className="w-full max-w-4xl rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-2xl">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
        <span>Solve {snapshot.solveIndex + 1} of {total}</span>
        {summaries.map((summary) => (
          <span key={summary} className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] text-cyan-100">
            {summary}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-background/70 px-5 py-6">
        <p className="mb-3 text-sm text-muted-foreground">
          Scramble your cube, cover it, and wait for the round to continue.
        </p>
        <p className="font-mono text-xl leading-relaxed text-foreground sm:text-2xl">
          {scramble}
        </p>
      </div>

      <button
        onClick={compSim.confirmCubeCovered}
        className="mt-5 min-h-14 w-full rounded-2xl bg-cyan-500 px-4 text-base font-bold text-slate-950 transition-colors hover:bg-cyan-400"
      >
        Cube Is Covered
      </button>
    </div>
  )
}

export function WaitingScreen({
  solveIndex,
  total,
  warning,
}: {
  solveIndex: number
  total: number
  warning?: string | null
}) {
  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-border/70 bg-card/85 p-8 text-center shadow-2xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Waiting Period
      </p>
      <h2 className="mt-2 text-3xl font-bold text-foreground">Attempt {solveIndex + 1} of {total}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Stay settled and wait for the call to start inspection.
      </p>
      {warning && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {warning}
        </div>
      )}
    </div>
  )
}

export function CueScreen({ warning }: { warning?: string | null }) {
  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-emerald-400/40 bg-emerald-500/10 p-8 text-center shadow-2xl">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/20">
        <Flag className="h-10 w-10 text-emerald-200" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
        Judge Cue
      </p>
      <h2 className="mt-2 text-4xl font-black text-emerald-50">Time To Solve</h2>
      {warning && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {warning}
        </div>
      )}
    </div>
  )
}

export function AttemptTimerScreen({
  formatLabel,
  inspectionEnabled,
  timerPhase,
  inInspectionHold,
  inspectionSecondsLeft,
  startMs,
  timeColor,
  timerUpdateMode,
  timerReadoutTextSize,
  onPointerDown,
  onPointerUp,
  warning,
}: {
  formatLabel: string
  inspectionEnabled: boolean
  timerPhase: "idle" | "holding" | "ready" | "inspecting" | "running" | "stopped"
  inInspectionHold: boolean
  inspectionSecondsLeft: number
  startMs: number
  timeColor: string
  timerUpdateMode: TimerUpdateMode
  timerReadoutTextSize: TimerTextSize
  onPointerDown: () => void
  onPointerUp: () => void
  warning?: string | null
}) {
  const title =
    timerPhase === "running"
      ? "Solve Live"
      : timerPhase === "inspecting" || inInspectionHold
      ? "Inspection"
      : `${formatLabel} Round`
  const prompt =
    timerPhase === "running"
      ? "Press spacebar or tap to stop"
      : timerPhase === "inspecting" || inInspectionHold
      ? "Hold and release just like the normal timer to start your solve"
      : inspectionEnabled
      ? "Use the normal timer hold-to-start flow to begin inspection"
      : "Use the normal timer hold-to-start flow to begin your solve"

  return (
    <div
      className="w-full max-w-xl cursor-pointer select-none rounded-[2rem] border border-border/70 bg-card/85 p-8 text-center shadow-2xl"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        {title}
      </p>
      <TimerReadout
        className={cn(
          "mt-4 font-mono font-light tabular-nums transition-colors duration-75",
          TIMER_READOUT_SIZE_CLASSES[timerReadoutTextSize],
          timeColor
        )}
        phase={timerPhase}
        startMs={startMs}
        last={null}
        inInspectionHold={inInspectionHold}
        inspectionSecondsLeft={inspectionSecondsLeft}
        timerUpdateMode={timerUpdateMode}
      />
      <p className="mt-3 text-sm text-muted-foreground">{prompt}</p>
      {warning && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {warning}
        </div>
      )}
    </div>
  )
}

export function SolveRecordedScreen({
  solves,
  formatLabel,
}: {
  solves: CompSimSolve[]
  formatLabel: string
}) {
  const last = solves[solves.length - 1]
  if (!last) return null

  const display =
    last.penalty === "DNF" ? "DNF" : fmtTime(getEffectiveTime(last))

  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-border/70 bg-card/85 p-8 text-center shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        {formatLabel} Attempt Saved
      </p>
      <p className={cn("mt-4 font-mono text-[5rem] font-black leading-none tabular-nums sm:text-[6rem]", last.penalty === "DNF" ? "text-red-300" : "text-foreground")}>
        {display}
      </p>
      {last.penalty === "+2" && <p className="mt-2 text-sm font-semibold text-amber-300">+2 penalty applied</p>}
      <p className="mt-3 text-sm text-muted-foreground">Resetting for the next attempt…</p>
    </div>
  )
}

export function ResultsScreen({
  compSim,
  roundResult,
  onExit,
}: {
  compSim: CompSimApi
  roundResult: CompSimRoundResult | null
  onExit: () => void
}) {
  if (!roundResult) return null

  const { snapshot, benchmarks } = compSim
  const currentSeconds =
    roundResult.resultMs == null ? null : roundResult.resultMs / 1000
  const sceneLabel = getCompSimSceneLabel(snapshot.roundConfig.scene)
  const formatLabel = getCompSimFormatLabel(snapshot.roundConfig.format)
  const endedReasonLabel = getCompSimEndedReasonLabel(snapshot.endedReason ?? "completed")
  const constraintSummary = formatCompSimConstraintSummary(snapshot.roundConfig).join(" • ")

  return (
    <div className="w-full max-w-4xl rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            {compSim.isSaving ? "Saving…" : "Saved"}
          </p>
          <h2 className="mt-2 text-3xl font-black text-foreground">
            {formatLabel} Result:{" "}
            <span className="font-mono">
              {roundResult.isDnf ? "DNF" : roundResult.resultMs != null ? fmtTime(roundResult.resultMs) : "No Result"}
            </span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Attempt #{compSim.attemptNumber} • {constraintSummary}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ended
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">{endedReasonLabel}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResultPill icon={TimerReset} label="Scene" value={sceneLabel} />
        <ResultPill
          icon={Flag}
          label="Cutoff"
          value={
            snapshot.roundConfig.cutoff
              ? snapshot.cutoffMet === true
                ? "Made cutoff"
                : snapshot.cutoffMet === false
                  ? "Missed cutoff"
                  : "Pending"
              : "None"
          }
        />
        <ResultPill
          icon={Volume2}
          label="Time Limit"
          value={
            snapshot.roundConfig.cumulativeTimeLimitMs == null
              ? "None"
              : snapshot.endedReason === "time_limit_reached"
                ? "Reached"
                : "Stayed under"
          }
        />
        <ResultPill
          icon={Mic2}
          label="Intensity"
          value={`${snapshot.roundConfig.intensity}%`}
        />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Attempt Breakdown
          </p>
          <div className="mt-3 space-y-2">
            {snapshot.solves.map((solve, index) => {
              const effective = getEffectiveTime(solve)
              const display = solve.penalty === "DNF" ? "DNF" : fmtTime(effective)
              const dropped =
                (roundResult.bestIdx != null && index === roundResult.bestIdx) ||
                (roundResult.worstIdx != null && index === roundResult.worstIdx)
              return (
                <div
                  key={`${index}-${solve.scramble}`}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card/80 px-3 py-3"
                >
                  <span className="text-sm text-muted-foreground">Solve {index + 1}</span>
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold",
                      solve.penalty === "DNF" && "text-red-300",
                      solve.penalty === "+2" && "text-amber-300",
                      dropped && snapshot.roundConfig.format === "ao5" && "opacity-60"
                    )}
                  >
                    {snapshot.roundConfig.format === "ao5" && dropped ? `(${display})` : display}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Comparison
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div className="rounded-xl border border-border/50 bg-card/80 px-3 py-3">
              <p className="text-muted-foreground">Previous Comp Sim</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {benchmarks?.previousCompSimResultSeconds != null
                  ? fmtSeconds(benchmarks.previousCompSimResultSeconds)
                  : "No prior result"}
              </p>
              <p className="mt-1 text-xs text-cyan-200">
                {describeDelta(currentSeconds, benchmarks?.previousCompSimResultSeconds ?? null, "Previous Comp Sim")}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/80 px-3 py-3">
              <p className="text-muted-foreground">Recent Normal Practice</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {benchmarks?.normalBaselineSeconds != null
                  ? fmtSeconds(benchmarks.normalBaselineSeconds)
                  : "No baseline yet"}
              </p>
              <p className="mt-1 text-xs text-cyan-200">
                {describeDelta(currentSeconds, benchmarks?.normalBaselineSeconds ?? null, "Practice Baseline")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={compSim.goAgain}
          className="min-h-12 flex-1 rounded-2xl bg-cyan-500 px-4 font-bold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Run It Again
        </button>
        <button
          onClick={onExit}
          className="min-h-12 flex-1 rounded-2xl border border-border bg-background px-4 font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function ResultPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
