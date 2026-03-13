import { describe, expect, it } from "vitest"
import {
  canLoadOlderSavedSolves,
  createInitialTimerEventHistoryState,
  getEffectiveSavedSolveCount,
  getHasOlderSavedSolves,
  timerEventHistoryReducer,
} from "@/components/timer/use-timer-event-history"

describe("timerEventHistoryReducer", () => {
  it("transitions into ready state with cursor and total count", () => {
    const next = timerEventHistoryReducer(createInitialTimerEventHistoryState(), {
      type: "BOOTSTRAP_READY",
      totalSavedCount: 60000,
      cursor: { solvedAt: "2026-03-13T12:00:00.000Z", id: "solve-200" },
    })

    expect(next.status).toBe("ready")
    expect(next.totalSavedCount).toBe(60000)
    expect(next.cursor?.id).toBe("solve-200")
    expect(next.errorMessage).toBeNull()
  })

  it("transitions into error state without exposing a cursor", () => {
    const next = timerEventHistoryReducer(createInitialTimerEventHistoryState(), {
      type: "BOOTSTRAP_ERROR",
      message: "Failed to load recent solves.",
    })

    expect(next.status).toBe("error")
    expect(next.cursor).toBeNull()
    expect(next.totalSavedCount).toBe(0)
    expect(next.errorMessage).toBe("Failed to load recent solves.")
  })

  it("clears older-load state while preserving ready status on paging error", () => {
    const ready = timerEventHistoryReducer(createInitialTimerEventHistoryState(), {
      type: "BOOTSTRAP_READY",
      totalSavedCount: 500,
      cursor: { solvedAt: "2026-03-13T12:00:00.000Z", id: "solve-200" },
    })
    const loading = timerEventHistoryReducer(ready, { type: "OLDER_LOAD_START" })
    const failed = timerEventHistoryReducer(loading, {
      type: "OLDER_LOAD_ERROR",
      message: "Could not load older solves.",
    })

    expect(failed.status).toBe("ready")
    expect(failed.loadingOlderSolves).toBe(false)
    expect(failed.errorMessage).toBe("Could not load older solves.")
    expect(failed.cursor?.id).toBe("solve-200")
  })
})

describe("timer event history gating", () => {
  it("hides older-load paging when count exceeds the visible window but no cursor exists", () => {
    const readyWithoutCursor = timerEventHistoryReducer(
      createInitialTimerEventHistoryState(),
      {
        type: "BOOTSTRAP_READY",
        totalSavedCount: 60000,
        cursor: null,
      }
    )

    expect(getEffectiveSavedSolveCount(readyWithoutCursor, 0)).toBe(60000)
    expect(getHasOlderSavedSolves(readyWithoutCursor, 0)).toBe(false)
    expect(canLoadOlderSavedSolves(readyWithoutCursor, 0)).toBe(false)
  })

  it("enables older-load paging only when the history is ready and cursor-backed", () => {
    const readyWithCursor = timerEventHistoryReducer(
      createInitialTimerEventHistoryState(),
      {
        type: "BOOTSTRAP_READY",
        totalSavedCount: 60000,
        cursor: { solvedAt: "2026-03-13T12:00:00.000Z", id: "solve-200" },
      }
    )

    expect(getHasOlderSavedSolves(readyWithCursor, 200)).toBe(true)
    expect(canLoadOlderSavedSolves(readyWithCursor, 200)).toBe(true)
  })
})
