import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SolveRecordedScreen } from "@/components/timer/comp-sim-screens"

describe("SolveRecordedScreen", () => {
  it("keeps the shared light-weight timer styling for the recorded solve", () => {
    const markup = renderToStaticMarkup(
      <SolveRecordedScreen
        solves={[
          { time_ms: 9876, penalty: null, scramble: "R U R'" },
        ]}
        formatLabel="Ao5"
        timerReadoutTextSize="md"
      />
    )

    expect(markup).toContain("font-light")
    expect(markup).toContain("tabular-nums")
    expect(markup).toContain("9.87")
  })
})
