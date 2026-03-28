import { useCallback, useEffect, useRef, useState } from "react"

const IDLE_DEADLINE_KEY = "timer-idle-timeout-at"
const WARNING_LEAD_SECONDS = 120 // 2-minute warning before auto-stop

type UseAutoSessionOptions = {
  autoStartEnabled: boolean
  autoStopEnabled: boolean
  idleTimeoutMin: number
  hasActiveSession: boolean
  sessionPaused: boolean
  solveCount: number
  timingActive: boolean
  practiceType: string
  onStartSession: () => void
  onEndSession: () => void
}

type UseAutoSessionReturn = {
  idleWarningSecondsLeft: number | null
  dismissIdleWarning: () => void
  autoStopReason: "idle" | null
  clearAutoStopReason: () => void
}

export function useAutoSession({
  autoStartEnabled,
  autoStopEnabled,
  idleTimeoutMin,
  hasActiveSession,
  sessionPaused,
  solveCount,
  timingActive,
  practiceType,
  onStartSession,
  onEndSession,
}: UseAutoSessionOptions): UseAutoSessionReturn {
  const [warningSecondsLeft, setWarningSecondsLeft] = useState<number | null>(null)
  const [autoStopReason, setAutoStopReason] = useState<"idle" | null>(null)

  // Stable callback refs (these functions are defined after the hook call in timer-content)
  const onStartRef = useRef(onStartSession)
  onStartRef.current = onStartSession
  const onEndRef = useRef(onEndSession)
  onEndRef.current = onEndSession

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevSolveCountRef = useRef(solveCount)

  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (warningIntervalRef.current !== null) {
      clearInterval(warningIntervalRef.current)
      warningIntervalRef.current = null
    }
    setWarningSecondsLeft(null)
    try {
      localStorage.removeItem(IDLE_DEADLINE_KEY)
    } catch {}
  }, [])

  const startIdleTimer = useCallback(() => {
    clearIdleTimers()
    if (!autoStopEnabled) return

    const timeoutMs = idleTimeoutMin * 60 * 1000
    const deadline = Date.now() + timeoutMs
    try {
      localStorage.setItem(IDLE_DEADLINE_KEY, String(deadline))
    } catch {}

    const silentMs = Math.max(0, timeoutMs - WARNING_LEAD_SECONDS * 1000)

    idleTimerRef.current = setTimeout(() => {
      // Start the warning countdown
      let remaining = Math.min(WARNING_LEAD_SECONDS, idleTimeoutMin * 60)
      setWarningSecondsLeft(remaining)

      warningIntervalRef.current = setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          clearIdleTimers()
          setAutoStopReason("idle")
          onEndRef.current()
        } else {
          setWarningSecondsLeft(remaining)
        }
      }, 1000)
    }, silentMs)
  }, [autoStopEnabled, idleTimeoutMin, clearIdleTimers])

  // Auto-start: when solve count goes from 0 to 1 with no active session
  useEffect(() => {
    const prev = prevSolveCountRef.current
    prevSolveCountRef.current = solveCount

    if (
      autoStartEnabled &&
      !hasActiveSession &&
      practiceType !== "Comp Sim" &&
      prev === 0 &&
      solveCount === 1
    ) {
      onStartRef.current()
    }
  }, [solveCount, autoStartEnabled, hasActiveSession, practiceType])

  // Reset idle timer on each new solve
  useEffect(() => {
    if (hasActiveSession && !sessionPaused && !timingActive && solveCount > 0) {
      startIdleTimer()
    }
  }, [solveCount, hasActiveSession, sessionPaused, timingActive, startIdleTimer])

  // Pause/resume idle timer when session pauses/resumes
  useEffect(() => {
    if (!hasActiveSession) return
    if (sessionPaused) {
      clearIdleTimers()
    } else if (solveCount > 0) {
      startIdleTimer()
    }
  }, [sessionPaused, hasActiveSession, solveCount, clearIdleTimers, startIdleTimer])

  // Clean up when session ends or is no longer active
  useEffect(() => {
    if (!hasActiveSession) {
      clearIdleTimers()
    }
  }, [hasActiveSession, clearIdleTimers])

  // On mount: check if an idle deadline has already passed
  useEffect(() => {
    if (!hasActiveSession || !autoStopEnabled) return
    try {
      const raw = localStorage.getItem(IDLE_DEADLINE_KEY)
      if (!raw) return
      const deadline = Number(raw)
      if (Number.isFinite(deadline) && deadline > 0 && Date.now() >= deadline) {
        localStorage.removeItem(IDLE_DEADLINE_KEY)
        setAutoStopReason("idle")
        onEndRef.current()
      }
    } catch {}
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current)
      if (warningIntervalRef.current !== null) clearInterval(warningIntervalRef.current)
    }
  }, [])

  const dismissIdleWarning = useCallback(() => {
    startIdleTimer() // resets full timer from scratch
  }, [startIdleTimer])

  const clearAutoStopReason = useCallback(() => {
    setAutoStopReason(null)
  }, [])

  return {
    idleWarningSecondsLeft: warningSecondsLeft,
    dismissIdleWarning,
    autoStopReason,
    clearAutoStopReason,
  }
}
