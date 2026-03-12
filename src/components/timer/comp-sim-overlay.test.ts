import { describe, expect, it } from "vitest"
import {
  shouldAutoSubmitInspectionDnf,
  shouldStartFreshInspection,
} from "@/components/timer/comp-sim-overlay"

describe("shouldStartFreshInspection", () => {
  it("starts a fresh inspection whenever comp sim newly enters inspecting", () => {
    expect(shouldStartFreshInspection("ready", "inspecting")).toBe(true)
    expect(shouldStartFreshInspection("solve_cue", "inspecting")).toBe(true)
    expect(shouldStartFreshInspection("done", "inspecting")).toBe(true)
  })

  it("does not restart inspection while already inspecting", () => {
    expect(shouldStartFreshInspection("inspecting", "inspecting")).toBe(false)
  })

  it("does not start inspection for unrelated phase changes", () => {
    expect(shouldStartFreshInspection("ready", "solving")).toBe(false)
  })
})

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
