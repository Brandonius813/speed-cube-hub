import { describe, expect, it, vi } from "vitest"
import {
  preventGuardedNumberInputKey,
  preventGuardedNumberInputWheel,
  shouldPreventGuardedNumberInputKey,
} from "./guard-number-input"

describe("guard-number-input", () => {
  it("blocks arrow key stepping", () => {
    expect(shouldPreventGuardedNumberInputKey("ArrowUp")).toBe(true)
    expect(shouldPreventGuardedNumberInputKey("ArrowDown")).toBe(true)
    expect(shouldPreventGuardedNumberInputKey("1")).toBe(false)
    expect(shouldPreventGuardedNumberInputKey("Tab")).toBe(false)
  })

  it("prevents default only for step keys", () => {
    const preventDefault = vi.fn()

    preventGuardedNumberInputKey({ key: "ArrowUp", preventDefault })
    expect(preventDefault).toHaveBeenCalledTimes(1)

    preventGuardedNumberInputKey({ key: "3", preventDefault })
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })

  it("blurs the input on wheel to stop native value changes", () => {
    const preventDefault = vi.fn()
    const blur = vi.fn()

    preventGuardedNumberInputWheel({
      currentTarget: { blur },
      preventDefault,
    })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(blur).toHaveBeenCalledTimes(1)
  })
})
