"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { truncateMsToCentiseconds } from "@/lib/timer/averages"
import { createTimerEngine, type TimerPhase } from "@/lib/timer/engine"
import { useInspection, type InspectionVoiceGender } from "@/lib/timer/inspection"
import { getTimerReadoutColor } from "@/components/timer/shared-timer-surface"

const HOLD_MS = 550

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement ||
    target.isContentEditable
  )
}

type SharedTimerControllerOptions = {
  enabled: boolean
  inspectionEnabled: boolean
  inspectionVoiceEnabled: boolean
  inspectionVoiceGender: InspectionVoiceGender
  onInspectionStart?: () => void
  onInspectionDnf: () => void
  onSolveStart: () => void
  onSolveComplete: (timeMs: number, penalty: "+2" | "DNF" | null) => void
}

export function useSharedTimerController({
  enabled,
  inspectionEnabled,
  inspectionVoiceEnabled,
  inspectionVoiceGender,
  onInspectionStart,
  onInspectionDnf,
  onSolveStart,
  onSolveComplete,
}: SharedTimerControllerOptions) {
  const [engine] = useState(() => createTimerEngine({ phase: "idle", scrambleReady: true }))
  const [engineSnapshot, setEngineSnapshot] = useState(() => engine.getSnapshot())
  const {
    secondsLeft: inspectionSecondsLeft,
    state: inspectionState,
    startInspection,
    cancelInspection,
    finishInspection,
  } = useInspection({
    voice: inspectionVoiceEnabled,
    voiceGender: inspectionVoiceGender,
  })
  const startMsRef = useRef(0)
  const [startMs, setStartMs] = useState(0)
  const phaseRef = useRef<TimerPhase>(engineSnapshot.phase)
  const heldRef = useRef(false)
  const holdTimeoutRef = useRef<number | null>(null)
  const tapToInspectRef = useRef(false)
  const inspectionPenaltyRef = useRef<"+2" | "DNF" | null>(null)
  const inspectionHoldRef = useRef(false)
  const [inInspectionHold, setInInspectionHold] = useState(false)

  useEffect(() => {
    const unsubscribe = engine.subscribe(setEngineSnapshot)
    return unsubscribe
  }, [engine])

  useEffect(() => {
    phaseRef.current = engineSnapshot.phase
  }, [engineSnapshot.phase])

  const clearHoldTimeout = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }, [])

  const syncInspectionHold = useCallback((value: boolean) => {
    inspectionHoldRef.current = value
    setInInspectionHold(value)
  }, [])

  const startTimer = useCallback(() => {
    const startedAt = performance.now()
    startMsRef.current = startedAt
    setStartMs(startedAt)
    engine.dispatch({ type: "START_RUNNING" })
    onSolveStart()
  }, [engine, onSolveStart])

  const completeInspectionDnf = useCallback(() => {
    syncInspectionHold(false)
    inspectionPenaltyRef.current = null
    engine.dispatch({ type: "INSPECTION_DONE" })
    onInspectionDnf()
  }, [engine, onInspectionDnf, syncInspectionHold])

  const stopTimer = useCallback(() => {
    if (phaseRef.current !== "running") return
    const elapsed = truncateMsToCentiseconds(performance.now() - startMsRef.current)
    const penalty = inspectionPenaltyRef.current
    inspectionPenaltyRef.current = null
    engine.dispatch({ type: "STOP_SOLVE" })
    onSolveComplete(elapsed, penalty)
  }, [engine, onSolveComplete])

  const startHold = useCallback(() => {
    heldRef.current = true
    engine.dispatch({ type: "START_HOLD" })
    clearHoldTimeout()
    holdTimeoutRef.current = window.setTimeout(() => {
      if (phaseRef.current === "holding" && heldRef.current) {
        engine.dispatch({ type: "HOLD_READY" })
      }
    }, HOLD_MS)
  }, [clearHoldTimeout, engine])

  const releaseHold = useCallback(() => {
    clearHoldTimeout()

    if (tapToInspectRef.current) {
      tapToInspectRef.current = false
      engine.dispatch({ type: "START_INSPECTION" })
      onInspectionStart?.()
      startInspection()
      return
    }

    if (inspectionHoldRef.current) {
      syncInspectionHold(false)
      if (phaseRef.current === "ready") {
        const penalty = finishInspection()
        if (penalty === "DNF") {
          completeInspectionDnf()
          return
        }
        inspectionPenaltyRef.current = penalty
        startTimer()
      } else {
        engine.dispatch({ type: "CANCEL_HOLD", backTo: "inspecting" })
      }
      return
    }

    if (phaseRef.current === "holding") {
      engine.dispatch({ type: "CANCEL_HOLD", backTo: "idle" })
      return
    }

    if (phaseRef.current !== "ready") return
    startTimer()
  }, [clearHoldTimeout, completeInspectionDnf, engine, finishInspection, onInspectionStart, startInspection, startTimer, syncInspectionHold])

  const handlePress = useCallback(() => {
    const currentPhase = phaseRef.current
    if (currentPhase === "running") {
      stopTimer()
      return
    }

    if (currentPhase === "inspecting") {
      syncInspectionHold(true)
      tapToInspectRef.current = false
      startHold()
      return
    }

    if (currentPhase === "idle" || currentPhase === "stopped") {
      syncInspectionHold(false)
      if (inspectionEnabled) {
        tapToInspectRef.current = true
        heldRef.current = true
        engine.dispatch({ type: "HOLD_READY" })
      } else {
        tapToInspectRef.current = false
        startHold()
      }
    }
  }, [engine, inspectionEnabled, startHold, stopTimer, syncInspectionHold])

  const handlePressEnd = useCallback(() => {
    heldRef.current = false
    releaseHold()
  }, [releaseHold])

  const handlePointerDown = useCallback(() => {
    if (!enabled) return
    handlePress()
  }, [enabled, handlePress])

  const handlePointerUp = useCallback(() => {
    if (!enabled) return
    handlePressEnd()
  }, [enabled, handlePressEnd])

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (eventKey: KeyboardEvent) => {
      if (eventKey.code !== "Space") return
      if (isInteractiveTarget(eventKey.target)) return
      eventKey.preventDefault()
      eventKey.stopPropagation()
      if (eventKey.repeat) return
      handlePress()
    }

    const onKeyUp = (eventKey: KeyboardEvent) => {
      if (eventKey.code !== "Space") return
      eventKey.preventDefault()
      eventKey.stopPropagation()
      handlePressEnd()
    }

    window.addEventListener("keydown", onKeyDown, { capture: true })
    window.addEventListener("keyup", onKeyUp, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      window.removeEventListener("keyup", onKeyUp, { capture: true })
    }
  }, [enabled, handlePress, handlePressEnd])

  useEffect(() => {
    if (!enabled) return
    if (inspectionState === "done" && (phaseRef.current === "inspecting" || inspectionHoldRef.current)) {
      const timeoutId = window.setTimeout(() => {
        completeInspectionDnf()
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [completeInspectionDnf, enabled, inspectionState])

  useEffect(() => {
    if (!enabled) return
    return () => {
      clearHoldTimeout()
      cancelInspection()
      heldRef.current = false
      tapToInspectRef.current = false
      syncInspectionHold(false)
    }
  }, [cancelInspection, clearHoldTimeout, enabled, syncInspectionHold])

  return {
    phase: engineSnapshot.phase,
    inInspectionHold,
    inspectionSecondsLeft,
    startMs,
    timeColor: getTimerReadoutColor({
      phase: engineSnapshot.phase,
      inInspectionHold,
      inspectionSecondsLeft,
    }),
    handlePointerDown,
    handlePointerUp,
  }
}
