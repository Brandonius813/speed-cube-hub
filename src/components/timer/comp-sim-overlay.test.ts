import { describe, expect, it } from "vitest"
import { shouldAutoSubmitInspectionDnf } from "@/components/timer/comp-sim-overlay"

describe("shouldAutoSubmitInspectionDnf", () => {
  it("auto-submits a DNF when inspection times out naturally", () => {
    expect(
      shouldAutoSubmitInspectionDnf("done", "inspecting", false)
    ).toBe(true)
  })

  it("does not auto-submit a DNF when the user manually released to start solving", () => {
    expect(
      shouldAutoSubmitInspectionDnf("done", "inspecting", true)
    ).toBe(false)
  })

  it("does not auto-submit outside the inspecting phase", () => {
    expect(
      shouldAutoSubmitInspectionDnf("done", "solving", false)
    ).toBe(false)
  })
})
