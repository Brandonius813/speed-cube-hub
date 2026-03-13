import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const verifyOtpMock = vi.fn()
const getUserMock = vi.fn()
const ensureAuthUserBootstrapMock = vi.fn()

vi.mock("@/lib/auth/route-client", () => ({
  createAuthRouteClient: () => ({
    auth: {
      verifyOtp: verifyOtpMock,
      getUser: getUserMock,
    },
  }),
}))

vi.mock("@/lib/auth/bootstrap", () => ({
  ensureAuthUserBootstrap: ensureAuthUserBootstrapMock,
}))

describe("auth confirm route", () => {
  it("verifies signup links and redirects into the requested app page", async () => {
    verifyOtpMock.mockResolvedValue({ error: null })
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "brandon@example.com",
        },
      },
    })
    ensureAuthUserBootstrapMock.mockResolvedValue(undefined)

    const { GET } = await import("./route")
    const response = await GET(
      new NextRequest(
        "https://www.speedcubehub.com/auth/confirm?token_hash=test123&type=signup&next=%2Ftimer"
      )
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://www.speedcubehub.com/timer")
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "test123",
      type: "signup",
    })
    expect(ensureAuthUserBootstrapMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "brandon@example.com",
    })
  })

  it("sends recovery links to the reset-password page", async () => {
    verifyOtpMock.mockResolvedValue({ error: null })
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    })

    const { GET } = await import("./route")
    const response = await GET(
      new NextRequest(
        "https://www.speedcubehub.com/auth/confirm?token_hash=test123&type=recovery"
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://www.speedcubehub.com/reset-password"
    )
  })

  it("redirects bad confirmation links back to login with a clear error code", async () => {
    const { GET } = await import("./route")
    const response = await GET(
      new NextRequest("https://www.speedcubehub.com/auth/confirm?type=signup")
    )

    expect(response.headers.get("location")).toBe(
      "https://www.speedcubehub.com/login?error=confirmation_failed&next=%2Fprofile"
    )
  })
})
