import { afterEach, describe, expect, it, vi } from "vitest"

const createClientMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}))

function createQueryResult<T>(result: T) {
  const builder: {
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
    or: ReturnType<typeof vi.fn>
    then: Promise<T>["then"]
  } = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    or: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

describe("timer analytics history queries", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns bootstrap solves, total count, and next cursor atomically", async () => {
    const query = createQueryResult({
      data: [
        {
          id: "solve-200",
          solved_at: "2026-03-13T12:00:00.000Z",
        },
        {
          id: "solve-199",
          solved_at: "2026-03-13T11:59:00.000Z",
        },
      ],
      count: 60000,
      error: null,
    })

    createClientMock.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => ({
        select: vi.fn(() => query),
      })),
    })

    const { getEventHistoryBootstrap } = await import("@/lib/actions/timer-analytics")
    const result = await getEventHistoryBootstrap({ event: "333", limit: 2 })

    expect(result.totalCount).toBe(60000)
    expect(result.solves.map((solve) => solve.id)).toEqual(["solve-199", "solve-200"])
    expect(result.nextCursor).toEqual({
      solvedAt: "2026-03-13T11:59:00.000Z",
      id: "solve-199",
    })
  })

  it("applies the paging cursor when loading older event solves", async () => {
    const query = createQueryResult({
      data: [
        {
          id: "solve-180",
          solved_at: "2026-03-13T11:40:00.000Z",
        },
      ],
      error: null,
    })

    createClientMock.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => ({
        select: vi.fn(() => query),
      })),
    })

    const { listEventSolveWindow } = await import("@/lib/actions/timer-analytics")
    const result = await listEventSolveWindow({
      event: "333",
      cursor: { solvedAt: "2026-03-13T11:59:00.000Z", id: "solve-199" },
      limit: 1,
    })

    expect(query.or).toHaveBeenCalledWith(
      "solved_at.lt.2026-03-13T11:59:00.000Z,and(solved_at.eq.2026-03-13T11:59:00.000Z,id.lt.solve-199)"
    )
    expect(result.nextCursor).toEqual({
      solvedAt: "2026-03-13T11:40:00.000Z",
      id: "solve-180",
    })
  })
})
