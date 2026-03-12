"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"

export type TimerUpdateMode = "realtime" | "seconds" | "solving"
export type TimerTextSize = "md" | "lg" | "xl"
export type SharedTimerPhase =
  | "idle"
  | "holding"
  | "ready"
  | "inspecting"
  | "running"
  | "stopped"

export type SharedTimerLastSolve = {
  timeMs: number
  penalty: "+2" | "DNF" | null
} | null

export const TIMER_READOUT_TEXT_SIZE_KEY = "timer-readout-text-size"

export const TIMER_READOUT_SIZE_CLASSES: Record<TimerTextSize, string> = {
  md: "text-[clamp(4.5rem,18vw,12rem)] leading-none",
  lg: "text-[clamp(5.25rem,21vw,14rem)] leading-none",
  xl: "text-[clamp(6rem,24vw,16rem)] leading-none",
}

export function parseTimerTextSize(raw: string | null): TimerTextSize | null {
  return raw === "md" || raw === "lg" || raw === "xl" ? raw : null
}

export function getTimerReadoutColor({
  phase,
  inInspectionHold,
  inspectionSecondsLeft,
  btArmed = false,
  btHandsOnMat = false,
}: {
  phase: SharedTimerPhase
  inInspectionHold: boolean
  inspectionSecondsLeft: number
  btArmed?: boolean
  btHandsOnMat?: boolean
}): string {
  return phase === "holding"
    ? "text-red-400"
    : phase === "ready"
    ? "text-green-400"
    : phase === "inspecting" && btArmed
    ? "text-green-400"
    : phase === "inspecting" && btHandsOnMat
    ? "text-red-400"
    : (phase === "inspecting" || inInspectionHold) && inspectionSecondsLeft <= 3
    ? "text-red-400"
    : (phase === "inspecting" || inInspectionHold) && inspectionSecondsLeft <= 7
    ? "text-yellow-400"
    : "text-foreground"
}

function fmtWholeSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return String(totalSeconds)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function TimerReadout({
  className,
  phase,
  startMs,
  last,
  inInspectionHold,
  inspectionSecondsLeft,
  timerUpdateMode,
  btReset = false,
  onStall,
}: {
  className: string
  phase: SharedTimerPhase
  startMs: number
  last: SharedTimerLastSolve
  inInspectionHold: boolean
  inspectionSecondsLeft: number
  timerUpdateMode: TimerUpdateMode
  btReset?: boolean
  onStall?: (deltaMs: number) => void
}) {
  const [runningDisplay, setRunningDisplay] = useState("0.00")
  const lastFrameRef = useRef<number | null>(null)
  const lastStallRef = useRef(0)

  useEffect(() => {
    if (phase !== "running") {
      lastFrameRef.current = null
      return
    }

    if (timerUpdateMode === "solving") {
      lastFrameRef.current = null
      return
    }

    let raf = 0
    let active = true
    const tick = (ts: number) => {
      if (!active) return
      if (lastFrameRef.current !== null && onStall) {
        const delta = ts - lastFrameRef.current
        if (delta > 250 && ts - lastStallRef.current > 1000) {
          lastStallRef.current = ts
          onStall(Math.round(delta * 100) / 100)
        }
      }
      lastFrameRef.current = ts
      const elapsed = ts - startMs
      setRunningDisplay(
        timerUpdateMode === "seconds"
          ? fmtWholeSeconds(elapsed)
          : formatTimeMsCentiseconds(elapsed)
      )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      active = false
      cancelAnimationFrame(raf)
    }
  }, [onStall, phase, startMs, timerUpdateMode])

  const display = useMemo(() => {
    if (phase === "running") {
      if (timerUpdateMode === "solving") return "solving"
      if (lastFrameRef.current === null) {
        return timerUpdateMode === "seconds" ? "0" : "0.00"
      }
      return runningDisplay
    }
    if (phase === "inspecting" || inInspectionHold) {
      return String(Math.max(0, 15 - inspectionSecondsLeft))
    }
    if (phase === "ready") return "0.00"
    if (phase === "idle" && btReset) return "0.00"
    if (!last) return "0.00"
    if (last.penalty === "DNF") return "DNF"
    return formatTimeMsCentiseconds(
      last.penalty === "+2" ? last.timeMs + 2000 : last.timeMs
    )
  }, [btReset, inInspectionHold, inspectionSecondsLeft, last, phase, runningDisplay, timerUpdateMode])

  return <div className={className}>{display}</div>
}
