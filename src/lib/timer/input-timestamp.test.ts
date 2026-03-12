import { describe, expect, it, vi, afterEach } from "vitest"
import { resolveInputTimestamp } from "@/lib/timer/input-timestamp"

describe("resolveInputTimestamp", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps high-resolution event timestamps that already match performance.now", () => {
    vi.spyOn(performance, "now").mockReturnValue(5000)

    expect(resolveInputTimestamp(4975)).toBe(4975)
  })

  it("normalizes epoch-based event timestamps against performance.timeOrigin", () => {
    vi.spyOn(performance, "now").mockReturnValue(5000)

    expect(resolveInputTimestamp(performance.timeOrigin + 4925)).toBe(4925)
  })

  it("falls back to performance.now when the timestamp is unusable", () => {
    vi.spyOn(performance, "now").mockReturnValue(5000)

    expect(resolveInputTimestamp(Number.NaN)).toBe(5000)
    expect(resolveInputTimestamp(999999)).toBe(5000)
  })
})
