export type TimerTelemetryEventName =
  | "timer_stall_detected"
  | "longtask_while_running"
  | "timer_input_delay_ms"
  | "timer_display_mismatch_ms"
  | "timer_solve_commit_ms"
  | "timer_inspection_penalty_eval"
  | "scramble_worker_timeout"
  | "stats_worker_latency_ms"
  | "timer_error"

export type TimerTelemetryEvent = {
  name: TimerTelemetryEventName
  timestamp: number
  payload?: Record<string, unknown>
}

declare global {
  interface Window {
    __timerTelemetry?: TimerTelemetryEvent[]
  }
}

export function emitTimerTelemetry(
  name: TimerTelemetryEventName,
  payload?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return

  const event: TimerTelemetryEvent = {
    name,
    timestamp: Date.now(),
    payload,
  }

  const bucket = (window.__timerTelemetry ??= [])
  bucket.push(event)
  if (bucket.length > 500) {
    bucket.splice(0, bucket.length - 500)
  }

  window.dispatchEvent(new CustomEvent("timer-telemetry", { detail: event }))

  if (process.env.NODE_ENV !== "production") {
    // Keep this low-noise in dev while still making profiling easy.
    console.debug("[timer-telemetry]", event)
  }
}
