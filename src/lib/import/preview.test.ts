import { describe, expect, it } from "vitest"

import { formatSolveTime, secondsToTruncatedMilliseconds } from "../utils"
import {
  buildRawSolvePreview,
  buildSessionSummariesFromRawSolves,
  getFlaggedSolveIndexes,
} from "./preview"
import type { RawImportSolve } from "./types"

function makeSolve(
  timeMs: number,
  overrides: Partial<RawImportSolve> = {}
): RawImportSolve {
  return {
    time_ms: timeMs,
    penalty: overrides.penalty ?? null,
    scramble: overrides.scramble ?? "",
    date: overrides.date ?? "2026-03-01",
  }
}

describe("import preview helpers", () => {
  it("preserves milliseconds and truncates time formatting", () => {
    expect(secondsToTruncatedMilliseconds(3.799)).toBe(3799)
    expect(formatSolveTime(3.799)).toBe("3.79")
  })

  it("truncates raw-solve session summaries instead of rounding", () => {
    const sessions = buildSessionSummariesFromRawSolves(
      [makeSolve(3799), makeSolve(3800), makeSolve(3800)],
      "333",
      30
    )

    expect(sessions).toHaveLength(1)
    expect(sessions[0].avg_time).toBe(3.79)
    expect(sessions[0].best_time).toBe(3.79)
  })

  it("computes current and best ao stats from included solves", () => {
    const solves = Array.from({ length: 100 }, () => makeSolve(10000))
    const preview = buildRawSolvePreview({
      source: "CubeTime",
      rawSolves: solves,
      event: "333",
      secondsPerSolve: 30,
      pbCount: 0,
    })

    expect(preview.bestSingleMs).toBe(10000)
    expect(preview.currentStats.ao5).toBe(10000)
    expect(preview.currentStats.ao12).toBe(10000)
    expect(preview.currentStats.ao100).toBe(10000)
    expect(preview.bestStats.ao5).toBe(10000)
    expect(preview.bestStats.ao12).toBe(10000)
    expect(preview.bestStats.ao100).toBe(10000)
  })

  it("handles DNF windows in rolling preview stats", () => {
    const solves = Array.from({ length: 12 }, () => makeSolve(10000))
    solves[10] = makeSolve(10000, { penalty: "DNF" })
    solves[11] = makeSolve(10000, { penalty: "DNF" })

    const preview = buildRawSolvePreview({
      source: "csTimer",
      rawSolves: solves,
      event: "333",
      secondsPerSolve: 30,
      pbCount: 0,
    })

    expect(preview.currentStats.ao5).toBeNull()
    expect(preview.currentStats.ao12).toBeNull()
    expect(preview.bestStats.ao5).toBe(10000)
    expect(preview.bestStats.ao12).toBeNull()
  })

  it("flags IQR outliers while ignoring DNFs, small files, and flat datasets", () => {
    const outlierSet = getFlaggedSolveIndexes([
      makeSolve(10000),
      makeSolve(10010),
      makeSolve(9990),
      makeSolve(10020),
      makeSolve(9980),
      makeSolve(10000),
      makeSolve(10030),
      makeSolve(10010),
      makeSolve(10000),
      makeSolve(2500),
      makeSolve(0, { penalty: "DNF" }),
    ])
    expect(outlierSet.has(9)).toBe(true)
    expect(outlierSet.has(10)).toBe(false)

    expect(
      getFlaggedSolveIndexes(Array.from({ length: 7 }, () => makeSolve(10000))).size
    ).toBe(0)

    expect(
      getFlaggedSolveIndexes(Array.from({ length: 8 }, () => makeSolve(10000))).size
    ).toBe(0)
  })

  it("recomputes counts, stats, and sessions when solves are excluded", () => {
    const solves = [
      makeSolve(3000),
      ...Array.from({ length: 7 }, () => makeSolve(10000)),
    ]

    const excludedPreview = buildRawSolvePreview({
      source: "CubeTime",
      rawSolves: solves,
      event: "333",
      secondsPerSolve: 30,
      excludedSolveIndexes: new Set([0]),
      pbCount: 0,
    })

    expect(excludedPreview.totalSolveCount).toBe(8)
    expect(excludedPreview.includedSolveCount).toBe(7)
    expect(excludedPreview.bestSingleMs).toBe(10000)
    expect(excludedPreview.sessions[0].num_solves).toBe(7)
    expect(excludedPreview.includedFlaggedCount).toBe(0)
  })
})
