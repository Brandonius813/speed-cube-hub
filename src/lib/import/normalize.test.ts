import { describe, expect, it } from "vitest"

import { buildImportedPbs } from "./normalize"
import type { NormalizedPB, NormalizedSolve } from "./types"

const SOLVES: NormalizedSolve[] = [
  {
    time_seconds: 9,
    date: "2026-03-01",
    is_dnf: false,
    penalty: null,
    scramble: "R U R'",
  },
  {
    time_seconds: 11,
    date: "2026-03-01",
    is_dnf: false,
    penalty: null,
    scramble: "U R U'",
  },
]

const EXPLICIT_PBS: NormalizedPB[] = [
  {
    event: "333",
    pb_type: "Ao5",
    time_seconds: 12.34,
    date_achieved: "2026-02-01",
  },
]

describe("buildImportedPbs", () => {
  it("keeps explicit PBs and derives the current best single from included solves", () => {
    expect(
      buildImportedPbs({
        explicitPbs: EXPLICIT_PBS,
        solves: SOLVES,
        event: "333",
      })
    ).toEqual([
      EXPLICIT_PBS[0],
      {
        event: "333",
        pb_type: "Single",
        time_seconds: 9,
        date_achieved: "2026-03-01",
      },
    ])
  })

  it("recomputes the derived single PB when the fastest solve is excluded", () => {
    expect(
      buildImportedPbs({
        explicitPbs: EXPLICIT_PBS,
        solves: SOLVES,
        event: "333",
        excludedSolveIndexes: new Set([0]),
      })
    ).toEqual([
      EXPLICIT_PBS[0],
      {
        event: "333",
        pb_type: "Single",
        time_seconds: 11,
        date_achieved: "2026-03-01",
      },
    ])
  })

  it("drops derived PBs entirely when every solve is excluded", () => {
    expect(
      buildImportedPbs({
        explicitPbs: EXPLICIT_PBS,
        solves: SOLVES,
        event: "333",
        excludedSolveIndexes: new Set([0, 1]),
      })
    ).toEqual(EXPLICIT_PBS)
  })
})
