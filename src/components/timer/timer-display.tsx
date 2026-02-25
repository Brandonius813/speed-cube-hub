"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatTimeMs } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"

type TimerState = "idle" | "ready" | "running" | "stopped"

type TimerDisplayProps = {
  onSolveComplete: (timeMs: number) => void
  lastTime: number | null
  showTimeWhileSolving: boolean
  disabled?: boolean
  inspectionActive?: boolean
  onStartInspection?: () => void
}

// Minimum hold time (ms) before timer is "ready" to start
const HOLD_THRESHOLD = 300

export function TimerDisplay({
  onSolveComplete,
  lastTime,
  showTimeWhileSolving,
  disabled = false,
  inspectionActive = false,
  onStartInspection,
}: TimerDisplayProps) {
  const [timerState, setTimerState] = useState<TimerState>("idle")
  const [displayTime, setDisplayTime] = useState(0)
  const startTimeRef = useRef(0)
  const animFrameRef = useRef<number | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerStateRef = useRef<TimerState>("idle")

  // Keep ref in sync with state for event handlers
  useEffect(() => {
    timerStateRef.current = timerState
  }, [timerState])

  const stopTimer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    const elapsed = performance.now() - startTimeRef.current
    const timeMs = Math.round(elapsed)
    setDisplayTime(timeMs)
    setTimerState("stopped")
    onSolveComplete(timeMs)
  }, [onSolveComplete])

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now()
    setTimerState("running")

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current
      setDisplayTime(Math.round(elapsed))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const handleHoldStart = useCallback(() => {
    if (disabled) return

    const currentState = timerStateRef.current

    // If timer is running, stop it
    if (currentState === "running") {
      stopTimer()
      return
    }

    // If inspection is enabled and we're idle, start inspection instead
    if (currentState === "idle" && inspectionActive && onStartInspection) {
      onStartInspection()
      return
    }

    // Start hold-to-ready
    if (currentState === "idle" || currentState === "stopped") {
      holdTimerRef.current = setTimeout(() => {
        setTimerState("ready")
      }, HOLD_THRESHOLD)
    }
  }, [disabled, inspectionActive, onStartInspection, stopTimer])

  const handleHoldEnd = useCallback(() => {
    // Clear hold timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    const currentState = timerStateRef.current

    // If ready, start the timer
    if (currentState === "ready") {
      setDisplayTime(0)
      startTimer()
    }
  }, [startTimer])

  // Keyboard handlers
  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Any key stops the timer when running
      if (timerStateRef.current === "running") {
        e.preventDefault()
        stopTimer()
        return
      }

      // Only spacebar starts the hold-to-ready flow
      if (e.code === "Space") {
        e.preventDefault()
        if (e.repeat) return // Ignore key repeat
        handleHoldStart()
      }

      // Escape to reset from ready/stopped to idle
      if (e.code === "Escape") {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current)
          holdTimerRef.current = null
        }
        setTimerState("idle")
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        handleHoldEnd()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [disabled, handleHoldStart, handleHoldEnd, stopTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    }
  }, [])

  // Determine what to display
  const getDisplayText = () => {
    switch (timerState) {
      case "idle":
        return lastTime !== null ? formatTimeMs(lastTime) : "0.000"
      case "ready":
        return "0.000"
      case "running":
        return showTimeWhileSolving
          ? formatTimeMs(displayTime)
          : "Solving..."
      case "stopped":
        return formatTimeMs(displayTime)
    }
  }

  const getTimeColor = () => {
    switch (timerState) {
      case "ready":
        return "text-green-400"
      case "running":
        return "text-foreground"
      case "stopped":
        return "text-foreground"
      default:
        return "text-muted-foreground"
    }
  }

  const getHintText = () => {
    switch (timerState) {
      case "idle":
        if (inspectionActive) return "Press space to start inspection"
        return "Hold space to start"
      case "ready":
        return "Release to start"
      case "running":
        return "Press any key to stop"
      case "stopped":
        return "Hold space for next solve"
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 select-none touch-none"
      onTouchStart={(e) => {
        e.preventDefault()
        handleHoldStart()
      }}
      onTouchEnd={(e) => {
        e.preventDefault()
        handleHoldEnd()
      }}
    >
      {/* Big time display */}
      <div
        className={cn(
          "font-mono text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tabular-nums tracking-tight transition-colors duration-150",
          getTimeColor()
        )}
      >
        {getDisplayText()}
      </div>

      {/* Hint text */}
      <p className="mt-4 text-sm text-muted-foreground">
        {getHintText()}
      </p>
    </div>
  )
}
