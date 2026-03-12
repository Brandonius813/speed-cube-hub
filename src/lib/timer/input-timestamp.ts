const MAX_EVENT_TIMESTAMP_DRIFT_MS = 60_000
const MAX_FUTURE_SKEW_MS = 50

function isUsableTimestamp(candidate: number, now: number) {
  return (
    candidate >= 0 &&
    candidate <= now + MAX_FUTURE_SKEW_MS &&
    now - candidate <= MAX_EVENT_TIMESTAMP_DRIFT_MS
  )
}

export function resolveInputTimestamp(timestamp?: number | null): number {
  const now = performance.now()

  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return now
  }

  if (isUsableTimestamp(timestamp, now)) {
    return timestamp
  }

  const normalized = timestamp - performance.timeOrigin
  if (isUsableTimestamp(normalized, now)) {
    return normalized
  }

  return now
}
