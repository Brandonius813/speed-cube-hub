import { beforeEach, describe, expect, it, vi } from "vitest"

const maybeSingleMock = vi.fn()
const updateEqMock = vi.fn()
const updateMock = vi.fn()
const insertMock = vi.fn()
const fromMock = vi.fn()
const ensureUserOnboardingMock = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}))

vi.mock("@/lib/actions/onboarding", () => ({
  ensureUserOnboarding: ensureUserOnboardingMock,
}))

function buildProfilesSelect() {
  return {
    eq: vi.fn(() => ({
      maybeSingle: maybeSingleMock,
    })),
  }
}

beforeEach(() => {
  maybeSingleMock.mockReset()
  updateEqMock.mockReset()
  updateMock.mockReset()
  insertMock.mockReset()
  fromMock.mockReset()
  ensureUserOnboardingMock.mockReset()

  updateMock.mockReturnValue({
    eq: updateEqMock,
  })

  fromMock.mockImplementation((table: string) => {
    if (table !== "profiles") {
      throw new Error(`Unexpected table: ${table}`)
    }

    return {
      select: vi.fn(buildProfilesSelect),
      update: updateMock,
      insert: insertMock,
    }
  })
})

describe("buildHandleBase", () => {
  it("normalizes handle seeds to lowercase alphanumeric text", async () => {
    const { buildHandleBase } = await import("./bootstrap")

    expect(buildHandleBase("Brandon True!")).toBe("brandontrue")
    expect(buildHandleBase("")).toBe("cuber")
  })
})

describe("createHandleCandidates", () => {
  it("starts with the clean handle and then numbered fallbacks", async () => {
    const { createHandleCandidates } = await import("./bootstrap")

    const candidates = createHandleCandidates("Brandon True")

    expect(candidates[0]).toBe("brandontrue")
    expect(candidates[1]).toBe("brandontrue1")
    expect(candidates[2]).toBe("brandontrue2")
  })
})

describe("ensureAuthUserBootstrap", () => {
  it("retries on a unique-handle conflict and then creates onboarding", async () => {
    maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    insertMock
      .mockResolvedValueOnce({ error: { code: "23505", message: "duplicate key value" } })
      .mockResolvedValueOnce({ error: null })
    ensureUserOnboardingMock.mockResolvedValue(null)

    const { ensureAuthUserBootstrap } = await import("./bootstrap")

    await expect(
      ensureAuthUserBootstrap({
        id: "user-1",
        email: "brandon@example.com",
        user_metadata: {
          full_name: "Brandon True",
        },
      } as never)
    ).resolves.toBeUndefined()

    expect(insertMock).toHaveBeenCalledTimes(2)
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({
      handle: "brandontrue",
    })
    expect(insertMock.mock.calls[1]?.[0]).toMatchObject({
      handle: "brandontrue1",
    })
    expect(ensureUserOnboardingMock).toHaveBeenCalledWith("user-1")
  })

  it("patches missing profile fields on an existing profile", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "user-1",
        display_name: null,
        avatar_url: null,
      },
      error: null,
    })
    updateEqMock.mockResolvedValue({ error: null })
    ensureUserOnboardingMock.mockResolvedValue(null)

    const { ensureAuthUserBootstrap } = await import("./bootstrap")

    await expect(
      ensureAuthUserBootstrap({
        id: "user-1",
        email: "brandon@example.com",
        user_metadata: {
          full_name: "Brandon True",
          avatar_url: "https://example.com/avatar.png",
        },
      } as never)
    ).resolves.toBeUndefined()

    expect(updateMock).toHaveBeenCalledWith({
      display_name: "Brandon True",
      avatar_url: "https://example.com/avatar.png",
    })
    expect(insertMock).not.toHaveBeenCalled()
  })
})
