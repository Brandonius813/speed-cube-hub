"use client"

import { useCallback, useReducer } from "react"
import type { SolveWindowCursor } from "@/lib/actions/timer-analytics"

export type TimerHistoryStatus = "loading" | "ready" | "empty" | "error"

export type TimerEventHistoryState = {
  status: TimerHistoryStatus
  errorMessage: string | null
  totalSavedCount: number
  cursor: SolveWindowCursor | null
  loadingOlderSolves: boolean
}

type TimerEventHistoryAction =
  | { type: "RESET" }
  | { type: "BOOTSTRAP_LOADING" }
  | {
      type: "BOOTSTRAP_READY"
      totalSavedCount: number
      cursor: SolveWindowCursor | null
    }
  | { type: "BOOTSTRAP_EMPTY" }
  | { type: "BOOTSTRAP_ERROR"; message: string }
  | { type: "SYNC_TOTAL_SAVED_COUNT"; totalSavedCount: number }
  | { type: "INCREMENT_TOTAL_SAVED_COUNT"; delta: number }
  | { type: "DECREMENT_TOTAL_SAVED_COUNT"; delta: number }
  | { type: "SET_CURSOR"; cursor: SolveWindowCursor | null }
  | { type: "OLDER_LOAD_START" }
  | { type: "OLDER_LOAD_SUCCESS"; cursor: SolveWindowCursor | null }
  | { type: "OLDER_LOAD_ERROR"; message: string | null }

export function createInitialTimerEventHistoryState(): TimerEventHistoryState {
  return {
    status: "loading",
    errorMessage: null,
    totalSavedCount: 0,
    cursor: null,
    loadingOlderSolves: false,
  }
}

export function timerEventHistoryReducer(
  state: TimerEventHistoryState,
  action: TimerEventHistoryAction
): TimerEventHistoryState {
  switch (action.type) {
    case "RESET":
      return createInitialTimerEventHistoryState()

    case "BOOTSTRAP_LOADING":
      return {
        ...createInitialTimerEventHistoryState(),
        status: "loading",
      }

    case "BOOTSTRAP_READY":
      return {
        status: "ready",
        errorMessage: null,
        totalSavedCount: Math.max(0, action.totalSavedCount),
        cursor: action.cursor,
        loadingOlderSolves: false,
      }

    case "BOOTSTRAP_EMPTY":
      return {
        status: "empty",
        errorMessage: null,
        totalSavedCount: 0,
        cursor: null,
        loadingOlderSolves: false,
      }

    case "BOOTSTRAP_ERROR":
      return {
        status: "error",
        errorMessage: action.message,
        totalSavedCount: 0,
        cursor: null,
        loadingOlderSolves: false,
      }

    case "SYNC_TOTAL_SAVED_COUNT":
      return {
        ...state,
        totalSavedCount: Math.max(0, action.totalSavedCount),
      }

    case "INCREMENT_TOTAL_SAVED_COUNT":
      return {
        ...state,
        totalSavedCount: Math.max(0, state.totalSavedCount + action.delta),
      }

    case "DECREMENT_TOTAL_SAVED_COUNT":
      return {
        ...state,
        totalSavedCount: Math.max(0, state.totalSavedCount - action.delta),
      }

    case "SET_CURSOR":
      return {
        ...state,
        status:
          action.cursor && state.status !== "ready"
            ? "ready"
            : state.status,
        cursor: action.cursor,
      }

    case "OLDER_LOAD_START":
      return {
        ...state,
        errorMessage: null,
        loadingOlderSolves: true,
      }

    case "OLDER_LOAD_SUCCESS":
      return {
        ...state,
        status: state.status === "empty" ? "ready" : state.status,
        errorMessage: null,
        cursor: action.cursor,
        loadingOlderSolves: false,
      }

    case "OLDER_LOAD_ERROR":
      return {
        ...state,
        errorMessage: action.message,
        loadingOlderSolves: false,
      }

    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}

export function getEffectiveSavedSolveCount(
  state: TimerEventHistoryState,
  loadedSavedSolveCount: number
): number {
  return Math.max(state.totalSavedCount, loadedSavedSolveCount)
}

export function getHasOlderSavedSolves(
  state: TimerEventHistoryState,
  loadedSavedSolveCount: number
): boolean {
  if (state.status !== "ready") return false
  if (!state.cursor) return false
  return loadedSavedSolveCount < getEffectiveSavedSolveCount(state, loadedSavedSolveCount)
}

export function canLoadOlderSavedSolves(
  state: TimerEventHistoryState,
  loadedSavedSolveCount: number
): boolean {
  return !state.loadingOlderSolves && getHasOlderSavedSolves(state, loadedSavedSolveCount)
}

export function useTimerEventHistory() {
  const [state, dispatch] = useReducer(
    timerEventHistoryReducer,
    undefined,
    createInitialTimerEventHistoryState
  )

  const reset = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  const startBootstrap = useCallback(() => {
    dispatch({ type: "BOOTSTRAP_LOADING" })
  }, [])

  const markReady = useCallback((payload: {
    totalSavedCount: number
    cursor: SolveWindowCursor | null
  }) => {
    dispatch({
      type: "BOOTSTRAP_READY",
      totalSavedCount: payload.totalSavedCount,
      cursor: payload.cursor,
    })
  }, [])

  const markEmpty = useCallback(() => {
    dispatch({ type: "BOOTSTRAP_EMPTY" })
  }, [])

  const markError = useCallback((message: string) => {
    dispatch({ type: "BOOTSTRAP_ERROR", message })
  }, [])

  const syncTotalSavedCount = useCallback((totalSavedCount: number) => {
    dispatch({ type: "SYNC_TOTAL_SAVED_COUNT", totalSavedCount })
  }, [])

  const incrementTotalSavedCount = useCallback((delta: number) => {
    if (delta <= 0) return
    dispatch({ type: "INCREMENT_TOTAL_SAVED_COUNT", delta })
  }, [])

  const decrementTotalSavedCount = useCallback((delta: number) => {
    if (delta <= 0) return
    dispatch({ type: "DECREMENT_TOTAL_SAVED_COUNT", delta })
  }, [])

  const setCursor = useCallback((cursor: SolveWindowCursor | null) => {
    dispatch({ type: "SET_CURSOR", cursor })
  }, [])

  const startOlderLoad = useCallback(() => {
    dispatch({ type: "OLDER_LOAD_START" })
  }, [])

  const finishOlderLoad = useCallback((cursor: SolveWindowCursor | null) => {
    dispatch({ type: "OLDER_LOAD_SUCCESS", cursor })
  }, [])

  const failOlderLoad = useCallback((message: string | null = null) => {
    dispatch({ type: "OLDER_LOAD_ERROR", message })
  }, [])

  return {
    historyStatus: state.status,
    historyError: state.errorMessage,
    savedSolveCountTotal: state.totalSavedCount,
    savedSolveCursor: state.cursor,
    loadingOlderSolves: state.loadingOlderSolves,
    reset,
    startBootstrap,
    markReady,
    markEmpty,
    markError,
    syncTotalSavedCount,
    incrementTotalSavedCount,
    decrementTotalSavedCount,
    setCursor,
    startOlderLoad,
    finishOlderLoad,
    failOlderLoad,
  }
}
