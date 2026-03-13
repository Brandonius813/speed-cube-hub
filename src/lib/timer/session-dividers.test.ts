import { describe, expect, it } from "vitest"
import { computeSessionDividers } from "@/lib/timer/session-dividers"
import type { TimerSolve } from "@/lib/timer/stats"

function makeSolve(id: string, group: string | null, timeMs: number): TimerSolve {
  return {
    id,
    group,
    time_ms: timeMs,
    penalty: null,
    scramble: "R U R'",
  }
}

describe("computeSessionDividers", () => {
  it("preserves saved timer session identifiers on divider labels", () => {
    const groupId = "timer-session-123"
    const { labels } = computeSessionDividers(
      [
        makeSolve("a", groupId, 10000),
        makeSolve("b", groupId, 10100),
        makeSolve("c", null, 10200),
      ],
      [
        {
          id: groupId,
          title: "3x3 Solves",
          savedAt: Date.UTC(2026, 2, 13),
          solveCount: 2,
          sessionId: "session-456",
          timerSessionId: groupId,
          durationMinutes: 12,
          practiceType: "Solves",
        },
      ]
    )

    const divider = labels.get(1)
    expect(divider?.groupId).toBe(groupId)
    expect(divider?.sessionId).toBe("session-456")
    expect(divider?.timerSessionId).toBe(groupId)
    expect(divider?.stats.durationMinutes).toBe(12)
  })
})
