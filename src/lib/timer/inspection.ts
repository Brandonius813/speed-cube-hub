"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type InspectionState = "idle" | "inspecting" | "overtime" | "done"

type InspectionResult = {
  /** Seconds remaining (15 → 0, then negative for overtime) */
  secondsLeft: number
  /** Current inspection state */
  state: InspectionState
  /** Whether inspection is actively counting down */
  isInspecting: boolean
  /** Start the 15-second inspection countdown */
  startInspection: () => void
  /** Cancel inspection (e.g., user presses escape) */
  cancelInspection: () => void
  /** Mark inspection as done (timer started) — returns penalty if any */
  finishInspection: () => "+2" | "DNF" | null
}

/**
 * React hook for WCA inspection countdown.
 *
 * WCA rules:
 * - 15 seconds of inspection time
 * - Judge says "8 seconds" at 8s remaining (7 seconds elapsed)
 * - Judge says "12 seconds" at 12s remaining (3 seconds remaining)
 * - Starting after 15s but before 17s = +2 penalty
 * - Starting after 17s = DNF
 */
export function useInspection(): InspectionResult {
  const [state, setState] = useState<InspectionState>("idle")
  const [secondsLeft, setSecondsLeft] = useState(15)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const has8sWarned = useRef(false)
  const has12sWarned = useRef(false)

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return
    if (!("speechSynthesis" in window)) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.2
    utterance.volume = 1.0
    window.speechSynthesis.speak(utterance)
  }, [])

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startInspection = useCallback(() => {
    cleanup()
    setState("inspecting")
    setSecondsLeft(15)
    startTimeRef.current = Date.now()
    has8sWarned.current = false
    has12sWarned.current = false

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = 15 - elapsed

      setSecondsLeft(Math.ceil(remaining))

      // Voice warnings
      if (remaining <= 7 && !has8sWarned.current) {
        has8sWarned.current = true
        speak("8 seconds")
      }
      if (remaining <= 3 && !has12sWarned.current) {
        has12sWarned.current = true
        speak("12 seconds")
      }

      // Overtime (past 15s)
      if (remaining <= 0) {
        setState("overtime")
      }

      // Auto-DNF past 17s
      if (remaining <= -2) {
        cleanup()
        setState("done")
      }
    }, 100)
  }, [cleanup, speak])

  const cancelInspection = useCallback(() => {
    cleanup()
    setState("idle")
    setSecondsLeft(15)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
  }, [cleanup])

  const finishInspection = useCallback((): "+2" | "DNF" | null => {
    cleanup()
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    setState("done")

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }

    if (elapsed > 17) return "DNF"
    if (elapsed > 15) return "+2"
    return null
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    secondsLeft,
    state,
    isInspecting: state === "inspecting" || state === "overtime",
    startInspection,
    cancelInspection,
    finishInspection,
  }
}
