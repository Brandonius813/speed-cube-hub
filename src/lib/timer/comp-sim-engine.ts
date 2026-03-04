// Competition Simulator state machine
// Follows the same dispatch/subscribe/getSnapshot pattern as engine.ts

export type CompSimPhase =
  | "idle"           // Not started — shows start button + noise selector
  | "scramble_shown" // Scramble visible, "Cube is under cover" button
  | "waiting"        // Random delay, shows "Waiting for solve X"
  | "solve_cue"      // "Time to solve!" audio + visual cue
  | "ready"          // Solver may start inspection at will (spacebar/tap)
  | "inspecting"     // WCA 15-second inspection
  | "solving"        // Timer running
  | "solve_recorded" // Brief pause showing the time, then auto-advances
  | "sim_complete"   // All 5 done — results screen

export type BackgroundNoise = "none" | "crowd" | "brown"

export type CompSimSolve = {
  time_ms: number
  penalty: "+2" | "DNF" | null
  scramble: string
}

export type CompSimSnapshot = {
  phase: CompSimPhase
  solveIndex: number          // 0-4
  solves: CompSimSolve[]      // accumulated results
  scrambles: string[]         // pre-generated (length 5)
  backgroundNoise: BackgroundNoise
  groupNumber: number         // attempt # within session (1, 2, 3...)
  waitDurationMs: number      // randomized per solve
  waitStartMs: number         // timestamp when wait started
}

export type CompSimEvent =
  | { type: "START_SIM"; scrambles: string[]; groupNumber: number }
  | { type: "CONFIRM_CUBE_COVERED" }
  | { type: "WAIT_COMPLETE" }
  | { type: "CUE_DONE" }
  | { type: "READY_START" }
  | { type: "INSPECTION_START" }
  | { type: "SOLVE_START" }
  | { type: "SOLVE_COMPLETE"; time_ms: number; penalty: "+2" | "DNF" | null; scramble: string }
  | { type: "ADVANCE_NEXT" }
  | { type: "CANCEL_SIM" }
  | { type: "SET_NOISE"; noise: BackgroundNoise }
  | { type: "RESET" }

const DEFAULT: CompSimSnapshot = {
  phase: "idle",
  solveIndex: 0,
  solves: [],
  scrambles: [],
  backgroundNoise: "none",
  groupNumber: 1,
  waitDurationMs: 0,
  waitStartMs: 0,
}

/** Random wait between 30s and 2.5min (150s) */
function randomWait(): number {
  return 30_000 + Math.random() * 120_000
}

function reduce(state: CompSimSnapshot, event: CompSimEvent): CompSimSnapshot {
  switch (event.type) {
    case "START_SIM":
      if (state.phase !== "idle") return state
      return {
        ...state,
        phase: "scramble_shown",
        solveIndex: 0,
        solves: [],
        scrambles: event.scrambles,
        groupNumber: event.groupNumber,
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
      return state.phase === "waiting"
        ? { ...state, phase: "solve_cue" }
        : state

    case "CUE_DONE":
      return state.phase === "solve_cue"
        ? { ...state, phase: "ready" }
        : state

    case "READY_START":
      return state.phase === "ready"
        ? { ...state, phase: "inspecting" }
        : state

    case "INSPECTION_START":
      // Redundant but kept for explicit transitions
      return state.phase === "inspecting" ? state : state

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
      const done = solves.length >= 5
      return {
        ...state,
        phase: done ? "sim_complete" : "solve_recorded",
        solves,
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
      return { ...DEFAULT, backgroundNoise: state.backgroundNoise }

    case "SET_NOISE":
      return { ...state, backgroundNoise: event.noise }

    case "RESET":
      return { ...DEFAULT, backgroundNoise: state.backgroundNoise }

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
      listeners.forEach((fn) => fn(snapshot))
    },
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

// --- Ao5 Trimmed Mean Calculation ---

/** Effective time in ms (applies +2 penalty). DNF returns Infinity. */
function effectiveTime(solve: CompSimSolve): number {
  if (solve.penalty === "DNF") return Infinity
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

/** Format ms to time string (e.g. 10320 → "10.32", 65120 → "1:05.12") */
function fmtMs(ms: number): string {
  if (!isFinite(ms)) return "DNF"
  const s = ms / 1000
  if (s < 60) return s.toFixed(2)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(2).padStart(5, "0")}`
}

export type Ao5Result = {
  /** Formatted display: "(9.82)  11.24  10.55  12.03  (13.41)  =  11.27" */
  display: string
  /** Trimmed mean in ms (null if DNF) */
  trimmedMeanMs: number | null
  /** Index of best solve (0-4) */
  bestIdx: number
  /** Index of worst solve (0-4) */
  worstIdx: number
  /** Whether the average is a DNF (2+ DNFs) */
  isDnf: boolean
}

/**
 * Compute WCA-style Ao5 (trimmed mean).
 * Drop the best and worst, average the middle 3.
 * If 2+ solves are DNF, the entire average is DNF.
 */
export function computeAo5(solves: CompSimSolve[]): Ao5Result {
  if (solves.length !== 5) {
    return { display: "—", trimmedMeanMs: null, bestIdx: 0, worstIdx: 0, isDnf: true }
  }

  const times = solves.map(effectiveTime)
  let bestIdx = 0
  let worstIdx = 0

  for (let i = 1; i < 5; i++) {
    if (times[i] < times[bestIdx]) bestIdx = i
    if (times[i] > times[worstIdx]) worstIdx = i
  }

  // If best === worst index (all same time), offset worst
  if (bestIdx === worstIdx) worstIdx = bestIdx === 4 ? 3 : bestIdx + 1

  const middle = times.filter((_, i) => i !== bestIdx && i !== worstIdx)
  const dnfCount = solves.filter((s) => s.penalty === "DNF").length
  const isDnf = dnfCount >= 2

  const trimmedMeanMs = isDnf
    ? null
    : Math.round(middle.reduce((a, b) => a + b, 0) / middle.length)

  // Build display string
  const parts = solves.map((solve, i) => {
    const t = effectiveTime(solve)
    const str = solve.penalty === "DNF"
      ? "DNF"
      : solve.penalty === "+2"
        ? `${fmtMs(t)}+`
        : fmtMs(t)
    if (i === bestIdx || i === worstIdx) return `(${str})`
    return str
  })

  const avgStr = isDnf ? "DNF" : fmtMs(trimmedMeanMs!)
  const display = `${parts.join("  ")}  =  ${avgStr}`

  return { display, trimmedMeanMs, bestIdx, worstIdx, isDnf }
}
