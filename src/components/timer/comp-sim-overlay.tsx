"use client"

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import { type InspectionVoiceGender } from "@/lib/timer/inspection"
import { useCompSim } from "@/components/timer/use-comp-sim"
import { useScreenWakeLock } from "@/components/timer/use-screen-wake-lock"
import {
  AttemptTimerScreen,
  CueScreen,
  IdleScreen,
  ReadyWindowScreen,
  ResultsScreen,
  RoundSheet,
  ScrambleScreen,
  SolveRecordedScreen,
  WaitingScreen,
} from "@/components/timer/comp-sim-screens"
import {
  type TimerTextSize,
  type TimerUpdateMode,
} from "@/components/timer/shared-timer-surface"
import { useSharedTimerController } from "@/components/timer/use-shared-timer-controller"
import {
  formatCompSimConstraintSummary,
  getCompSimFormatLabel,
  getCompSimSceneLabel,
  getEffectiveTime,
  type CompSimRoundConfig,
} from "@/lib/timer/comp-sim-round"

/** Handle exposed to the parent for forwarding GAN bluetooth events. */
export type CompSimBtHandle = {
  handleBtPress: (timestamp?: number) => void
  handleBtRelease: (timestamp?: number) => void
  handleBtSolveComplete: (timeMs: number) => void
  handleBtRunning: () => void
  phase: string
}

type Props = {
  event: string
  config: CompSimRoundConfig
  startSignal: number
  inspectionEnabled: boolean
  inspectionVoiceEnabled: boolean
  inspectionVoiceGender: InspectionVoiceGender
  timerUpdateMode: TimerUpdateMode
  timerReadoutTextSize: TimerTextSize
  onExit: () => void
  onConfigChange?: (config: CompSimRoundConfig) => void
  onBusyChange?: (busy: boolean) => void
  btHandleRef?: Ref<CompSimBtHandle | null>
}

function formatPressureWarning(
  config: CompSimRoundConfig,
  officialElapsedMs: number,
  solveCount: number
): string | null {
  if (config.cumulativeTimeLimitMs != null) {
    const remaining = config.cumulativeTimeLimitMs - officialElapsedMs
    if (remaining > 0 && remaining <= 15000) {
      return `${formatTimeMsCentiseconds(remaining)} left on the cumulative time limit`
    }
  }

  if (config.cutoff) {
    if (config.cutoff.attempt === 1 && solveCount === 0) {
      return `Solve 1 must be ${formatTimeMsCentiseconds(config.cutoff.cutoffMs)} or faster`
    }
    if (config.cutoff.attempt === 2 && solveCount < 2) {
      return `Your first 2 solves must average ${formatTimeMsCentiseconds(config.cutoff.cutoffMs)} or faster`
    }
  }

  return null
}

