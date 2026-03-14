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
    not: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    then: Promise<T>["then"]
  } = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    or: vi.fn(() => builder),
    not: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

describe("timer analytics history queries", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
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

  it("computes fixed milestone rows exactly for long histories", async () => {
    const { computeFixedMilestoneRows } = await import("@/lib/actions/timer-analytics")

    const solves = Array.from({ length: 1000 }, (_, index) => ({
      time_ms: 1000 + index * 10,
      penalty: null,
    }))

    const rows = computeFixedMilestoneRows(solves)
    const ao500 = rows.find((row) => row.key === "ao500")
    const ao1000 = rows.find((row) => row.key === "ao1000")

    expect(ao500).toEqual({
      key: "ao500",
      cur: 8495,
      best: 3495,
    })
    expect(ao1000).toEqual({
      key: "ao1000",
      cur: 5995,
      best: 5995,
    })
  })

  it("returns exact event and latest-session summary data for the solve list header", async () => {
    const eventSummaryQuery = createQueryResult({
      data: {
        user_id: "user-1",
        event: "333",
        solve_count: 60000,
        dnf_count: 120,
        valid_solve_count: 59880,
        total_effective_time_ms: 720000000,
        best_single_ms: 5120,
        mean_ms: 12021,
        current_ao5_ms: 8450,
        best_ao5_ms: 6500,
        current_ao12_ms: 9021,
        best_ao12_ms: 7123,
        current_ao25_ms: 9345,
        best_ao25_ms: 8001,
        current_ao50_ms: 9521,
        best_ao50_ms: 8456,
        current_ao100_ms: 9800,
        best_ao100_ms: 8750,
        current_ao200_ms: 10012,
        best_ao200_ms: 9011,
        current_ao500_ms: 10345,
        best_ao500_ms: 9412,
        current_ao1000_ms: 10567,
        best_ao1000_ms: 9821,
        first_solved_at: "2025-01-01T00:00:00.000Z",
        last_solved_at: "2026-03-13T12:00:00.000Z",
        updated_at: "2026-03-13T12:00:00.000Z",
      },
      error: null,
    })

    const latestSessionQuery = createQueryResult({
      data: {
        id: "session-1",
        timer_session_id: "timer-session-1",
        num_solves: 650,
        avg_time: 12.34,
        best_time: 6.78,
        best_ao5: 8.45,
        best_ao12: 9.12,
        best_ao25: 9.88,
        best_ao50: 10.21,
        best_ao100: 10.55,
        best_ao200: 10.99,
        best_ao500: 11.21,
        best_ao1000: null,
        created_at: "2026-03-12T17:00:00.000Z",
      },
      error: null,
    })

    createClientMock.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => {
        if (table === "event_summaries") {
          return { select: vi.fn(() => eventSummaryQuery) }
        }
        if (table === "sessions") {
          return { select: vi.fn(() => latestSessionQuery) }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const { getTimerSolveListSummary } = await import("@/lib/actions/timer-analytics")
    const result = await getTimerSolveListSummary("333")

    expect(result.error).toBeUndefined()
    expect(result.data?.eventSummary?.solve_count).toBe(60000)
    expect(result.data?.milestoneRows.find((row) => row.key === "ao500")).toEqual({
      key: "ao500",
      cur: 10345,
      best: 9412,
    })
    expect(result.data?.latestSavedSessionSummary).toEqual({
      id: "session-1",
      timer_session_id: "timer-session-1",
      solve_count: 650,
      mean_seconds: 12.34,
      best_single_seconds: 6.78,
      best_ao5: 8.45,
      best_ao12: 9.12,
      best_ao25: 9.88,
      best_ao50: 10.21,
      best_ao100: 10.55,
      best_ao200: 10.99,
      best_ao500: 11.21,
      best_ao1000: null,
      created_at: "2026-03-12T17:00:00.000Z",
    })
  })
})
