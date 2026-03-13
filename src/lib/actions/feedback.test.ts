import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()
const getUserMock = vi.fn()
const insertMock = vi.fn()
const singleMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: singleMock,
            })),
          })),
        }
      }

      if (table === "feedback") {
        return {
          insert: insertMock,
        }
      }

      throw new Error(`Unexpected table access: ${table}`)
    }),
  })),
}))

async function loadFeedbackModule() {
  return import("./feedback")
}

describe("submitFeedback", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getUserMock.mockReset()
    insertMock.mockReset()
    singleMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("FEEDBACK_EMAIL_TO", "owner@example.com")
    vi.stubEnv("FEEDBACK_EMAIL_FROM", "Speed Cube Hub <feedback@example.com>")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns validation errors for empty, too-long, and invalid requests", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test")
    const { submitFeedback } = await loadFeedbackModule()

    await expect(submitFeedback("bug", "   ")).resolves.toEqual({
      error: "Message cannot be empty",
    })
    await expect(submitFeedback("bug", "x".repeat(1001))).resolves.toEqual({
      error: "Message must be 1000 characters or less",
    })
    await expect(
      submitFeedback("invalid" as never, "broken")
    ).resolves.toEqual({
      error: "Invalid category",
    })
  })

  it("returns a normal error when Resend is not configured", async () => {
    const { submitFeedback } = await loadFeedbackModule()

    await expect(submitFeedback("bug", "Something broke")).resolves.toEqual({
      error:
        "Feedback email is not configured right now. Please try again shortly.",
    })
  })

  it("allows anonymous submissions and still sends the email", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test")
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    insertMock.mockResolvedValue({
      error: null,
    })

    const { submitFeedback } = await loadFeedbackModule()
    const result = await submitFeedback(
      "bug",
      "The footer form is stuck",
      "https://www.speedcubehub.com/feed"
    )

    expect(result).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, request] = fetchMock.mock.calls[0]
    const payload = JSON.parse(String(request?.body))

    expect(payload).toMatchObject({
      to: "owner@example.com",
      from: "Speed Cube Hub <feedback@example.com>",
      subject: "[Bug Report] Feedback from Anonymous visitor",
    })
    expect(payload.text).toContain("Email: Anonymous")
    expect(payload.text).toContain("Page: https://www.speedcubehub.com/feed")
  })

  it("returns success when email succeeds even if the backup save fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test")
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "brandon@example.com",
        },
      },
      error: null,
    })
    singleMock.mockResolvedValue({
      data: {
        display_name: "Brandon\nTrue",
        handle: "brandont",
      },
      error: null,
    })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "email_456" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    insertMock.mockResolvedValue({
      error: { message: "row violates RLS" },
    })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { submitFeedback } = await loadFeedbackModule()
    const result = await submitFeedback("general", "Nice site")

    expect(result).toEqual({ success: true })
    const [, request] = fetchMock.mock.calls[0]
    const payload = JSON.parse(String(request?.body))

    expect(payload.subject).toBe("[General Feedback] Feedback from Brandon True")
    expect(payload.text).toContain("Handle: @brandont")
    expect(errorSpy).toHaveBeenCalledWith(
      "Feedback backup save failed",
      expect.objectContaining({ message: "row violates RLS" })
    )
  })

  it("returns an error when the email send fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test")
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "provider unavailable",
          name: "application_error",
          statusCode: 503,
        }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        }
      )
    )
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { submitFeedback } = await loadFeedbackModule()
    const result = await submitFeedback("bug", "Still broken")

    expect(result).toEqual({
      error: "Could not send feedback right now. Please try again in a moment.",
    })
    expect(insertMock).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(
      "Feedback email send failed",
      expect.objectContaining({ message: "provider unavailable" })
    )
  })
})
