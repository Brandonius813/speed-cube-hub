import { describe, expect, it } from "vitest"
import type { PBRecord, Profile, Session } from "@/lib/types"
import {
  aggregateEventPractice,
  aggregatePracticeWindow,
  buildProfileComparisonData,
  comparePbRecords,
} from "@/lib/profile-comparison"

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: overrides.id ?? "user-1",
    display_name: overrides.display_name ?? "Test User",
    handle: overrides.handle ?? "testuser",
    bio: overrides.bio ?? null,
    avatar_url: overrides.avatar_url ?? null,
    wca_id: overrides.wca_id ?? null,
    location: overrides.location ?? null,
    sponsor: overrides.sponsor ?? null,
    events: overrides.events ?? [],
    cubes: overrides.cubes ?? [],
    cube_history: overrides.cube_history ?? [],
    links: overrides.links ?? [],
    accomplishments: overrides.accomplishments ?? [],
    country_id: overrides.country_id ?? null,
    main_event: overrides.main_event ?? null,
    main_events: overrides.main_events ?? [],
    wca_event_order: overrides.wca_event_order ?? null,
    pb_visible_types: overrides.pb_visible_types ?? null,
    pbs_main_events: overrides.pbs_main_events ?? null,
    pb_display_types: overrides.pb_display_types ?? null,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-01-01T00:00:00.000Z",
  }
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: overrides.user_id ?? "user-1",
    session_date: overrides.session_date ?? "2026-03-11",
    event: overrides.event ?? "333",
    practice_type: overrides.practice_type ?? "Solves",
    num_solves: overrides.num_solves ?? 0,
    num_dnf: overrides.num_dnf ?? 0,
    duration_minutes: overrides.duration_minutes ?? 0,
    avg_time: overrides.avg_time ?? null,
    best_time: overrides.best_time ?? null,
    title: overrides.title ?? null,
    notes: overrides.notes ?? null,
    feed_visible: overrides.feed_visible,
    timer_session_id: overrides.timer_session_id ?? null,
    solve_session_id: overrides.solve_session_id ?? null,
    created_at: overrides.created_at ?? "2026-03-11T00:00:00.000Z",
  }
}

function makePb(overrides: Partial<PBRecord> = {}): PBRecord {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: overrides.user_id ?? "user-1",
    event: overrides.event ?? "333",
    pb_type: overrides.pb_type ?? "Single",
    time_seconds: overrides.time_seconds ?? 10,
    date_achieved: overrides.date_achieved ?? "2026-03-11",
    is_current: overrides.is_current ?? true,
    notes: overrides.notes ?? null,
    created_at: overrides.created_at ?? "2026-03-11T00:00:00.000Z",
    mbld_solved: overrides.mbld_solved ?? null,
    mbld_attempted: overrides.mbld_attempted ?? null,
  }
}

describe("aggregatePracticeWindow", () => {
  it("uses inclusive rolling 7-day and 30-day windows", () => {
    const sessions = [
      makeSession({ session_date: "2026-03-11", duration_minutes: 20, num_solves: 50 }),
      makeSession({ session_date: "2026-03-05", duration_minutes: 30, num_solves: 60 }),
      makeSession({ session_date: "2026-03-04", duration_minutes: 40, num_solves: 70 }),
      makeSession({ session_date: "2026-02-11", duration_minutes: 15, num_solves: 20 }),
      makeSession({ session_date: "2026-02-10", duration_minutes: 50, num_solves: 90 }),
    ]

    expect(aggregatePracticeWindow(sessions, 7, "2026-03-11")).toEqual({
      minutes: 50,
      sessions: 2,
      solves: 110,
    })

    expect(aggregatePracticeWindow(sessions, 30, "2026-03-11")).toEqual({
      minutes: 155,
      sessions: 5,
      solves: 290,
    })
  })
})

describe("aggregateEventPractice", () => {
  it("groups total minutes and solves by event", () => {
    const eventMap = aggregateEventPractice([
      makeSession({ event: "333", duration_minutes: 25, num_solves: 40 }),
      makeSession({ event: "333", duration_minutes: 10, num_solves: 20 }),
      makeSession({ event: "222", duration_minutes: 15, num_solves: 35 }),
    ])

    expect(eventMap.get("333")).toEqual({ minutes: 35, solves: 60 })
    expect(eventMap.get("222")).toEqual({ minutes: 15, solves: 35 })
  })
})

describe("comparePbRecords", () => {
  it("compares regular PBs with lower time winning", () => {
    const viewer = makePb({ event: "333", time_seconds: 9.81 })
    const target = makePb({ event: "333", time_seconds: 10.22 })

    expect(comparePbRecords(viewer, target)).toEqual({
      result: "viewer",
      note: null,
    })
  })

  it("reuses multi-blind comparison rules", () => {
    const viewer = makePb({
      event: "333mbf",
      time_seconds: 4200,
      mbld_solved: 12,
      mbld_attempted: 14,
    })
    const target = makePb({
      event: "333mbf",
      time_seconds: 3600,
      mbld_solved: 11,
      mbld_attempted: 14,
    })

    expect(comparePbRecords(viewer, target)).toEqual({
      result: "viewer",
      note: null,
    })
  })
})

describe("buildProfileComparisonData", () => {
  it("does not count one-sided PBs as faster/slower leads", () => {
    const comparison = buildProfileComparisonData(
      {
        viewerProfile: makeProfile({
          id: "viewer",
          display_name: "Viewer",
          handle: "viewer",
          main_events: ["333"],
        }),
        targetProfile: makeProfile({
          id: "target",
          display_name: "Target",
          handle: "target",
          main_events: ["222"],
        }),
        viewerSessions: [makeSession({ user_id: "viewer", event: "333", duration_minutes: 25, num_solves: 45 })],
        targetSessions: [],
        viewerPbs: [makePb({ user_id: "viewer", event: "333", pb_type: "Single", time_seconds: 9.99 })],
        targetPbs: [makePb({ user_id: "target", event: "222", pb_type: "Single", time_seconds: 3.2 })],
      },
      { todayString: "2026-03-11" }
    )

    expect(comparison.summaryLeads.viewerLeadEvents).toEqual([])
    expect(comparison.summaryLeads.targetLeadEvents).toEqual([])
    expect(comparison.pbEventRows).toHaveLength(2)
    expect(
      comparison.pbEventRows.find((row) => row.eventId === "222")?.rows[0]?.result
    ).toBe("target_only")
    expect(
      comparison.pbEventRows.find((row) => row.eventId === "333")?.rows[0]?.result
    ).toBe("viewer_only")
    expect(
      comparison.eventPracticeRows.find((row) => row.eventId === "333")
    ).toMatchObject({
      viewer: { minutes: 25, solves: 45 },
      target: { minutes: 0, solves: 0 },
    })
  })
})
