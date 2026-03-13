"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { resolveInputTimestamp } from "@/lib/timer/input-timestamp"
import { getSolveElapsedMs, roundTelemetryMs } from "@/lib/timer/timing-core"

type UseSolveClockOptions = {
  enabled?: boolean
  onStall?: (deltaMs: number) => void
  onInputDelay?: (delayMs: number) => void
}

export function useSolveClock({
  enabled = true,
  onStall,
  onInputDelay,
}: UseSolveClockOptions = {}) {
  const [displayElapsedMs, setDisplayElapsedMs] = useState(0)
  const [frozenElapsedMs, setFrozenElapsedMs] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const lastFrameRef = useRef<number | null>(null)
  const lastStallRef = useRef(0)

  const emitInputDelay = useCallback(
    (timestamp?: number | null) => {
      if (!onInputDelay) return
      const resolved = resolveInputTimestamp(timestamp)
      onInputDelay(roundTelemetryMs(Math.max(0, performance.now() - resolved)))
    },
    [onInputDelay]
  )

  useEffect(() => {
    if (!enabled || !isRunningRef.current || startedAtRef.current === null) {
      lastFrameRef.current = null
      return
    }

    let raf = 0
    let active = true

    const tick = (ts: number) => {
      if (!active || startedAtRef.current === null) return
      if (lastFrameRef.current !== null && onStall) {
        const delta = ts - lastFrameRef.current
        if (delta > 250 && ts - lastStallRef.current > 1000) {
          lastStallRef.current = ts
          onStall(roundTelemetryMs(delta))
        }
      }
      lastFrameRef.current = ts
      setDisplayElapsedMs(getSolveElapsedMs(startedAtRef.current, ts))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      active = false
      cancelAnimationFrame(raf)
    }
  }, [enabled, onStall, startedAt])

  const startSolve = useCallback(
    (timestamp?: number | null) => {
      emitInputDelay(timestamp)
      const resolved = resolveInputTimestamp(timestamp)
      startedAtRef.current = resolved
      isRunningRef.current = true
      setStartedAt(resolved)
      setFrozenElapsedMs(null)
      setDisplayElapsedMs(0)
      lastFrameRef.current = null
      return resolved
    },
    [emitInputDelay]
  )

  const stopSolve = useCallback(
    (timestamp?: number | null) => {
      emitInputDelay(timestamp)
      const start = startedAtRef.current ?? resolveInputTimestamp(timestamp)
      const stoppedAt = resolveInputTimestamp(timestamp)
      const elapsedMs = getSolveElapsedMs(start, stoppedAt)
      isRunningRef.current = false
      setDisplayElapsedMs(elapsedMs)
      setFrozenElapsedMs(elapsedMs)
      return elapsedMs
    },
    [emitInputDelay]
  )

  const finalizeExternalSolve = useCallback((elapsedMs: number) => {
    isRunningRef.current = false
    setDisplayElapsedMs(elapsedMs)
    setFrozenElapsedMs(elapsedMs)
    return elapsedMs
  }, [])

  const clearFrozenElapsed = useCallback(() => {
    setFrozenElapsedMs(null)
  }, [])

  return {
    displayElapsedMs,
    frozenElapsedMs,
    startedAt,
    startSolve,
    stopSolve,
    finalizeExternalSolve,
    clearFrozenElapsed,
  }
}
