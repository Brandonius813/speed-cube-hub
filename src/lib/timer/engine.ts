export type TimerPhase =
  | "idle"
  | "holding"
  | "ready"
  | "inspecting"
  | "running"
  | "stopped"

export type TimerSnapshot = {
  phase: TimerPhase
  scrambleReady: boolean
  btConnected: boolean
  btReset: boolean
  btHandsOnMat: boolean
  btArmed: boolean
  suppressOptionalUi: boolean
}

export type TimerEvent =
  | { type: "START_HOLD" }
  | { type: "HOLD_READY" }
  | { type: "CANCEL_HOLD"; backTo: "idle" | "inspecting" }
  | { type: "START_RUNNING" }
  | { type: "STOP_SOLVE" }
  | { type: "START_INSPECTION" }
  | { type: "INSPECTION_DONE" }
  | { type: "RESET_IDLE" }
  | { type: "BT_CONNECTED"; connected: boolean }
  | { type: "BT_HANDS_ON" }
  | { type: "BT_GET_SET" }
  | { type: "BT_HANDS_OFF" }
  | { type: "BT_RUNNING" }
  | { type: "BT_STOPPED" }
  | { type: "BT_IDLE" }
  | { type: "BT_DISCONNECT" }
  | { type: "SET_SCRAMBLE_READY"; ready: boolean }
  | { type: "SET_SUPPRESS_OPTIONAL_UI"; suppress: boolean }

export interface TimerEngine {
  dispatch(event: TimerEvent): void
  getSnapshot(): TimerSnapshot
  subscribe(listener: (snapshot: TimerSnapshot) => void): () => void
}

const DEFAULT_SNAPSHOT: TimerSnapshot = {
  phase: "idle",
  scrambleReady: false,
  btConnected: false,
  btReset: false,
  btHandsOnMat: false,
  btArmed: false,
  suppressOptionalUi: false,
}

function reduce(snapshot: TimerSnapshot, event: TimerEvent): TimerSnapshot {
  switch (event.type) {
    case "START_HOLD":
      if (
        snapshot.phase === "idle" ||
        snapshot.phase === "stopped" ||
        snapshot.phase === "inspecting"
      ) {
        return { ...snapshot, phase: "holding", btReset: false }
      }
      return snapshot

    case "HOLD_READY":
      return snapshot.phase === "holding" ||
        snapshot.phase === "idle" ||
        snapshot.phase === "stopped"
        ? { ...snapshot, phase: "ready" }
        : snapshot

    case "CANCEL_HOLD":
      return snapshot.phase === "holding" || snapshot.phase === "ready"
        ? { ...snapshot, phase: event.backTo }
        : snapshot

    case "START_RUNNING":
      if (snapshot.phase === "ready" || snapshot.phase === "inspecting") {
        return { ...snapshot, phase: "running", btReset: false }
      }
      return snapshot

    case "STOP_SOLVE":
      return snapshot.phase === "running"
        ? { ...snapshot, phase: "stopped" }
        : snapshot

    case "START_INSPECTION":
      if (snapshot.phase === "idle" || snapshot.phase === "stopped" || snapshot.phase === "ready") {
        return { ...snapshot, phase: "inspecting", btReset: false }
      }
      return snapshot

    case "INSPECTION_DONE":
      return snapshot.phase === "inspecting" ||
        snapshot.phase === "holding" ||
        snapshot.phase === "ready"
        ? { ...snapshot, phase: "stopped" }
        : snapshot

    case "RESET_IDLE":
      return {
        ...snapshot,
        phase: "idle",
        btReset: false,
        btHandsOnMat: false,
        btArmed: false,
      }

    case "BT_CONNECTED":
      return { ...snapshot, btConnected: event.connected }

    case "BT_HANDS_ON":
      if (snapshot.phase === "inspecting") {
        return { ...snapshot, btReset: false, btHandsOnMat: true }
      }
      return { ...snapshot, phase: "holding", btReset: false }

    case "BT_GET_SET":
      if (snapshot.phase === "inspecting") {
        return { ...snapshot, btHandsOnMat: false, btArmed: true, btReset: false }
      }
      return { ...snapshot, phase: "ready", btHandsOnMat: false, btArmed: false, btReset: false }

    case "BT_HANDS_OFF":
      if (snapshot.phase === "inspecting") {
        return { ...snapshot, btHandsOnMat: false, btArmed: false }
      }
      return { ...snapshot, phase: "idle", btHandsOnMat: false, btArmed: false, btReset: false }

    case "BT_RUNNING":
      return {
        ...snapshot,
        phase: "running",
        btHandsOnMat: false,
        btArmed: false,
        btReset: false,
      }

    case "BT_STOPPED":
      return { ...snapshot, phase: "stopped", btHandsOnMat: false, btArmed: false }

    case "BT_IDLE":
      return {
        ...snapshot,
        phase: "idle",
        btReset: true,
        btHandsOnMat: false,
        btArmed: false,
      }

    case "BT_DISCONNECT":
      return {
        ...snapshot,
        phase: "idle",
        btConnected: false,
        btReset: false,
        btHandsOnMat: false,
        btArmed: false,
      }

    case "SET_SCRAMBLE_READY":
      return { ...snapshot, scrambleReady: event.ready }

    case "SET_SUPPRESS_OPTIONAL_UI":
      return { ...snapshot, suppressOptionalUi: event.suppress }

    default:
      return snapshot
  }
}

export function createTimerEngine(
  initial: Partial<TimerSnapshot> = {}
): TimerEngine {
  let snapshot: TimerSnapshot = { ...DEFAULT_SNAPSHOT, ...initial }
  const listeners = new Set<(next: TimerSnapshot) => void>()

  return {
    dispatch(event) {
      const next = reduce(snapshot, event)
      if (next === snapshot) return
      snapshot = next
      listeners.forEach((listener) => listener(snapshot))
    },

    getSnapshot() {
      return snapshot
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
