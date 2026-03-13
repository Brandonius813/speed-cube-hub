import {
  computeCompSimCheckpoint,
  getOfficialElapsedTime,
  normalizeCompSimConfig,
  type CompSimCutoffRule,
  type CompSimEndedReason,
  type CompSimRoundConfig,
  type CompSimScene,
  type CompSimSolve,
  type CompSimWaitTimeRange,
} from "@/lib/timer/comp-sim-round"

export type CompSimPhase =
  | "idle"
  | "scramble_shown"
  | "waiting"
  | "solve_cue"
  | "ready"
  | "inspecting"
  | "solving"
  | "solve_recorded"
  | "sim_complete"

export type CompSimSnapshot = {
  phase: CompSimPhase
  solveIndex: number
  solves: CompSimSolve[]
  scrambles: string[]
  groupNumber: number
  waitDurationMs: number
  waitStartMs: number
  roundConfig: CompSimRoundConfig
  endedReason: CompSimEndedReason | null
  cutoffMet: boolean | null
  checkpointResultMs: number | null
  officialElapsedMs: number
}

export type CompSimEvent =
  | { type: "START_SIM"; scrambles: string[]; groupNumber: number; roundConfig: CompSimRoundConfig }
  | { type: "CONFIRM_CUBE_COVERED" }
  | { type: "WAIT_COMPLETE" }
  | { type: "CUE_DONE" }
  | { type: "READY_START" }
  | { type: "SOLVE_START" }
  | { type: "INSPECTION_DNF"; scramble: string }
  | { type: "SOLVE_COMPLETE"; time_ms: number; penalty: "+2" | "DNF" | null; scramble: string }
  | { type: "UPDATE_SOLVE_PENALTY"; solveIndex: number; penalty: "+2" | "DNF" | null }
  | { type: "ADVANCE_NEXT" }
  | { type: "CANCEL_SIM" }
  | { type: "SET_CONFIG"; roundConfig: CompSimRoundConfig }
  | { type: "RESET" }

const DEFAULT: CompSimSnapshot = {
  phase: "idle",
  solveIndex: 0,
  solves: [],
  scrambles: [],
  groupNumber: 1,
  waitDurationMs: 0,
  waitStartMs: 0,
  roundConfig: normalizeCompSimConfig(null),
  endedReason: null,
  cutoffMet: null,
  checkpointResultMs: null,
  officialElapsedMs: 0,
}

export const DEFAULT_COMP_SIM_SNAPSHOT: CompSimSnapshot = { ...DEFAULT }

type CompSimProgress = {
  solves: CompSimSolve[]
  endedReason: CompSimEndedReason | null
  cutoffMet: boolean | null
  checkpointResultMs: number | null
  officialElapsedMs: number
}

function randomWait(range: CompSimWaitTimeRange): number {
  if (range.maxMs <= range.minMs) return range.minMs
  return Math.round(range.minMs + Math.random() * (range.maxMs - range.minMs))
}

function shouldEndForCutoff(
  solves: CompSimSolve[],
  cutoff: CompSimCutoffRule | null
): { cutoffMet: boolean | null; checkpointResultMs: number | null; endedReason: CompSimEndedReason | null } {
  if (!cutoff || solves.length < cutoff.attempt) {
    return { cutoffMet: null, checkpointResultMs: null, endedReason: null }
  }

  const checkpoint = computeCompSimCheckpoint(solves, cutoff.attempt)
  if (!checkpoint) {
    return { cutoffMet: null, checkpointResultMs: null, endedReason: null }
  }

  const cutoffMet =
    checkpoint.resultMs !== null && checkpoint.resultMs <= cutoff.cutoffMs

  return {
    cutoffMet,
    checkpointResultMs: checkpoint.resultMs,
    endedReason: cutoffMet ? null : "cutoff_failed",
  }
}

function evaluateProgress(
  roundConfig: CompSimRoundConfig,
  solves: CompSimSolve[]
): CompSimProgress {
  const truncated: CompSimSolve[] = []
  let endedReason: CompSimEndedReason | null = null
  let cutoffMet: boolean | null = null
  let checkpointResultMs: number | null = null
  let officialElapsedMs = 0

  for (const solve of solves) {
    if (truncated.length >= roundConfig.plannedSolveCount) break
    truncated.push(solve)
    officialElapsedMs += getOfficialElapsedTime(solve)

    const cutoffCheck = shouldEndForCutoff(truncated, roundConfig.cutoff)
    const isSolveLimitReached =
      roundConfig.cumulativeTimeLimitMs != null &&
      officialElapsedMs >= roundConfig.cumulativeTimeLimitMs
    const didFinishAllSolves = truncated.length >= roundConfig.plannedSolveCount

    if (cutoffCheck.cutoffMet !== null) cutoffMet = cutoffCheck.cutoffMet
    if (cutoffCheck.checkpointResultMs != null) {
      checkpointResultMs = cutoffCheck.checkpointResultMs
    }

    endedReason =
      cutoffCheck.endedReason ??
      (didFinishAllSolves
        ? "completed"
        : isSolveLimitReached
          ? "time_limit_reached"
          : null)

    if (endedReason) break
  }

  return {
    solves: truncated,
    endedReason,
    cutoffMet,
    checkpointResultMs,
    officialElapsedMs,
  }
}

