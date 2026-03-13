import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const signInWithPasswordMock = vi.fn()
const signUpMock = vi.fn()
const resendMock = vi.fn()
const resetPasswordForEmailMock = vi.fn()
const updateUserMock = vi.fn()
const getUserMock = vi.fn()
const ensureAuthUserBootstrapMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
      resend: resendMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      updateUser: updateUserMock,
      getUser: getUserMock,
    },
  })),
}))

vi.mock("@/lib/auth/bootstrap", () => ({
  ensureAuthUserBootstrap: ensureAuthUserBootstrapMock,
  buildDisplayName: (firstName?: string, middleName?: string, lastName?: string) =>
    [firstName, middleName, lastName].filter(Boolean).join(" "),
}))

describe("auth actions", () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset()
    signUpMock.mockReset()
    resendMock.mockReset()
    resetPasswordForEmailMock.mockReset()
    updateUserMock.mockReset()
    getUserMock.mockReset()
    ensureAuthUserBootstrapMock.mockReset()
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.speedcubehub.com")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("repairs account records after a successful login", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: {
        user: { id: "user-1", email: "brandon@example.com" },
      },
      error: null,
    })
    ensureAuthUserBootstrapMock.mockResolvedValue(undefined)

    const { login } = await import("./auth")
    const formData = new FormData()
    formData.set("email", "brandon@example.com")
    formData.set("password", "secret123")

    await expect(login(formData)).resolves.toEqual({ success: true })
    expect(ensureAuthUserBootstrapMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "brandon@example.com",
    })
  })

  it("surfaces unconfirmed-login errors with a resend hint", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: {
        message: "Email not confirmed",
      },
    })

    const { login } = await import("./auth")
    const formData = new FormData()
    formData.set("email", "brandon@example.com")
    formData.set("password", "secret123")

    await expect(login(formData)).resolves.toEqual({
      error: "You need to confirm your email before you can log in.",
      canResendConfirmation: true,
    })
  })

  it("keeps signup successful even if bootstrap repair fails", async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "brandon@example.com",
          identities: [{ id: "identity-1" }],
        },
      },
      error: null,
    })
    ensureAuthUserBootstrapMock.mockRejectedValue(new Error("db temporarily unavailable"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { signup } = await import("./auth")
    const formData = new FormData()
    formData.set("email", "brandon@example.com")
    formData.set("password", "secret123")
    formData.set("firstName", "Brandon")
    formData.set("lastName", "True")

    await expect(signup(formData, "/timer")).resolves.toEqual({
      success: true,
      email: "brandon@example.com",
    })
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "brandon@example.com",
        password: "secret123",
        options: expect.objectContaining({
          emailRedirectTo: "https://www.speedcubehub.com/auth/confirm?next=%2Ftimer",
        }),
      })
    )
    expect(errorSpy).toHaveBeenCalledWith(
      "Signup bootstrap repair failed",
      expect.any(Error)
    )
  })

  it("resends signup confirmations with the confirm redirect", async () => {
    resendMock.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    const { resendSignupConfirmation } = await import("./auth")

    await expect(
      resendSignupConfirmation("brandon@example.com", "/feed")
    ).resolves.toEqual({
      success: true,
      email: "brandon@example.com",
    })
    expect(resendMock).toHaveBeenCalledWith({
      type: "signup",
      email: "brandon@example.com",
      options: {
        emailRedirectTo: "https://www.speedcubehub.com/auth/confirm?next=%2Ffeed",
      },
    })
  })

  it("updates the password for a verified recovery session", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "brandon@example.com",
        },
      },
    })
    updateUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    ensureAuthUserBootstrapMock.mockResolvedValue(undefined)

    const { updatePassword } = await import("./auth")
    const formData = new FormData()
    formData.set("password", "secret123")
    formData.set("confirmPassword", "secret123")

    await expect(updatePassword(formData)).resolves.toEqual({ success: true })
    expect(updateUserMock).toHaveBeenCalledWith({
      password: "secret123",
    })
    expect(ensureAuthUserBootstrapMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "brandon@example.com",
    })
  })
})
