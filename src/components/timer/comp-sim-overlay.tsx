"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import { type InspectionVoiceGender, useInspection } from "@/lib/timer/inspection"
import { useCompSim } from "@/components/timer/use-comp-sim"
import { useScreenWakeLock } from "@/components/timer/use-screen-wake-lock"
import {
  CueScreen,
  IdleScreen,
  InspectionScreen,
  ReadyScreen,
  ResultsScreen,
  ScrambleScreen,
  SolveRecordedScreen,
  SolvingScreen,
  WaitingScreen,
} from "@/components/timer/comp-sim-screens"
import {
  formatCompSimConstraintSummary,
  getCompSimFormatLabel,
  getCompSimSceneLabel,
  getEffectiveTime,
  type CompSimRoundConfig,
} from "@/lib/timer/comp-sim-round"
import { playJudgeCue } from "@/lib/timer/comp-sim-audio"

type Props = {
  event: string
  config: CompSimRoundConfig
  startSignal: number
  inspectionVoiceEnabled: boolean
  inspectionVoiceGender: InspectionVoiceGender
  onExit: () => void
  onConfigChange?: (config: CompSimRoundConfig) => void
  onBusyChange?: (busy: boolean) => void
}

const HOLD_MS = 550

function formatPressureWarning(config: CompSimRoundConfig, officialElapsedMs: number, solveCount: number): string | null {
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
  inspectionVoiceEnabled,
  inspectionVoiceGender,
  onExit,
  onConfigChange,
  onBusyChange,
}: Props) {
  const compSim = useCompSim({ event, config })
  const { snapshot, roundResult } = compSim
  const { phase } = snapshot
  const wakeLockEnabled = phase !== "idle" && phase !== "sim_complete"

  useScreenWakeLock({
    enabled: wakeLockEnabled,
    context: "comp_sim",
  })

  const inspection = useInspection({
    voice: inspectionVoiceEnabled,
    voiceGender: inspectionVoiceGender,
  })
  const displayRef = useRef<HTMLDivElement>(null)
  const timerStartRef = useRef(0)
  const rafRef = useRef(0)
  const inspectionPenaltyRef = useRef<"+2" | "DNF" | null>(null)
  const holdingRef = useRef(false)
  const holdStartRef = useRef(0)
  const prevPhaseRef = useRef(phase)
  const handledStartSignalRef = useRef(0)
  const [holdReady, setHoldReady] = useState(false)
  const [isHolding, setIsHolding] = useState(false)

  const progressBars = useMemo(
    () => Array.from({ length: snapshot.roundConfig.plannedSolveCount }, (_, index) => index),
    [snapshot.roundConfig.plannedSolveCount]
  )
  const pressureWarning = useMemo(
    () => formatPressureWarning(snapshot.roundConfig, snapshot.officialElapsedMs, snapshot.solves.length),
    [snapshot.roundConfig, snapshot.officialElapsedMs, snapshot.solves.length]
  )
  const statusChips = useMemo(
    () => formatCompSimConstraintSummary(snapshot.roundConfig),
    [snapshot.roundConfig]
  )

  useEffect(() => {
    onBusyChange?.(phase !== "idle")
  }, [onBusyChange, phase])

  useEffect(() => {
    return () => onBusyChange?.(false)
  }, [onBusyChange])

  useEffect(() => {
    if (!snapshot.roundConfig.judgeCuesEnabled) {
      prevPhaseRef.current = phase
      return
    }

    const previousPhase = prevPhaseRef.current
    if (previousPhase !== phase) {
      if (phase === "waiting") {
        playJudgeCue("covered")
      } else if (phase === "solve_cue") {
        playJudgeCue("time_to_solve")
      } else if (phase === "scramble_shown" && snapshot.solveIndex > 0) {
        playJudgeCue("next_attempt")
      }
    }
    prevPhaseRef.current = phase
  }, [phase, snapshot.roundConfig.judgeCuesEnabled, snapshot.solveIndex])

  useEffect(() => {
    if (!startSignal || startSignal === handledStartSignalRef.current) return
    if (phase === "idle" || phase === "sim_complete") {
      handledStartSignalRef.current = startSignal
      void compSim.startSim()
    }
  }, [compSim, phase, startSignal])

  useEffect(() => {
    if (phase !== "solving") {
      cancelAnimationFrame(rafRef.current)
      return
    }
    timerStartRef.current = Date.now()
    const tick = () => {
      if (displayRef.current) {
        displayRef.current.textContent = formatTimeMsCentiseconds(
          Date.now() - timerStartRef.current
        )
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  useEffect(() => {
    if (phase === "inspecting" && inspection.state === "idle") {
      inspection.startInspection()
    }
  }, [phase, inspection])

  useEffect(() => {
    if (inspection.state === "done" && phase === "inspecting") {
      inspectionPenaltyRef.current = "DNF"
      compSim.startSolve()
      setTimeout(() => compSim.handleSolveComplete(0, "DNF"), 50)
    }
  }, [inspection.state, phase, compSim])

  useEffect(() => {
    if (phase !== "ready" && phase !== "inspecting" && phase !== "solving") {
      holdingRef.current = false
      return
    }

    const onKeyDown = (eventKey: KeyboardEvent) => {
      if (eventKey.code !== "Space" || eventKey.repeat) return
      eventKey.preventDefault()
      eventKey.stopPropagation()

      if (phase === "solving") {
        cancelAnimationFrame(rafRef.current)
        const elapsed = Date.now() - timerStartRef.current
        const penalty = inspectionPenaltyRef.current
        inspectionPenaltyRef.current = null
        compSim.handleSolveComplete(elapsed, penalty)
        return
      }

      holdingRef.current = true
      setIsHolding(true)
      holdStartRef.current = Date.now()
      setHoldReady(false)
    }

    const onKeyUp = (eventKey: KeyboardEvent) => {
      if (eventKey.code !== "Space") return
      eventKey.preventDefault()
      eventKey.stopPropagation()

      if ((phase === "ready" || phase === "inspecting") && holdingRef.current) {
        const held = Date.now() - holdStartRef.current
        holdingRef.current = false
        setIsHolding(false)
        setHoldReady(false)

        if (held >= HOLD_MS) {
          if (phase === "ready") {
            compSim.beginInspection()
          } else {
            const penalty = inspection.finishInspection()
            inspectionPenaltyRef.current = penalty
            compSim.startSolve()
          }
        }
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true })
    window.addEventListener("keyup", onKeyUp, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      window.removeEventListener("keyup", onKeyUp, { capture: true })
    }
  }, [phase, inspection, compSim])

  useEffect(() => {
    if (phase !== "ready" && phase !== "inspecting") return
    const interval = setInterval(() => {
      if (holdingRef.current && Date.now() - holdStartRef.current >= HOLD_MS) {
        setHoldReady(true)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [phase])

  const handlePointerDown = useCallback(() => {
    if (phase === "solving") {
      cancelAnimationFrame(rafRef.current)
      const elapsed = Date.now() - timerStartRef.current
      const penalty = inspectionPenaltyRef.current
      inspectionPenaltyRef.current = null
      compSim.handleSolveComplete(elapsed, penalty)
      return
    }

    if (phase === "ready" || phase === "inspecting") {
      holdingRef.current = true
      setIsHolding(true)
      holdStartRef.current = Date.now()
      setHoldReady(false)
    }
  }, [phase, compSim])

  const handlePointerUp = useCallback(() => {
    if ((phase === "ready" || phase === "inspecting") && holdingRef.current) {
      const held = Date.now() - holdStartRef.current
      holdingRef.current = false
      setIsHolding(false)
      setHoldReady(false)
      if (held >= HOLD_MS) {
        if (phase === "ready") {
          compSim.beginInspection()
        } else {
          const penalty = inspection.finishInspection()
          inspectionPenaltyRef.current = penalty
          compSim.startSolve()
        }
      }
    }
  }, [phase, inspection, compSim])

  useEffect(() => {
    if (phase === "idle" || phase === "sim_complete") return
    const suppress = (eventKey: KeyboardEvent) => {
      if (eventKey.code === "Space") {
        eventKey.stopPropagation()
        eventKey.preventDefault()
      }
    }
    window.addEventListener("keydown", suppress, { capture: true })
    window.addEventListener("keyup", suppress, { capture: true })
    return () => {
      window.removeEventListener("keydown", suppress, { capture: true })
      window.removeEventListener("keyup", suppress, { capture: true })
    }
  }, [phase])

  const handleExit = useCallback(() => {
    compSim.cancelSim()
    onExit()
  }, [compSim, onExit])

  const currentSolveDisplay =
    snapshot.solves.length > 0
      ? formatTimeMsCentiseconds(getEffectiveTime(snapshot.solves[snapshot.solves.length - 1]))
      : null
  const phaseAllowsScroll = phase === "idle" || phase === "sim_complete"
  const handleRoundConfigChange = useCallback(
    (nextConfig: CompSimRoundConfig) => {
      compSim.applyRoundConfig(nextConfig)
      onConfigChange?.(nextConfig)
    },
    [compSim, onConfigChange]
  )

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
            <MiniMetric label="Attempt" value={`${Math.min(snapshot.solveIndex + 1, snapshot.roundConfig.plannedSolveCount)}/${snapshot.roundConfig.plannedSolveCount}`} />
            <MiniMetric label="Elapsed" value={formatTimeMsCentiseconds(snapshot.officialElapsedMs)} />
            <MiniMetric label="Last" value={currentSolveDisplay ?? "—"} />
            <MiniMetric label="Status" value={snapshot.endedReason ? snapshot.endedReason.replace(/_/g, " ") : phase.replace(/_/g, " ")} />
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
        {phase === "ready" && (
          <ReadyScreen
            holdReady={holdReady}
            holding={isHolding}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            formatLabel={getCompSimFormatLabel(snapshot.roundConfig.format)}
          />
        )}
        {phase === "inspecting" && (
          <InspectionScreen
            secondsLeft={inspection.secondsLeft}
            holdReady={holdReady}
            holding={isHolding}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        )}
        {phase === "solving" && (
          <SolvingScreen
            displayRef={displayRef}
            onPointerDown={handlePointerDown}
            warning={pressureWarning}
          />
        )}
        {phase === "solve_recorded" && (
          <SolveRecordedScreen
            solves={snapshot.solves}
            formatLabel={getCompSimFormatLabel(snapshot.roundConfig.format)}
          />
        )}
        {phase === "sim_complete" && (
          <ResultsScreen compSim={compSim} roundResult={roundResult} onExit={handleExit} />
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
