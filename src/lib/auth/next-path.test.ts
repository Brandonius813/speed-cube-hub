import { describe, expect, it } from "vitest"
import { getSafeNextPath } from "./next-path"

describe("getSafeNextPath", () => {
  it("defaults to the owner profile", () => {
    expect(getSafeNextPath(undefined)).toBe("/profile")
  })

  it("rejects malformed redirects", () => {
    expect(getSafeNextPath("https://evil.example")).toBe("/profile")
    expect(getSafeNextPath("//evil.example")).toBe("/profile")
    expect(getSafeNextPath("/\\evil")).toBe("/profile")
  })

  it("keeps safe in-app paths", () => {
    expect(getSafeNextPath("/timer")).toBe("/timer")
  })

  it("prevents auth-page loops", () => {
    expect(getSafeNextPath("/login")).toBe("/profile")
    expect(getSafeNextPath("/signup")).toBe("/profile")
  })
})
