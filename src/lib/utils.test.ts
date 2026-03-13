import { describe, expect, it } from "vitest"
import { formatDurationInput, parseDuration } from "@/lib/utils"

describe("formatDurationInput", () => {
  it("formats short durations as whole minutes", () => {
    expect(formatDurationInput(10)).toBe("10")
  })

  it("formats hour-plus durations as h:mm", () => {
    expect(formatDurationInput(90)).toBe("1:30")
  })

  it("rounds fractional minutes to the nearest persisted minute", () => {
    expect(formatDurationInput(9.6)).toBe("10")
  })
})

describe("parseDuration", () => {
  it("parses whole minutes and h:mm values", () => {
    expect(parseDuration("10")).toBe(10)
    expect(parseDuration("1:30")).toBe(90)
  })

  it("rejects invalid duration input", () => {
    expect(parseDuration("0")).toBeNull()
    expect(parseDuration("1:75")).toBeNull()
    expect(parseDuration("abc")).toBeNull()
  })
})
