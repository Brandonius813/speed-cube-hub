"use client"

import { useCallback, useEffect, useRef } from "react"
import { emitTimerTelemetry } from "@/lib/timer/telemetry"

type WakeLockContext = "main_timer" | "comp_sim"

type UseScreenWakeLockOptions = {
  enabled: boolean
  context: WakeLockContext
}

export function useScreenWakeLock({
  enabled,
  context,
}: UseScreenWakeLockOptions): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const requestInFlightRef = useRef<Promise<void> | null>(null)
  const requestWakeLockRef = useRef<() => Promise<void>>(async () => {})
  const enabledRef = useRef(enabled)
  const contextRef = useRef(context)
  const unsupportedLoggedRef = useRef(false)
  const requestFailedLoggedRef = useRef(false)

  const logUnsupported = useCallback(() => {
    if (unsupportedLoggedRef.current) return
    unsupportedLoggedRef.current = true
    emitTimerTelemetry("timer_error", {
      scope: "wake_lock_unsupported",
      context: contextRef.current,
    })
  }, [])

  const logRequestFailed = useCallback((error: unknown) => {
    if (requestFailedLoggedRef.current) return
    requestFailedLoggedRef.current = true
    emitTimerTelemetry("timer_error", {
      scope: "wake_lock_request_failed",
      context: contextRef.current,
      message: error instanceof Error ? error.message : String(error),
    })
  }, [])

  const handleRelease = useCallback((event: Event) => {
    const releasedSentinel = event.target as WakeLockSentinel | null
    if (sentinelRef.current === releasedSentinel) {
      sentinelRef.current = null
    }

    if (!enabledRef.current) return
    if (typeof document === "undefined" || document.visibilityState !== "visible") return
    if (sentinelRef.current) return

    void requestWakeLockRef.current()
  }, [])

  const releaseWakeLock = useCallback(async () => {
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    if (!sentinel) return
    sentinel.removeEventListener("release", handleRelease)
    await sentinel.release().catch(() => {})
  }, [handleRelease])

  const requestWakeLock = useCallback(async () => {
    if (!enabledRef.current) return
    if (typeof document === "undefined" || document.visibilityState !== "visible") return
    if (sentinelRef.current || requestInFlightRef.current) return

    const wakeLock = typeof navigator !== "undefined" ? navigator.wakeLock : undefined
    if (!wakeLock) {
      logUnsupported()
      return
    }

    requestInFlightRef.current = wakeLock
      .request("screen")
      .then((sentinel) => {
        if (!enabledRef.current || document.visibilityState !== "visible") {
          sentinel.removeEventListener("release", handleRelease)
          return sentinel.release().catch(() => {})
        }
        sentinel.addEventListener("release", handleRelease)
        sentinelRef.current = sentinel
      })
      .catch((error) => {
        logRequestFailed(error)
      })
      .finally(() => {
        requestInFlightRef.current = null
      })

    await requestInFlightRef.current
  }, [handleRelease, logRequestFailed, logUnsupported])

  useEffect(() => {
    enabledRef.current = enabled
    contextRef.current = context
    requestWakeLockRef.current = requestWakeLock
  }, [context, enabled, requestWakeLock])

  useEffect(() => {
    if (enabled) {
      void requestWakeLock()
      return
    }
    void releaseWakeLock()
  }, [enabled, releaseWakeLock, requestWakeLock])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock()
        return
      }
      void releaseWakeLock()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [releaseWakeLock, requestWakeLock])

  useEffect(() => {
    return () => {
      void releaseWakeLock()
    }
  }, [releaseWakeLock])
}
