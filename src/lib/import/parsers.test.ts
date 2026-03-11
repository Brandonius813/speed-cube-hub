import { describe, expect, it } from "vitest"

import { parseCsTimer, parseCubeTime, parseTwistyTimer } from "./parsers"
import { buildRawSolvePreview } from "./preview"

describe("timer import parsers", () => {
  it("exposes csTimer raw solves through the shared preview payload", () => {
    const times = [
      "10.00",
      "10.05",
      "9.95",
      "10.10",
      "9.90",
      "10.02",
      "10.08",
      "9.98",
      "10.04",
      "10.00",
      "10.06",
      "40.00",
    ]
    const rows = [
      "No.;Time;Comment;Scramble;Date;P.1",
      ...times.map((time, index) => {
        return `${index + 1};${time};;R U R';2026-03-01 08:${String(index).padStart(2, "0")}:00;${time}`
      }),
    ]
    const result = parseCsTimer(rows.join("\n"))

    expect(result.source).toBe("csTimer")
    expect(result.preview?.totalSolves).toBe(12)
    expect(result.preview?.rawSessions).toEqual([
      {
        session_date: "2026-03-01",
        num_solves: 12,
        num_dnf: 0,
        avg_time: 12.51,
        best_time: 9.9,
      },
    ])

    const preview = buildRawSolvePreview({
      source: result.source,
      rawSolves: result.preview?.rawSolves ?? [],
      event: "333",
      secondsPerSolve: 30,
      pbCount: 0,
    })

    expect(preview.currentStats.ao5).not.toBeNull()
    expect(preview.currentStats.ao12).not.toBeNull()
    expect(preview.flaggedCount).toBe(1)
  })

  it("exposes CubeTime raw solves through the shared preview payload", () => {
    const rows = [
      "Time,Comment,Scramble,Date",
      "9.63,,R U R',2026-03-01 20:39:49 +0000",
      "10.12,,U R U',2026-03-01 20:41:49 +0000",
    ]
    const result = parseCubeTime(rows.join("\n"))

    expect(result.source).toBe("CubeTime")
    expect(result.preview?.totalSolves).toBe(2)
    expect(result.preview?.rawSolves).toHaveLength(2)
    expect(result.preview?.rawSessions).toHaveLength(1)
  })

  it("exposes Twisty Timer raw solves through the shared preview payload", () => {
    const rows = [
      "Puzzle;Category;Time(millis);Date(millis);Scramble;Penalty;Comment",
      "333;Normal;12345;1740787200000;R U R';;clean solve",
      "333;Normal;14567;1740787260000;U R U';+2;plus two",
    ]
    const result = parseTwistyTimer(rows.join("\n"))

    expect(result.source).toBe("Twisty Timer")
    expect(result.detectedEvent).toBe("333")
    expect(result.preview?.totalSolves).toBe(2)
    expect(result.preview?.rawSolves).toEqual([
      {
        time_ms: 12345,
        penalty: null,
        scramble: "",
        date: "2025-02-28",
      },
      {
        time_ms: 14567,
        penalty: "+2",
        scramble: "",
        date: "2025-02-28",
      },
    ])
  })
})
