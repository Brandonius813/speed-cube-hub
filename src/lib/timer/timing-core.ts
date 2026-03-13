import { truncateMsToCentiseconds } from "@/lib/timer/averages"

export const INSPECTION_PLUS_TWO_THRESHOLD_MS = 15_000
export const INSPECTION_DNF_THRESHOLD_MS = 17_000

export type InspectionTimerState = "idle" | "inspecting" | "overtime" | "done"

export type InspectionSnapshot = {
  elapsedMs: number
  remainingMs: number
  secondsLeft: number
  penalty: "+2" | "DNF" | null
  state: InspectionTimerState
  shouldAutoDnf: boolean
}

export function roundTelemetryMs(ms: number): number {
  return Math.round(ms * 100) / 100
}

export function getSolveElapsedMs(startedAt: number, now: number): number {
  return truncateMsToCentiseconds(Math.max(0, now - startedAt))
}

export function getInspectionSnapshot(
  startedAt: number | null,
  now: number
): InspectionSnapshot {
  if (startedAt === null) {
    return {
      elapsedMs: 0,
      remainingMs: INSPECTION_PLUS_TWO_THRESHOLD_MS,
      secondsLeft: 15,
      penalty: null,
      state: "idle",
      shouldAutoDnf: false,
    }
  }

  const elapsedMs = Math.max(0, now - startedAt)
  const remainingMs = INSPECTION_PLUS_TWO_THRESHOLD_MS - elapsedMs
  const secondsLeft = Math.ceil(remainingMs / 1000)
  const penalty =
    elapsedMs > INSPECTION_DNF_THRESHOLD_MS
      ? "DNF"
      : elapsedMs > INSPECTION_PLUS_TWO_THRESHOLD_MS
      ? "+2"
      : null
  const shouldAutoDnf = penalty === "DNF"
  const state = shouldAutoDnf
    ? "done"
    : penalty === "+2"
    ? "overtime"
    : "inspecting"

  return {
    elapsedMs,
    remainingMs,
    secondsLeft,
    penalty,
    state,
    shouldAutoDnf,
  }
}