export function CompSimOverlay({
  event,
  config,
  startSignal,
  inspectionEnabled,
  inspectionVoiceEnabled,
  inspectionVoiceGender,
  timerUpdateMode,
  timerReadoutTextSize,
  onExit,
  onConfigChange,
  onBusyChange,
  btHandleRef,
}: Props) {
  const compSim = useCompSim({ event, config })
  const { snapshot, roundResult } = compSim
  const { phase } = snapshot
  const wakeLockEnabled = phase !== "idle" && phase !== "sim_complete"
  const handledStartSignalRef = useRef(0)
  const [readyWindowNow, setReadyWindowNow] = useState(() => Date.now())

  useScreenWakeLock({
    enabled: wakeLockEnabled,
    context: "comp_sim",
  })

  const progressBars = useMemo(
    () => Array.from({ length: snapshot.roundConfig.plannedSolveCount }, (_, index) => index),
    [snapshot.roundConfig.plannedSolveCount]
  )
  const pressureWarning = useMemo(
    () =>
      formatPressureWarning(
        snapshot.roundConfig,
        snapshot.officialElapsedMs,
        snapshot.solves.length
      ),
    [snapshot.roundConfig, snapshot.officialElapsedMs, snapshot.solves.length]
  )
  const statusChips = useMemo(
    () => formatCompSimConstraintSummary(snapshot.roundConfig),
    [snapshot.roundConfig]
  )

  const timerController = useSharedTimerController({
    enabled:
      (phase === "ready" && !snapshot.sitDownRequired) ||
      phase === "inspecting" ||
      phase === "solving",
    inspectionEnabled,
    inspectionVoiceEnabled,
    inspectionVoiceGender,
    onInspectionStart: compSim.beginInspection,
    onInspectionDnf: compSim.submitInspectionDnf,
    onSolveStart: compSim.startSolve,
    onSolveComplete: compSim.handleSolveComplete,
  })

  useImperativeHandle(btHandleRef, () => ({
    handleBtPress: timerController.handlePress,
    handleBtRelease: timerController.handlePressEnd,
    handleBtRunning: () => {
      // If not yet running, start the solve (GAN hardware started)
      if (timerController.phase !== "running") {
        timerController.startTimer()
      }
    },
    handleBtSolveComplete: (timeMs: number) => {
      timerController.externalStopSolve(timeMs)
    },
    phase,
  }), [timerController, phase])

  useEffect(() => {
    onBusyChange?.(phase !== "idle")
  }, [onBusyChange, phase])

  useEffect(() => {
    return () => onBusyChange?.(false)
  }, [onBusyChange])

  useEffect(() => {
    if (!startSignal || startSignal === handledStartSignalRef.current) return
    if (phase === "idle" || phase === "sim_complete") {
      handledStartSignalRef.current = startSignal
      void compSim.startSim()
    }
  }, [compSim, phase, startSignal])

  useEffect(() => {
    if (phase !== "ready" || snapshot.sitDownRequired || snapshot.readyWindowDeadlineMs == null) {
      return
    }

    const interval = window.setInterval(() => {
      setReadyWindowNow(Date.now())
    }, 250)

    return () => window.clearInterval(interval)
  }, [phase, snapshot.readyWindowDeadlineMs, snapshot.sitDownRequired])

  const handleExit = useCallback(() => {
    compSim.cancelSim()
    onExit()
  }, [compSim, onExit])

  const currentSolveDisplay =
    snapshot.solves.length > 0
      ? formatTimeMsCentiseconds(getEffectiveTime(snapshot.solves[snapshot.solves.length - 1]))
      : null
  const showRoundSheet = snapshot.solves.length > 0 && phase !== "sim_complete"
  const phaseAllowsScroll = phase === "idle" || phase === "sim_complete" || showRoundSheet
  const readyWindowMsLeft =
    snapshot.readyWindowDeadlineMs == null
      ? null
      : Math.max(0, snapshot.readyWindowDeadlineMs - readyWindowNow)
  const readyWindowLabel =
    phase === "ready" &&
    !snapshot.sitDownRequired &&
    snapshot.roundConfig.readyCountdownEnabled &&
    readyWindowMsLeft != null
      ? `${Math.floor(Math.ceil(readyWindowMsLeft / 1000) / 60)}:${String(
          Math.ceil(readyWindowMsLeft / 1000) % 60
        ).padStart(2, "0")}`
      : null
  const handleRoundConfigChange = useCallback(
    (nextConfig: CompSimRoundConfig) => {
      compSim.applyRoundConfig(nextConfig)
      onConfigChange?.(nextConfig)
    },
    [compSim, onConfigChange]
  )

  useEffect(() => {
    if (phase !== "solve_recorded" || snapshot.solves.length === 0) return

    const latestIndex = snapshot.solves.length - 1
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (
        event.target instanceof HTMLElement &&
        (event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.isContentEditable)
      ) {
        return
      }

      if (event.key === "+" || (event.key === "=" && event.shiftKey) || event.code === "NumpadAdd") {
        event.preventDefault()
        const currentPenalty = snapshot.solves[latestIndex]?.penalty
        compSim.updateSolvePenalty(latestIndex, currentPenalty === "+2" ? null : "+2")
        return
      }

      if (key === "d") {
        event.preventDefault()
        const currentPenalty = snapshot.solves[latestIndex]?.penalty
        compSim.updateSolvePenalty(latestIndex, currentPenalty === "DNF" ? null : "DNF")
        return
      }

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault()
        compSim.advanceToNextAttempt()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [compSim, phase, snapshot.solves])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.14),transparent_35%),linear-gradient(180deg,rgba(4,10,22,0.96),rgba(8,10,16,1))]">
      <div className="border-b border-border/60 bg-black/20 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Competition Mode Live
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusChip label={getCompSimFormatLabel(snapshot.roundConfig.format)} />
              <StatusChip label={getCompSimSceneLabel(snapshot.roundConfig.scene)} />
              {statusChips.slice(1).map((chip) => (
                <StatusChip key={chip} label={chip} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniMetric
              label="Attempt"
              value={`${Math.min(snapshot.solveIndex + 1, snapshot.roundConfig.plannedSolveCount)}/${snapshot.roundConfig.plannedSolveCount}`}
            />
            <MiniMetric label="Elapsed" value={formatTimeMsCentiseconds(snapshot.officialElapsedMs)} />
            <MiniMetric label="Last" value={currentSolveDisplay ?? "—"} />
            <MiniMetric
              label="Status"
              value={
                snapshot.endedReason
                  ? snapshot.endedReason.replace(/_/g, " ")
                  : phase.replace(/_/g, " ")
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>Round Progress</span>
            <span>{snapshot.solves.length} recorded</span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {progressBars.map((bar) => (
              <div
                key={bar}
                className={cn(
                  "h-2 rounded-full transition-colors",
                  bar < snapshot.solves.length
                    ? "bg-cyan-400"
                    : bar === snapshot.solveIndex && phase !== "idle" && phase !== "sim_complete"
                      ? "bg-cyan-400/40"
                      : "bg-white/10"
                )}
              />
            ))}
          </div>
        </div>

        {pressureWarning && phase !== "idle" && phase !== "sim_complete" && (
          <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {pressureWarning}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-1 px-4 py-8 sm:px-6",
          phaseAllowsScroll
            ? "min-h-0 items-start justify-center overflow-y-auto overscroll-contain"
            : "items-center justify-center overflow-hidden"
        )}
      >
        {phase === "sim_complete" ? (
          <ResultsScreen compSim={compSim} roundResult={roundResult} onExit={handleExit} />
        ) : (
          <div
            className={cn(
              "flex w-full flex-col items-center gap-5",
              showRoundSheet && "xl:grid xl:max-w-6xl xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start"
            )}
          >
            <div className="flex w-full justify-center">
              {phase === "idle" && (
                <IdleScreen compSim={compSim} onConfigChange={handleRoundConfigChange} />
              )}
              {phase === "scramble_shown" && <ScrambleScreen compSim={compSim} />}
              {phase === "waiting" && (
                <WaitingScreen
                  solveIndex={snapshot.solveIndex}
                  total={snapshot.roundConfig.plannedSolveCount}
                  warning={pressureWarning}
                />
              )}
              {phase === "solve_cue" && <CueScreen warning={pressureWarning} />}
              {phase === "ready" && snapshot.sitDownRequired && (
                <ReadyWindowScreen
                  sitDownRequired={true}
                  readyCountdownEnabled={snapshot.roundConfig.readyCountdownEnabled}
                  readyWindowMsLeft={readyWindowMsLeft}
                  readyWindowExpired={snapshot.readyWindowExpired}
                  onSitDown={compSim.sitDown}
                  onPointerDown={timerController.handlePointerDown}
                  onPointerUp={timerController.handlePointerUp}
                />
              )}
              {(phase === "inspecting" ||
                phase === "solving" ||
                (phase === "ready" && !snapshot.sitDownRequired)) && (
                <AttemptTimerScreen
                  formatLabel={getCompSimFormatLabel(snapshot.roundConfig.format)}
                  inspectionEnabled={inspectionEnabled}
                  timerPhase={timerController.phase}
                  inInspectionHold={timerController.inInspectionHold}
                  inspectionSecondsLeft={timerController.inspectionSecondsLeft}
                  currentTimeMs={timerController.currentTimeMs}
                  timeColor={timerController.timeColor}
                  timerUpdateMode={timerUpdateMode}
                  timerReadoutTextSize={timerReadoutTextSize}
                  onPointerDown={timerController.handlePointerDown}
                  onPointerUp={timerController.handlePointerUp}
                  warning={pressureWarning}
                  readyWindowLabel={readyWindowLabel}
                  readyWindowExpired={snapshot.readyWindowExpired}
                />
              )}
              {phase === "solve_recorded" && (
                <SolveRecordedScreen
                  snapshot={snapshot}
                  timerReadoutTextSize={timerReadoutTextSize}
                  onPenaltyChange={compSim.updateSolvePenalty}
                  onContinue={compSim.advanceToNextAttempt}
                />
              )}
            </div>

            {showRoundSheet && (
              <RoundSheet
                snapshot={snapshot}
                editable
                onPenaltyChange={compSim.updateSolvePenalty}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
      {label}
    </span>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