function applyProgress(
  state: CompSimSnapshot,
  progress: CompSimProgress,
  phase: CompSimPhase
): CompSimSnapshot {
  return {
    ...state,
    phase,
    solveIndex: progress.solves.length,
    solves: progress.solves,
    endedReason: progress.endedReason,
    cutoffMet: progress.cutoffMet,
    checkpointResultMs: progress.checkpointResultMs,
    officialElapsedMs: progress.officialElapsedMs,
  }
}

function resolveCompletedSolve(
  state: CompSimSnapshot,
  solve: CompSimSolve
): CompSimSnapshot {
  const progress = evaluateProgress(state.roundConfig, [...state.solves, solve])
  return applyProgress(state, progress, "solve_recorded")
}

function reduce(state: CompSimSnapshot, event: CompSimEvent): CompSimSnapshot {
  switch (event.type) {
    case "START_SIM":
      if (state.phase !== "idle" && state.phase !== "sim_complete") return state
      return {
        ...state,
        phase: "scramble_shown",
        solveIndex: 0,
        solves: [],
        scrambles: event.scrambles,
        groupNumber: event.groupNumber,
        roundConfig: normalizeCompSimConfig(event.roundConfig),
        endedReason: null,
        cutoffMet: null,
        checkpointResultMs: null,
        officialElapsedMs: 0,
      }

    case "CONFIRM_CUBE_COVERED": {
      if (state.phase !== "scramble_shown") return state
      const wait = randomWait(state.roundConfig.waitTimeRangeMs)
      return {
        ...state,
        phase: "waiting",
        waitDurationMs: wait,
        waitStartMs: Date.now(),
      }
    }

    case "WAIT_COMPLETE":
      return state.phase === "waiting" ? { ...state, phase: "solve_cue" } : state

    case "CUE_DONE":
      return state.phase === "solve_cue" ? { ...state, phase: "ready" } : state

    case "READY_START":
      return state.phase === "ready" ? { ...state, phase: "inspecting" } : state

    case "SOLVE_START":
      return state.phase === "inspecting" || state.phase === "solve_cue"
        ? { ...state, phase: "solving" }
        : state

    case "INSPECTION_DNF":
      return state.phase === "inspecting"
        ? resolveCompletedSolve(state, {
            time_ms: 0,
            penalty: "DNF",
            scramble: event.scramble,
          })
        : state

    case "SOLVE_COMPLETE": {
      if (state.phase !== "solving") return state
      return resolveCompletedSolve(state, {
        time_ms: event.time_ms,
        penalty: event.penalty,
        scramble: event.scramble,
      })
    }

    case "UPDATE_SOLVE_PENALTY": {
      if (state.solveIndex <= event.solveIndex || event.solveIndex < 0) return state
      const nextSolves = state.solves.map((solve, index) =>
        index === event.solveIndex ? { ...solve, penalty: event.penalty } : solve
      )
      const progress = evaluateProgress(state.roundConfig, nextSolves)
      const nextPhase =
        progress.endedReason != null
          ? "solve_recorded"
          : state.phase === "solve_recorded" || state.phase === "sim_complete"
            ? "solve_recorded"
            : state.phase
      return applyProgress(state, progress, nextPhase)
    }

    case "ADVANCE_NEXT":
      if (state.phase !== "solve_recorded") return state
      if (state.endedReason) {
        return {
          ...state,
          phase: "sim_complete",
        }
      }
      return {
        ...state,
        phase: "scramble_shown",
        solveIndex: state.solves.length,
      }

    case "CANCEL_SIM":
      return {
        ...DEFAULT,
        roundConfig: state.roundConfig,
      }

    case "SET_CONFIG":
      if (state.phase !== "idle" && state.phase !== "sim_complete") return state
      return {
        ...state,
        roundConfig: normalizeCompSimConfig(event.roundConfig),
      }

    case "RESET":
      return {
        ...DEFAULT,
        roundConfig: state.roundConfig,
      }

    default:
      return state
  }
}

export interface CompSimEngine {
  dispatch(event: CompSimEvent): void
  getSnapshot(): CompSimSnapshot
  subscribe(listener: (snapshot: CompSimSnapshot) => void): () => void
}

export function createCompSimEngine(): CompSimEngine {
  let snapshot: CompSimSnapshot = { ...DEFAULT }
  const listeners = new Set<(next: CompSimSnapshot) => void>()

  return {
    dispatch(event) {
      const next = reduce(snapshot, event)
      if (next === snapshot) return
      snapshot = next
      listeners.forEach((listener) => listener(snapshot))
    },
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type {
  CompSimCutoffRule,
  CompSimEndedReason,
  CompSimRoundConfig,
  CompSimScene,
  CompSimSolve,
}
