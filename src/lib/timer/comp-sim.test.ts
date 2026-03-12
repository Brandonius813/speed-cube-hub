import { describe, expect, it } from "vitest"
import { createCompSimEngine } from "@/lib/timer/comp-sim-engine"
import {
  computeCompSimRoundResult,
  normalizeCompSimConfig,
} from "@/lib/timer/comp-sim-round"

describe("computeCompSimRoundResult", () => {
  it("computes a single result", () => {
    const result = computeCompSimRoundResult("single", [
      { time_ms: 8234, penalty: null, scramble: "R U" },
    ])

    expect(result.resultMs).toBe(8234)
    expect(result.isDnf).toBe(false)
  })

  it("computes an mo3 result", () => {
    const result = computeCompSimRoundResult("mo3", [
      { time_ms: 10000, penalty: null, scramble: "A" },
      { time_ms: 10120, penalty: "+2", scramble: "B" },
      { time_ms: 9800, penalty: null, scramble: "C" },
    ])

    expect(result.resultMs).toBe(Math.round((10000 + 12120 + 9800) / 3))
    expect(result.isDnf).toBe(false)
  })

  it("computes an ao5 trimmed mean and handles one DNF", () => {
    const result = computeCompSimRoundResult("ao5", [
      { time_ms: 10000, penalty: null, scramble: "A" },
      { time_ms: 10100, penalty: null, scramble: "B" },
      { time_ms: 9800, penalty: null, scramble: "C" },
      { time_ms: 12000, penalty: null, scramble: "D" },
      { time_ms: 0, penalty: "DNF", scramble: "E" },
    ])

    expect(result.isDnf).toBe(false)
    expect(result.resultMs).toBe(Math.round((10000 + 10100 + 12000) / 3))
  })
})

describe("createCompSimEngine", () => {
  it("records an inspection timeout DNF without forcing a fake solving phase", () => {
    const engine = createCompSimEngine()
    engine.dispatch({
      type: "START_SIM",
      scrambles: ["A", "B", "C"],
      groupNumber: 1,
      roundConfig: normalizeCompSimConfig({
        format: "mo3",
      }),
    })
    engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })
    engine.dispatch({ type: "WAIT_COMPLETE" })
    engine.dispatch({ type: "CUE_DONE" })
    engine.dispatch({ type: "READY_START" })
    engine.dispatch({ type: "INSPECTION_DNF", scramble: "A" })

    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe("solve_recorded")
    expect(snapshot.solves).toEqual([
      { time_ms: 0, penalty: "DNF", scramble: "A" },
    ])
  })

  it("stops the round when solve 1 misses cutoff", () => {
    const engine = createCompSimEngine()
    engine.dispatch({
      type: "START_SIM",
      scrambles: ["A", "B", "C"],
      groupNumber: 1,
      roundConfig: normalizeCompSimConfig({
        format: "mo3",
        cutoff: { attempt: 1, cutoffMs: 9000 },
      }),
    })
    engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })
    engine.dispatch({ type: "WAIT_COMPLETE" })
    engine.dispatch({ type: "CUE_DONE" })
    engine.dispatch({ type: "READY_START" })
    engine.dispatch({ type: "SOLVE_START" })
    engine.dispatch({ type: "SOLVE_COMPLETE", time_ms: 10000, penalty: null, scramble: "A" })

    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe("sim_complete")
    expect(snapshot.endedReason).toBe("cutoff_failed")
    expect(snapshot.cutoffMet).toBe(false)
  })

  it("stops the round when cumulative time limit is reached", () => {
    const engine = createCompSimEngine()
    engine.dispatch({
      type: "START_SIM",
      scrambles: ["A", "B", "C"],
      groupNumber: 1,
      roundConfig: normalizeCompSimConfig({
        format: "mo3",
        cumulativeTimeLimitMs: 15000,
      }),
    })
    engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })
    engine.dispatch({ type: "WAIT_COMPLETE" })
    engine.dispatch({ type: "CUE_DONE" })
    engine.dispatch({ type: "READY_START" })
    engine.dispatch({ type: "SOLVE_START" })
    engine.dispatch({ type: "SOLVE_COMPLETE", time_ms: 8000, penalty: null, scramble: "A" })
    engine.dispatch({ type: "ADVANCE_NEXT" })
    engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })
    engine.dispatch({ type: "WAIT_COMPLETE" })
    engine.dispatch({ type: "CUE_DONE" })
    engine.dispatch({ type: "READY_START" })
    engine.dispatch({ type: "SOLVE_START" })
    engine.dispatch({ type: "SOLVE_COMPLETE", time_ms: 7200, penalty: null, scramble: "B" })

    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe("sim_complete")
    expect(snapshot.endedReason).toBe("time_limit_reached")
    expect(snapshot.officialElapsedMs).toBe(15200)
  })

  it("evaluates cutoff after solve 2 using the first-two-attempt mean", () => {
    const engine = createCompSimEngine()
    engine.dispatch({
      type: "START_SIM",
      scrambles: ["A", "B", "C", "D", "E"],
      groupNumber: 1,
      roundConfig: normalizeCompSimConfig({
        format: "ao5",
        cutoff: { attempt: 2, cutoffMs: 10800 },
      }),
    })

    const runSolve = (time_ms: number, scramble: string) => {
      engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })
      engine.dispatch({ type: "WAIT_COMPLETE" })
      engine.dispatch({ type: "CUE_DONE" })
      engine.dispatch({ type: "READY_START" })
      engine.dispatch({ type: "SOLVE_START" })
      engine.dispatch({ type: "SOLVE_COMPLETE", time_ms, penalty: null, scramble })
    }

    runSolve(10000, "A")
    engine.dispatch({ type: "ADVANCE_NEXT" })
    runSolve(11800, "B")

    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe("sim_complete")
    expect(snapshot.endedReason).toBe("cutoff_failed")
    expect(snapshot.checkpointResultMs).toBe(10900)
  })

  it("lets an inspection DNF fail cutoff immediately when solve 1 must make cutoff", () => {
    const engine = createCompSimEngine()
    engine.dispatch({
      type: "START_SIM",
      scrambles: ["A", "B", "C"],
      groupNumber: 1,
      roundConfig: normalizeCompSimConfig({
        format: "mo3",
        cutoff: { attempt: 1, cutoffMs: 9000 },
      }),
    })
    engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })
    engine.dispatch({ type: "WAIT_COMPLETE" })
    engine.dispatch({ type: "CUE_DONE" })
    engine.dispatch({ type: "READY_START" })
    engine.dispatch({ type: "INSPECTION_DNF", scramble: "A" })

    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe("sim_complete")
    expect(snapshot.endedReason).toBe("cutoff_failed")
    expect(snapshot.cutoffMet).toBe(false)
  })
})
