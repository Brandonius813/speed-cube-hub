"use client"

import type { ReactNode } from "react"
import { Flag } from "lucide-react"
import {
  computeBPA,
  computeWPA,
  formatTimeMsCentiseconds,
} from "@/lib/timer/averages"
import type { Solve } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  getTimerReadoutColor,
  TIMER_READOUT_SIZE_CLASSES,
  TimerReadout,
  type SharedTimerLastSolve,
  type TimerTextSize,
  type TimerUpdateMode,
} from "@/components/timer/shared-timer-surface"
import type { CompSimApi } from "@/components/timer/use-comp-sim"
import { CompSimSettingsPanel } from "@/components/timer/comp-sim-settings-panel"
import {
  computeCompSimRoundResult,
  formatCompSimConstraintSummary,
  getCompSimEndedReasonLabel,
  getCompSimFormatLabel,
  getEffectiveTime,
  type CompSimRoundConfig,
  type CompSimRoundResult,
  type CompSimSolve,
} from "@/lib/timer/comp-sim-round"
import type { CompSimSnapshot } from "@/lib/timer/comp-sim-engine"

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

function toPressureSolve(solve: CompSimSolve, index: number): Solve {
  return {
    id: `comp-sim-${index}`,
    timer_session_id: "",
    user_id: "",
    solve_number: index + 1,
    time_ms: solve.time_ms,
    penalty: solve.penalty,
    scramble: solve.scramble,
    event: "",
    comp_sim_group: null,
    notes: null,
    phases: null,
    solve_session_id: null,
    solved_at: "",
    created_at: "",
  }
}

function getAo5PressureStats(snapshot: CompSimSnapshot): { bpa: number | null; wpa: number | null } | null {
  if (
    snapshot.roundConfig.format !== "ao5" ||
    snapshot.solves.length !== 4 ||
    snapshot.endedReason != null
  ) {
    return null
  }

  const pressureSolves = snapshot.solves.map(toPressureSolve)
  return {
    bpa: computeBPA(pressureSolves, 5),
    wpa: computeWPA(pressureSolves, 5),
  }
}

function getLiveRoundResult(snapshot: CompSimSnapshot): CompSimRoundResult | null {
  const result = computeCompSimRoundResult(snapshot.roundConfig.format, snapshot.solves)
  return result.completed ? result : null
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
    <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-2xl">
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
        Inspection Call
      </p>
      <h2 className="mt-2 text-4xl font-black text-emerald-50">Competitor To The Station</h2>
      <p className="mt-3 text-sm text-emerald-100/80">
        The call is out. Get settled and be ready to start inspection.
      </p>
      {warning && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {warning}
        </div>
      )}
    </div>
  )
}

function formatReadyWindowMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function ReadyWindowScreen({
  sitDownRequired,
  readyCountdownEnabled,
  readyWindowMsLeft,
  readyWindowExpired,
  onSitDown,
  onPointerDown,
  onPointerUp,
}: {
  sitDownRequired: boolean
  readyCountdownEnabled: boolean
  readyWindowMsLeft: number | null
  readyWindowExpired: boolean
  onSitDown: () => void
  onPointerDown: (timestamp?: number) => void
  onPointerUp: (timestamp?: number) => void
}) {
  if (sitDownRequired) {
    return (
      <div className="w-full max-w-xl rounded-[2rem] border border-border/70 bg-card/85 p-8 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Sit Down
        </p>
        <h2 className="mt-2 text-4xl font-black text-foreground">Take Your Station</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Local-style flow: when you are seated and ready, start the optional ready window.
        </p>
        <button
          onClick={onSitDown}
          className="mt-6 min-h-12 w-full rounded-2xl bg-cyan-500 px-4 font-bold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Sit Down / I&apos;m Ready
        </button>
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-xl cursor-pointer select-none rounded-[2rem] border border-border/70 bg-card/85 p-8 text-center shadow-2xl"
      onPointerDown={(eventPointer) => onPointerDown(eventPointer.timeStamp)}
      onPointerUp={(eventPointer) => onPointerUp(eventPointer.timeStamp)}
      onPointerCancel={(eventPointer) => onPointerUp(eventPointer.timeStamp)}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Ready Window
      </p>
      <h2 className="mt-2 text-4xl font-black text-foreground">Begin Inspection When Ready</h2>
      {readyCountdownEnabled && (
        <p className="mt-5 font-mono text-6xl font-light tabular-nums text-cyan-100">
          {formatReadyWindowMs(readyWindowMsLeft ?? 0)}
        </p>
      )}
      {readyWindowExpired && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          You missed the 60-second ready window. This is warning-only and the attempt can still continue.
        </div>
      )}
    </div>
  )
}

