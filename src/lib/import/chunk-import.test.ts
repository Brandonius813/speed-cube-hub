import { describe, expect, it } from "vitest"

import { prepareImportedSolveChunks } from "./chunk-import"
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

describe("prepareImportedSolveChunks", () => {
  it("splits solves into server-action-safe chunks", () => {
    const chunks = prepareImportedSolveChunks(
      [makeSolve(1000), makeSolve(1100), makeSolve(1200), makeSolve(1300), makeSolve(1400)],
      2
    )

    expect(chunks).toHaveLength(3)
    expect(chunks.map((chunk) => chunk.length)).toEqual([2, 2, 1])
    expect(chunks[2][0].solve_number).toBe(5)
  })

  it("preserves solve order across chunk boundaries within the same day", () => {
    const chunks = prepareImportedSolveChunks(
      [
        makeSolve(1000, { date: "2026-03-01" }),
        makeSolve(1100, { date: "2026-03-01" }),
        makeSolve(1200, { date: "2026-03-01" }),
      ],
      2
    )

    expect(chunks[0][0].solved_at).toBe("2026-03-01T00:00:01.000Z")
    expect(chunks[0][1].solved_at).toBe("2026-03-01T00:00:02.000Z")
    expect(chunks[1][0].solved_at).toBe("2026-03-01T00:00:03.000Z")
  })
})
