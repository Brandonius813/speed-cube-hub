import {
  computeCompSimCheckpoint,
  getOfficialElapsedTime,
  normalizeCompSimConfig,
  type CompSimCutoffRule,
  type CompSimEndedReason,
  type CompSimRoundConfig,
  type CompSimScene,
  type CompSimSolve,
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
  | { type: "SOLVE_COMPLETE"; time_ms: number; penalty: "+2" | "DNF" | null; scramble: string }
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

function randomWait(): number {
  return 30_000 + Math.random() * 120_000
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
      const wait = randomWait()
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

    case "SOLVE_COMPLETE": {
      if (state.phase !== "solving") return state
      const solve: CompSimSolve = {
        time_ms: event.time_ms,
        penalty: event.penalty,
        scramble: event.scramble,
      }
      const solves = [...state.solves, solve]
      const officialElapsedMs = state.officialElapsedMs + getOfficialElapsedTime(solve)
      const cutoffCheck = shouldEndForCutoff(solves, state.roundConfig.cutoff)
      const isSolveLimitReached =
        state.roundConfig.cumulativeTimeLimitMs != null &&
        officialElapsedMs >= state.roundConfig.cumulativeTimeLimitMs
      const didFinishAllSolves = solves.length >= state.roundConfig.plannedSolveCount
      const endedReason =
        cutoffCheck.endedReason ??
        (didFinishAllSolves
          ? "completed"
          : isSolveLimitReached
            ? "time_limit_reached"
            : null)

      return {
        ...state,
        phase: endedReason ? "sim_complete" : "solve_recorded",
        solves,
        endedReason,
        cutoffMet:
          cutoffCheck.cutoffMet === null ? state.cutoffMet : cutoffCheck.cutoffMet,
        checkpointResultMs:
          cutoffCheck.checkpointResultMs ?? state.checkpointResultMs,
        officialElapsedMs,
      }
    }

    case "ADVANCE_NEXT":
      if (state.phase !== "solve_recorded") return state
      return {
        ...state,
        phase: "scramble_shown",
        solveIndex: state.solveIndex + 1,
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