export function AttemptTimerScreen({
  formatLabel,
  timerPhase,
  inInspectionHold,
  inspectionSecondsLeft,
  currentTimeMs,
  timeColor,
  timerUpdateMode,
  timerReadoutTextSize,
  onPointerDown,
  onPointerUp,
  warning,
  readyWindowLabel,
  readyWindowExpired,
}: {
  formatLabel: string
  timerPhase: "idle" | "holding" | "ready" | "inspecting" | "running" | "stopped"
  inInspectionHold: boolean
  inspectionSecondsLeft: number
  currentTimeMs: number | null
  timeColor: string
  timerUpdateMode: TimerUpdateMode
  timerReadoutTextSize: TimerTextSize
  onPointerDown: (timestamp?: number) => void
  onPointerUp: (timestamp?: number) => void
  warning?: string | null
  readyWindowLabel?: string | null
  readyWindowExpired?: boolean
}) {
  const title =
    timerPhase === "running"
      ? "Solve Live"
      : timerPhase === "inspecting" || inInspectionHold
        ? "Inspection"
        : `${formatLabel} Round`
  return (
    <div
      className="flex w-full cursor-pointer select-none flex-col items-center text-center"
      onPointerDown={(eventPointer) => onPointerDown(eventPointer.timeStamp)}
      onPointerUp={(eventPointer) => onPointerUp(eventPointer.timeStamp)}
      onPointerCancel={(eventPointer) => onPointerUp(eventPointer.timeStamp)}
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
        currentTimeMs={currentTimeMs}
        last={null}
        inInspectionHold={inInspectionHold}
        inspectionSecondsLeft={inspectionSecondsLeft}
        timerUpdateMode={timerUpdateMode}
      />
      {readyWindowLabel && !inInspectionHold && (
        <p className="mt-4 font-mono text-3xl font-light tabular-nums text-cyan-100">
          {readyWindowLabel}
        </p>
      )}
      {readyWindowExpired && (
        <div className="mt-4 max-w-md rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          You missed the 60-second ready window. Warning only: you can still continue this attempt.
        </div>
      )}
      {warning && (
        <div className="mt-4 max-w-md rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {warning}
        </div>
      )}
    </div>
  )
}

export function SolveRecordedScreen({
  snapshot,
  timerReadoutTextSize,
  onPenaltyChange,
  onContinue,
}: {
  snapshot: CompSimSnapshot
  timerReadoutTextSize: TimerTextSize
  onPenaltyChange: (solveIndex: number, penalty: "+2" | "DNF" | null) => void
  onContinue: () => void
}) {
  const last = snapshot.solves[snapshot.solves.length - 1]
  if (!last) return null

  const latestSolveIndex = snapshot.solves.length - 1
  const lastDisplaySolve: SharedTimerLastSolve = {
    timeMs: last.time_ms,
    penalty: last.penalty,
  }
  const pressure = getAo5PressureStats(snapshot)
  const formatLabel = getCompSimFormatLabel(snapshot.roundConfig.format)

  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        {formatLabel} Attempt Review
      </p>
      <TimerReadout
        className={cn(
          "mt-4 font-mono font-light tabular-nums transition-colors duration-75",
          TIMER_READOUT_SIZE_CLASSES[timerReadoutTextSize],
          getTimerReadoutColor({
            phase: "stopped",
            inInspectionHold: false,
            inspectionSecondsLeft: 15,
          })
        )}
        phase="stopped"
        currentTimeMs={null}
        last={lastDisplaySolve}
        inInspectionHold={false}
        inspectionSecondsLeft={15}
        timerUpdateMode="realtime"
      />

      <div className="mt-5 grid grid-cols-3 gap-2">
        <PenaltyButton
          active={last.penalty == null}
          tone="neutral"
          onClick={() => onPenaltyChange(latestSolveIndex, null)}
        >
          OK
        </PenaltyButton>
        <PenaltyButton
          active={last.penalty === "+2"}
          tone="warning"
          onClick={() => onPenaltyChange(latestSolveIndex, last.penalty === "+2" ? null : "+2")}
        >
          +2
        </PenaltyButton>
        <PenaltyButton
          active={last.penalty === "DNF"}
          tone="danger"
          onClick={() => onPenaltyChange(latestSolveIndex, last.penalty === "DNF" ? null : "DNF")}
        >
          DNF
        </PenaltyButton>
      </div>

      {pressure && (
        <PressureCard className="mt-5" bpa={pressure.bpa} wpa={pressure.wpa} />
      )}

      <button
        onClick={onContinue}
        className="mt-5 min-h-12 w-full rounded-2xl bg-cyan-500 px-4 font-bold text-slate-950 transition-colors hover:bg-cyan-400"
      >
        {snapshot.endedReason ? "Review Results" : "Next Attempt"}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        Keyboard: `+` for plus two, `D` for DNF, `Space` or `Enter` to continue.
      </p>
    </div>
  )
}

