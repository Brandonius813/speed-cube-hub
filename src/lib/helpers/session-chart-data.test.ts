import { describe, expect, it } from "vitest"

import type { Session } from "../types"
import {
  buildSessionChartData,
  getAutoSessionChartGroupMode,
  getSessionChartSeriesMeta,
} from "./session-chart-data"

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: overrides.user_id ?? "user-1",
    session_date: overrides.session_date ?? "2026-03-01",
    event: overrides.event ?? "333",
    practice_type: overrides.practice_type ?? "Solves",
    num_solves: overrides.num_solves ?? 25,
    num_dnf: overrides.num_dnf ?? 0,
    duration_minutes: overrides.duration_minutes ?? 15,
    avg_time: overrides.avg_time ?? null,
    best_time: overrides.best_time ?? null,
    title: overrides.title ?? null,
    notes: overrides.notes ?? null,
    feed_visible: overrides.feed_visible,
    timer_session_id: overrides.timer_session_id ?? null,
    solve_session_id: overrides.solve_session_id ?? null,
    created_at: overrides.created_at ?? "2026-03-01T00:00:00Z",
  }
}

describe("getAutoSessionChartGroupMode", () => {
  it("switches between daily, weekly, and monthly based on span", () => {
    expect(getAutoSessionChartGroupMode([
      makeSession({ session_date: "2026-03-01" }),
      makeSession({ session_date: "2026-03-20" }),
    ])).toBe("daily")

    expect(getAutoSessionChartGroupMode([
      makeSession({ session_date: "2026-03-01" }),
      makeSession({ session_date: "2026-04-20" }),
    ])).toBe("weekly")

    expect(getAutoSessionChartGroupMode([
      makeSession({ session_date: "2026-01-01" }),
      makeSession({ session_date: "2026-05-15" }),
    ])).toBe("monthly")
  })
})

describe("buildSessionChartData", () => {
  it("returns empty output for empty sessions", () => {
    expect(buildSessionChartData({
      sessions: [],
      groupMode: "daily",
      valueMode: "solves",
    })).toEqual({
      chartData: [],
      series: [],
    })
  })

  it("returns one visible series for a one-event dataset", () => {
    const result = buildSessionChartData({
      sessions: [makeSession({ session_date: "2026-03-01", event: "333", num_solves: 42 })],
      groupMode: "daily",
      valueMode: "solves",
    })

    expect(result.series.map((entry) => entry.eventId)).toEqual(["333"])
    expect(result.chartData[0]).toMatchObject({
      label: expect.any(String),
      "333": 42,
    })
  })

  it("keeps every present event visible instead of collapsing to top three", () => {
    const result = buildSessionChartData({
      sessions: [
        makeSession({ session_date: "2026-03-01", event: "333", num_solves: 40 }),
        makeSession({ session_date: "2026-03-01", event: "444", num_solves: 20 }),
        makeSession({ session_date: "2026-03-01", event: "555", num_solves: 10 }),
        makeSession({ session_date: "2026-03-01", event: "666", num_solves: 5 }),
      ],
      groupMode: "daily",
      valueMode: "solves",
    })

    expect(result.series.map((entry) => entry.eventId)).toEqual(["333", "444", "555", "666"])
    expect(result.chartData[0]).toMatchObject({
      "333": 40,
      "444": 20,
      "555": 10,
      "666": 5,
    })
  })

  it("adds solve counts for duration tooltips", () => {
    const result = buildSessionChartData({
      sessions: [makeSession({ session_date: "2026-03-01", event: "666", num_solves: 12, duration_minutes: 37 })],
      groupMode: "daily",
      valueMode: "duration",
    })

    expect(result.chartData[0]).toMatchObject({
      "666": 37,
      _solves_666: 12,
    })
  })

  it("keeps weekly and monthly groups in chronological order", () => {
    const weekly = buildSessionChartData({
      sessions: [
        makeSession({ session_date: "2026-03-03", event: "333", num_solves: 10 }),
        makeSession({ session_date: "2026-02-25", event: "333", num_solves: 10 }),
      ],
      groupMode: "weekly",
      valueMode: "solves",
      weekStart: 0,
    })

    const monthly = buildSessionChartData({
      sessions: [
        makeSession({ session_date: "2026-03-03", event: "333", num_solves: 10 }),
        makeSession({ session_date: "2026-02-25", event: "333", num_solves: 10 }),
      ],
      groupMode: "monthly",
      valueMode: "solves",
    })

    expect(weekly.chartData.map((entry) => entry.label)).toEqual(["2/22", "3/1"])
    expect(monthly.chartData.map((entry) => entry.label)).toEqual(["Feb 26", "Mar 26"])
  })
})

describe("getSessionChartSeriesMeta", () => {
  it("uses a neutral fallback for unknown events", () => {
    expect(getSessionChartSeriesMeta("mystery-event")).toEqual({
      eventId: "mystery-event",
      label: "mystery-event",
      color: "#94A3B8",
    })
  })
})
