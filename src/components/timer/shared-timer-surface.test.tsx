import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { TimerReadout } from "@/components/timer/shared-timer-surface"

describe("TimerReadout", () => {
  it("shows the inspection countdown based on seconds remaining", () => {
    const markup = renderToStaticMarkup(
      <TimerReadout
        className="timer"
        phase="inspecting"
        startMs={0}
        last={null}
        inInspectionHold={false}
        inspectionSecondsLeft={12}
        timerUpdateMode="realtime"
      />
    )

    expect(markup).toContain(">3<")
  })

  it("shows the last stopped solve using normal timer formatting", () => {
    const markup = renderToStaticMarkup(
      <TimerReadout
        className="timer"
        phase="stopped"
        startMs={0}
        last={{ timeMs: 8340, penalty: "+2" }}
        inInspectionHold={false}
        inspectionSecondsLeft={15}
        timerUpdateMode="realtime"
      />
    )

    expect(markup).toContain(">10.34<")
  })
})