export function RoundSheet({
  snapshot,
  editable,
  onPenaltyChange,
  className,
}: {
  snapshot: CompSimSnapshot
  editable: boolean
  onPenaltyChange?: (solveIndex: number, penalty: "+2" | "DNF" | null) => void
  className?: string
}) {
  const roundResult = getLiveRoundResult(snapshot)
  const pressure = getAo5PressureStats(snapshot)

  return (
    <div className={cn("w-full rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-2xl", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Round Sheet
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {getCompSimFormatLabel(snapshot.roundConfig.format)} · {snapshot.solves.length}/{snapshot.roundConfig.plannedSolveCount} recorded
          </h3>
        </div>
        {roundResult && (
          <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Current Result
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">
              {roundResult.display}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {snapshot.solves.map((solve, index) => (
          <div
            key={`${index}-${solve.scramble}`}
            className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Solve {index + 1}</p>
                <p
                  className={cn(
                    "mt-1 font-mono text-lg",
                    solve.penalty === "DNF" && "text-red-300",
                    solve.penalty === "+2" && "text-amber-300"
                  )}
                >
                  {solve.penalty === "DNF" ? "DNF" : fmtTime(getEffectiveTime(solve))}
                </p>
              </div>
              {editable && onPenaltyChange ? (
                <div className="grid min-w-0 grid-cols-3 gap-2 sm:w-[220px]">
                  <PenaltyButton
                    active={solve.penalty == null}
                    tone="neutral"
                    onClick={() => onPenaltyChange(index, null)}
                  >
                    OK
                  </PenaltyButton>
                  <PenaltyButton
                    active={solve.penalty === "+2"}
                    tone="warning"
                    onClick={() => onPenaltyChange(index, solve.penalty === "+2" ? null : "+2")}
                  >
                    +2
                  </PenaltyButton>
                  <PenaltyButton
                    active={solve.penalty === "DNF"}
                    tone="danger"
                    onClick={() => onPenaltyChange(index, solve.penalty === "DNF" ? null : "DNF")}
                  >
                    DNF
                  </PenaltyButton>
                </div>
              ) : (
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Penalty</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {solve.penalty ?? "None"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {pressure && <PressureCard className="mt-4" bpa={pressure.bpa} wpa={pressure.wpa} />}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SheetStatusCard
          label="Cutoff"
          value={
            snapshot.roundConfig.cutoff
              ? snapshot.cutoffMet === true
                ? "Made"
                : snapshot.cutoffMet === false
                  ? "Missed"
                  : "Pending"
              : "None"
          }
        />
        <SheetStatusCard
          label="Time Limit"
          value={
            snapshot.roundConfig.cumulativeTimeLimitMs == null
              ? "None"
              : snapshot.endedReason === "time_limit_reached"
                ? "Reached"
                : fmtTime(snapshot.roundConfig.cumulativeTimeLimitMs)
          }
        />
        <SheetStatusCard
          label="Status"
          value={snapshot.endedReason ? getCompSimEndedReasonLabel(snapshot.endedReason) : "In Progress"}
        />
      </div>
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
  const formatLabel = getCompSimFormatLabel(snapshot.roundConfig.format)

  return (
    <div className="grid w-full gap-5 xl:max-w-none xl:grid-cols-[1fr_360px]">
      <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-2xl">
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
            Attempt #{compSim.attemptNumber}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Comparison
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
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

      <RoundSheet snapshot={snapshot} editable={false} />
    </div>
  )
}

function PressureCard({
  bpa,
  wpa,
  className,
}: {
  bpa: number | null
  wpa: number | null
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
        Solve 5 Pressure
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <PressureItem label="BPA (ao5)" value={bpa != null ? fmtTime(bpa) : "DNF"} />
        <PressureItem label="WPA (ao5)" value={wpa != null ? fmtTime(wpa) : "DNF"} />
      </div>
    </div>
  )
}

function PressureItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

function SheetStatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function PenaltyButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean
  tone: "neutral" | "warning" | "danger"
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors",
        tone === "neutral" &&
          (active
            ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
            : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground"),
        tone === "warning" &&
          (active
            ? "border-amber-400/50 bg-amber-500/15 text-amber-100"
            : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground"),
        tone === "danger" &&
          (active
            ? "border-red-400/50 bg-red-500/15 text-red-100"
            : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground")
      )}
    >
      {children}
    </button>
  )
}
