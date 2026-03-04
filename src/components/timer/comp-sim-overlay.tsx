"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useInspection } from "@/lib/timer/inspection"
import { useCompSim } from "@/components/timer/use-comp-sim"
import {
  IdleScreen,
  ScrambleScreen,
  WaitingScreen,
  CueScreen,
  InspectionScreen,
  SolvingScreen,
  SolveRecordedScreen,
  ResultsScreen,
} from "@/components/timer/comp-sim-screens"

type Props = {
  event: string
  eventName: string
  sessionStartMs: number | null
  onExit: () => void
}

const HOLD_MS = 550

export function CompSimOverlay({ event, eventName, sessionStartMs, onExit }: Props) {
  const compSim = useCompSim({ event, sessionStartMs })
  const { snapshot, ao5Result } = compSim
  const { phase } = snapshot

  const insp = useInspection({ voice: true })
  const displayRef = useRef<HTMLDivElement>(null)
  const timerStartRef = useRef(0)
  const rafRef = useRef(0)
  const inspPenaltyRef = useRef<"+2" | "DNF" | null>(null)
  const holdingRef = useRef(false)
  const holdStartRef = useRef(0)
  const [holdReady, setHoldReady] = useState(false)

  // --- Timer RAF loop for solving phase ---
  useEffect(() => {
    if (phase !== "solving") {
      cancelAnimationFrame(rafRef.current)
      return
    }
    timerStartRef.current = Date.now()
    const tick = () => {
      if (displayRef.current) {
        const s = (Date.now() - timerStartRef.current) / 1000
        displayRef.current.textContent =
          s < 60 ? s.toFixed(2) : `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  // --- Start inspection when engine enters inspecting phase ---
  useEffect(() => {
    if (phase === "inspecting" && insp.state === "idle") {
      insp.startInspection()
    }
  }, [phase, insp])

  // --- Auto-DNF if inspection times out ---
  useEffect(() => {
    if (insp.state === "done" && phase === "inspecting") {
      inspPenaltyRef.current = "DNF"
      compSim.startSolve()
      setTimeout(() => compSim.handleSolveComplete(0, "DNF"), 50)
    }
  }, [insp.state, phase, compSim])

  // --- Keyboard handler (capture phase to intercept before timer-content) ---
  useEffect(() => {
    if (phase !== "inspecting" && phase !== "solving") {
      holdingRef.current = false
      setHoldReady(false)
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return
      e.preventDefault()
      e.stopPropagation()

      if (phase === "solving") {
        cancelAnimationFrame(rafRef.current)
        const elapsed = Date.now() - timerStartRef.current
        const penalty = inspPenaltyRef.current
        inspPenaltyRef.current = null
        compSim.handleSolveComplete(elapsed, penalty)
        return
      }

      if (phase === "inspecting") {
        holdingRef.current = true
        holdStartRef.current = Date.now()
        setHoldReady(false)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      e.preventDefault()
      e.stopPropagation()

      if (phase === "inspecting" && holdingRef.current) {
        const held = Date.now() - holdStartRef.current
        holdingRef.current = false
        setHoldReady(false)

        if (held >= HOLD_MS) {
          const penalty = insp.finishInspection()
          inspPenaltyRef.current = penalty
          compSim.startSolve()
        }
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true })
    window.addEventListener("keyup", onKeyUp, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      window.removeEventListener("keyup", onKeyUp, { capture: true })
    }
  }, [phase, insp, compSim])

  // --- Hold timer check (show green state) ---
  useEffect(() => {
    if (phase !== "inspecting") return
    const check = setInterval(() => {
      if (holdingRef.current && Date.now() - holdStartRef.current >= HOLD_MS) {
        setHoldReady(true)
      }
    }, 50)
    return () => clearInterval(check)
  }, [phase])

  // --- Touch handlers for mobile ---
  const handlePointerDown = useCallback(() => {
    if (phase === "solving") {
      cancelAnimationFrame(rafRef.current)
      const elapsed = Date.now() - timerStartRef.current
      const penalty = inspPenaltyRef.current
      inspPenaltyRef.current = null
      compSim.handleSolveComplete(elapsed, penalty)
    } else if (phase === "inspecting") {
      holdingRef.current = true
      holdStartRef.current = Date.now()
      setHoldReady(false)
    }
  }, [phase, compSim])

  const handlePointerUp = useCallback(() => {
    if (phase === "inspecting" && holdingRef.current) {
      const held = Date.now() - holdStartRef.current
      holdingRef.current = false
      setHoldReady(false)
      if (held >= HOLD_MS) {
        const penalty = insp.finishInspection()
        inspPenaltyRef.current = penalty
        compSim.startSolve()
      }
    }
  }, [phase, insp, compSim])

  // --- Suppress timer-content keyboard events ---
  useEffect(() => {
    if (phase === "idle" || phase === "sim_complete") return
    const suppress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.stopPropagation()
        e.preventDefault()
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

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            Comp Sim
          </span>
          <span className="text-xs text-muted-foreground">{eventName}</span>
        </div>
        <button
          className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          onClick={handleExit}
          aria-label="Exit comp sim"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {phase === "idle" && <IdleScreen compSim={compSim} />}
        {phase === "scramble_shown" && <ScrambleScreen compSim={compSim} />}
        {phase === "waiting" && <WaitingScreen solveIndex={snapshot.solveIndex} />}
        {phase === "solve_cue" && <CueScreen />}
        {phase === "inspecting" && (
          <InspectionScreen
            secondsLeft={insp.secondsLeft}
            holdReady={holdReady}
            holding={holdingRef.current}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        )}
        {phase === "solving" && (
          <SolvingScreen displayRef={displayRef} onPointerDown={handlePointerDown} />
        )}
        {phase === "solve_recorded" && (
          <SolveRecordedScreen solves={snapshot.solves} />
        )}
        {phase === "sim_complete" && (
          <ResultsScreen compSim={compSim} ao5Result={ao5Result} />
        )}
      </div>

      {/* Bottom: solve progress dots */}
      {phase !== "idle" && phase !== "sim_complete" && (
        <div className="flex items-center justify-center gap-3 pb-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                i < snapshot.solves.length
                  ? "bg-primary"
                  : i === snapshot.solveIndex
                    ? "bg-primary/50 animate-pulse"
                    : "bg-muted"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
