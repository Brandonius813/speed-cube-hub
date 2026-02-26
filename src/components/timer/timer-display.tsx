"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatTimeMs } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import {
  getSwipeDirection,
  SWIPE_THRESHOLD,
  type SwipeDirection,
} from "@/lib/timer/swipe-directions"

type TimerState = "idle" | "holding" | "ready" | "running" | "stopped"

export const HOLD_DURATION_OPTIONS = [0, 100, 200, 300, 500, 1000] as const
export type HoldDuration = (typeof HOLD_DURATION_OPTIONS)[number]
export const DEFAULT_HOLD_DURATION: HoldDuration = 300

export type TimerSize = "small" | "medium" | "large"
export type TimerUpdateMode = "realtime" | "seconds" | "hidden"

const TIMER_SIZE_CLASSES: Record<TimerSize, string> = {
  small: "text-4xl sm:text-5xl md:text-6xl",
  medium: "text-5xl sm:text-6xl md:text-7xl lg:text-8xl",
  large: "text-6xl sm:text-7xl md:text-8xl lg:text-9xl",
}

const SMALL_DECIMAL_SIZE: Record<TimerSize, string> = {
  small: "text-2xl sm:text-3xl md:text-4xl",
  medium: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
  large: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl",
}

export type { SwipeDirection }

type TimerDisplayProps = {
  onSolveComplete: (timeMs: number) => void
  onRunningChange?: (isRunning: boolean) => void
  onSwipe?: (direction: SwipeDirection) => void
  lastTime: number | null
  timerUpdateMode?: TimerUpdateMode
  timerSize?: TimerSize
  smallDecimals?: boolean
  holdDuration?: HoldDuration
  disabled?: boolean
  inspectionActive?: boolean
  onStartInspection?: () => void
  /** Whether there are solves to apply swipe actions to */
  hasSolves?: boolean
}

export function TimerDisplay({
  onSolveComplete,
  onRunningChange,
  onSwipe,
  lastTime,
  timerUpdateMode = "realtime",
  timerSize = "large",
  smallDecimals = false,
  holdDuration = DEFAULT_HOLD_DURATION,
  disabled = false,
  inspectionActive = false,
  onStartInspection,
  hasSolves = false,
}: TimerDisplayProps) {
  const [timerState, setTimerState] = useState<TimerState>("idle")
  const [displayTime, setDisplayTime] = useState(0)
  const startTimeRef = useRef(0)
  const animFrameRef = useRef<number | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerStateRef = useRef<TimerState>("idle")

  // Swipe gesture tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const isSwipingRef = useRef(false)

  // Keep ref in sync with state for event handlers
  useEffect(() => {
    timerStateRef.current = timerState
  }, [timerState])

  // Notify parent when timer starts/stops running
  useEffect(() => {
    onRunningChange?.(timerState === "running")
  }, [timerState, onRunningChange])

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

    // Start hold-to-ready: immediately go red, then green after threshold
    if (currentState === "idle" || currentState === "stopped") {
      if (holdDuration === 0) {
        // No hold delay — go straight to ready
        setTimerState("ready")
      } else {
        setTimerState("holding")
        holdTimerRef.current = setTimeout(() => {
          setTimerState("ready")
        }, holdDuration)
      }
    }
  }, [disabled, inspectionActive, onStartInspection, stopTimer, holdDuration])

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

    // If still holding (released too early), go back to idle
    if (currentState === "holding") {
      setTimerState("idle")
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

  // Format whole seconds only (no decimals)
  const formatSeconds = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    if (totalSeconds < 60) return `${totalSeconds}`
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Determine what to display
  const getDisplayText = () => {
    switch (timerState) {
      case "idle":
        return lastTime !== null ? formatTimeMs(lastTime) : "0.000"
      case "holding":
      case "ready":
        return "0.000"
      case "running":
        if (timerUpdateMode === "hidden") return "Solving..."
        if (timerUpdateMode === "seconds") return formatSeconds(displayTime)
        return formatTimeMs(displayTime)
      case "stopped":
        return formatTimeMs(displayTime)
    }
  }

  const getTimeColor = () => {
    switch (timerState) {
      case "holding":
        return "text-red-400"
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
        if (hasSolves && onSwipe) return "Hold to start · Swipe for actions"
        return "Hold space to start"
      case "holding":
        return "Keep holding..."
      case "ready":
        return "Release to start"
      case "running":
        return "Press any key to stop"
      case "stopped":
        if (hasSolves && onSwipe) return "Hold for next · Swipe for actions"
        return "Hold space for next solve"
    }
  }

  // Touch handlers with swipe detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    isSwipingRef.current = false

    // If running, always stop immediately (no swipe check)
    if (timerStateRef.current === "running") {
      handleHoldStart()
      return
    }

    handleHoldStart()
  }, [handleHoldStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!touchStartRef.current || isSwipingRef.current) return

    // Swipe only works when timer is idle or stopped AND there are solves
    const state = timerStateRef.current
    if (state !== "idle" && state !== "stopped" && state !== "holding") return
    if (!hasSolves || !onSwipe) return

    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist >= SWIPE_THRESHOLD) {
      // Movement exceeded threshold — this is a swipe, cancel hold
      isSwipingRef.current = true
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      // Reset timer state since we're swiping, not starting
      if (state === "holding") {
        setTimerState("idle")
      }
    }
  }, [hasSolves, onSwipe])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (isSwipingRef.current && touchStartRef.current && onSwipe) {
      // Compute swipe direction from start to end
      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y
      const direction = getSwipeDirection(dx, dy)
      if (direction) {
        onSwipe(direction)
      }
      touchStartRef.current = null
      isSwipingRef.current = false
      return
    }

    touchStartRef.current = null
    isSwipingRef.current = false
    handleHoldEnd()
  }, [handleHoldEnd, onSwipe])

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Big time display */}
      <div
        className={cn(
          "font-mono font-bold tabular-nums tracking-tight transition-colors duration-150",
          TIMER_SIZE_CLASSES[timerSize],
          getTimeColor()
        )}
      >
        {(() => {
          const text = getDisplayText()
          // Show small decimals unless running in seconds/hidden mode (no decimals to shrink)
          const showSmall = smallDecimals &&
            !(timerState === "running" && timerUpdateMode !== "realtime")
          return showSmall ? (
            <SmallDecimalTime text={text} smallClass={SMALL_DECIMAL_SIZE[timerSize]} />
          ) : text
        })()}
      </div>

      {/* Hint text */}
      <p className="mt-4 text-sm text-muted-foreground">
        {getHintText()}
      </p>
    </div>
  )
}

/** Renders time with the decimal portion in a smaller font size */
function SmallDecimalTime({ text, smallClass }: { text: string; smallClass: string }) {
  // Find the decimal point — everything after it is smaller
  const dotIndex = text.lastIndexOf(".")
  if (dotIndex === -1) return <>{text}</>

  const integerPart = text.slice(0, dotIndex)
  const decimalPart = text.slice(dotIndex)

  return (
    <>
      {integerPart}
      <span className={smallClass}>{decimalPart}</span>
    </>
  )
}
