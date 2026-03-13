import { describe, expect, it } from "vitest"
import {
  getInspectionSnapshot,
  getSolveElapsedMs,
  INSPECTION_DNF_THRESHOLD_MS,
  INSPECTION_PLUS_TWO_THRESHOLD_MS,
} from "@/lib/timer/timing-core"

describe("getSolveElapsedMs", () => {
  it("truncates solve times to centiseconds", () => {
    expect(getSolveElapsedMs(100, 1234)).toBe(1130)
  })
})

describe("getInspectionSnapshot", () => {
  it("returns idle defaults when inspection has not started", () => {
    expect(getInspectionSnapshot(null, 5000)).toEqual({
      elapsedMs: 0,
      remainingMs: 15_000,
      secondsLeft: 15,
      penalty: null,
      state: "idle",
      shouldAutoDnf: false,
    })
  })

  it("tracks normal inspection time before penalties", () => {
    const snapshot = getInspectionSnapshot(1000, 8500)

    expect(snapshot.elapsedMs).toBe(7500)
    expect(snapshot.secondsLeft).toBe(8)
    expect(snapshot.penalty).toBeNull()
    expect(snapshot.state).toBe("inspecting")
  })

  it("marks +2 after fifteen seconds but before DNF", () => {
    const snapshot = getInspectionSnapshot(1000, 1000 + INSPECTION_PLUS_TWO_THRESHOLD_MS + 1)

    expect(snapshot.penalty).toBe("+2")
    expect(snapshot.state).toBe("overtime")
    expect(snapshot.shouldAutoDnf).toBe(false)
  })

  it("marks DNF only after the seventeen second threshold", () => {
    const snapshot = getInspectionSnapshot(1000, 1000 + INSPECTION_DNF_THRESHOLD_MS + 1)

    expect(snapshot.penalty).toBe("DNF")
    expect(snapshot.state).toBe("done")
    expect(snapshot.shouldAutoDnf).toBe(true)
  })
})
