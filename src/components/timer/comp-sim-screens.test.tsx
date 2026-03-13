import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  ReadyWindowScreen,
  RoundSheet,
  SolveRecordedScreen,
} from "@/components/timer/comp-sim-screens"
import { normalizeCompSimConfig } from "@/lib/timer/comp-sim-round"

const baseSnapshot = {
  waitDurationMs: 0,
  waitStartMs: 0,
  endedReason: null,
  cutoffMet: null,
  checkpointResultMs: null,
  sitDownRequired: false,
  readyWindowStartedAtMs: null,
  readyWindowDeadlineMs: null,
  readyWindowExpired: false,
} as const

describe("SolveRecordedScreen", () => {
  it("keeps the shared light-weight timer styling for the recorded solve", () => {
    const markup = renderToStaticMarkup(
      <SolveRecordedScreen
        snapshot={{
          ...baseSnapshot,
          phase: "solve_recorded",
          solveIndex: 1,
          solves: [
            { time_ms: 9876, penalty: null, scramble: "R U R'" },
          ],
          scrambles: ["R U R'"],
          groupNumber: 1,
          roundConfig: normalizeCompSimConfig({ format: "ao5" }),
          officialElapsedMs: 9876,
        }}
        timerReadoutTextSize="md"
        onPenaltyChange={() => {}}
        onContinue={() => {}}
      />
    )

    expect(markup).toContain("font-light")
    expect(markup).toContain("tabular-nums")
    expect(markup).toContain("9.87")
  })
})

describe("RoundSheet", () => {
  it("shows solve-5 BPA and WPA pressure on an active ao5 after four solves", () => {
    const markup = renderToStaticMarkup(
      <RoundSheet
        snapshot={{
          ...baseSnapshot,
          phase: "solve_recorded",
          solveIndex: 4,
          solves: [
            { time_ms: 10000, penalty: null, scramble: "A" },
            { time_ms: 10100, penalty: null, scramble: "B" },
            { time_ms: 9800, penalty: null, scramble: "C" },
            { time_ms: 10400, penalty: null, scramble: "D" },
          ],
          scrambles: ["A", "B", "C", "D", "E"],
          groupNumber: 1,
          roundConfig: normalizeCompSimConfig({ format: "ao5" }),
          officialElapsedMs: 40300,
        }}
        editable
        onPenaltyChange={() => {}}
      />
    )

    expect(markup).toContain("Solve 5 Pressure")
    expect(markup).toContain("BPA (ao5)")
    expect(markup).toContain("WPA (ao5)")
  })
})

describe("ReadyWindowScreen", () => {
  it("shows the manual sit-down CTA before the ready window starts", () => {
    const markup = renderToStaticMarkup(
      <ReadyWindowScreen
        sitDownRequired={true}
        readyCountdownEnabled={true}
        readyWindowMsLeft={null}
        readyWindowExpired={false}
        onSitDown={() => {}}
        onPointerDown={() => {}}
        onPointerUp={() => {}}
      />
    )

    expect(markup).toContain("Sit Down / I&#x27;m Ready")
    expect(markup).toContain("Take Your Station")
  })
})
