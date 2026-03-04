"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  createCompSimEngine,
  computeAo5,
  type CompSimEngine,
  type CompSimSnapshot,
  type CompSimSolve,
  type BackgroundNoise,
} from "@/lib/timer/comp-sim-engine"
import {
  playTimeToSolveCue,
  startNoise,
  stopAllNoise,
} from "@/lib/timer/comp-sim-audio"
import { saveTimerSession } from "@/lib/actions/save-timer-session"

type ScrambleWorkerRequest = { requestId: number; eventId: string }
type ScrambleWorkerResponse = { requestId: number; eventId: string; scramble: string | null }

type UseCompSimOptions = {
  event: string
  sessionStartMs: number | null
}

export type CompSimApi = {
  snapshot: CompSimSnapshot
  startSim: () => void
  confirmCubeCovered: () => void
  /** Transition from ready → inspecting (user presses spacebar/taps to begin inspection) */
  beginInspection: () => void
  /** Transition from inspecting → solving (user released spacebar after hold) */
  startSolve: () => void
  handleSolveComplete: (time_ms: number, penalty: "+2" | "DNF" | null) => void
  cancelSim: () => void
  setBackgroundNoise: (noise: BackgroundNoise) => void
  /** True when comp sim is in any phase other than idle */
  isActive: boolean
  /** Current attempt number across the session */
  attemptNumber: number
  /** Ao5 result for the completed sim (only valid when phase === "sim_complete") */
  ao5Result: ReturnType<typeof computeAo5> | null
  /** Whether we're saving the result */
  isSaving: boolean
  /** Go again — start a new attempt */
  goAgain: () => void
  /** Done — exit comp sim results screen */
  done: () => void
}

export function useCompSim({ event, sessionStartMs }: UseCompSimOptions): CompSimApi {
  const engineRef = useRef<CompSimEngine>(createCompSimEngine())
  const [snapshot, setSnapshot] = useState<CompSimSnapshot>(() => engineRef.current.getSnapshot())
  const [isSaving, setIsSaving] = useState(false)
  const attemptRef = useRef(0)
  const eventRef = useRef(event)
  eventRef.current = event
  const sessionStartRef = useRef(sessionStartMs)
  sessionStartRef.current = sessionStartMs

  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const scramblesRef = useRef<string[]>([])

  // Subscribe to engine changes
  useEffect(() => {
    const unsub = engineRef.current.subscribe(setSnapshot)
    return unsub
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts()
      stopAllNoise()
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const clearAllTimeouts = useCallback(() => {
    if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current)
    if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current)
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    waitTimeoutRef.current = null
    cueTimeoutRef.current = null
    advanceTimeoutRef.current = null
  }, [])

  // Generate 5 scrambles via a temporary worker
  const generateScrambles = useCallback((eventId: string): Promise<string[]> => {
    return new Promise((resolve) => {
      try {
        const worker = new Worker(
          new URL("../../lib/timer/scramble-worker.ts", import.meta.url)
        )
        workerRef.current = worker
        const scrambles: string[] = []
        let nextId = 1

        worker.onmessage = (e: MessageEvent<ScrambleWorkerResponse>) => {
          if (e.data.scramble) {
            scrambles.push(e.data.scramble)
          } else {
            // Fallback: use a placeholder scramble
            scrambles.push("R U R' U' R' F R2 U' R' U' R U R' F'")
          }
          if (scrambles.length >= 5) {
            worker.terminate()
            workerRef.current = null
            resolve(scrambles)
          } else {
            nextId++
            const req: ScrambleWorkerRequest = { requestId: nextId, eventId }
            worker.postMessage(req)
          }
        }

        worker.onerror = () => {
          // Fill remaining with fallback scrambles
          while (scrambles.length < 5) {
            scrambles.push("R U R' U' R' F R2 U' R' U' R U R' F'")
          }
          worker.terminate()
          workerRef.current = null
          resolve(scrambles)
        }

        // Request first scramble
        const req: ScrambleWorkerRequest = { requestId: nextId, eventId }
        worker.postMessage(req)
      } catch {
        // Worker creation failed — use fallback scrambles
        const fallback = Array(5).fill("R U R' U' R' F R2 U' R' U' R U R' F'")
        resolve(fallback)
      }
    })
  }, [])

  // Start a new sim
  const startSim = useCallback(async () => {
    const engine = engineRef.current
    const snap = engine.getSnapshot()
    if (snap.phase !== "idle" && snap.phase !== "sim_complete") return

    // Start noise immediately (before await) so it runs in the user-gesture
    // call stack — browsers block autoplay if the gesture context is lost.
    const noise = snap.backgroundNoise
    if (noise !== "none") startNoise(noise)

    attemptRef.current++
    const scrambles = await generateScrambles(eventRef.current)
    scramblesRef.current = scrambles

    engine.dispatch({
      type: "START_SIM",
      scrambles,
      groupNumber: attemptRef.current,
    })
  }, [generateScrambles])

  // Confirm cube is under cover → start random wait
  const confirmCubeCovered = useCallback(() => {
    const engine = engineRef.current
    engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })

    const snap = engine.getSnapshot()
    waitTimeoutRef.current = setTimeout(() => {
      engine.dispatch({ type: "WAIT_COMPLETE" })

      // Play "Time to solve" cue
      playTimeToSolveCue()

      // Auto-transition to inspection after 1.5s cue display
      cueTimeoutRef.current = setTimeout(() => {
        engine.dispatch({ type: "CUE_DONE" })
      }, 1500)
    }, snap.waitDurationMs)
  }, [])

  // Transition from ready → inspecting (user manually starts inspection)
  const beginInspection = useCallback(() => {
    engineRef.current.dispatch({ type: "READY_START" })
  }, [])

  // Transition from inspecting → solving
  const startSolve = useCallback(() => {
    engineRef.current.dispatch({ type: "SOLVE_START" })
  }, [])

  // Handle solve completion
  const handleSolveComplete = useCallback((time_ms: number, penalty: "+2" | "DNF" | null) => {
    const engine = engineRef.current
    const snap = engine.getSnapshot()
    const scramble = snap.scrambles[snap.solveIndex] ?? ""

    engine.dispatch({ type: "SOLVE_COMPLETE", time_ms, penalty, scramble })

    const nextSnap = engine.getSnapshot()
    if (nextSnap.phase === "sim_complete") {
      // Auto-save
      stopAllNoise()
      doAutoSave(nextSnap)
    } else if (nextSnap.phase === "solve_recorded") {
      // Auto-advance to next scramble after 2s
      advanceTimeoutRef.current = setTimeout(() => {
        engine.dispatch({ type: "ADVANCE_NEXT" })
      }, 2000)
    }
  }, [])

  const doAutoSave = useCallback(async (snap: CompSimSnapshot) => {
    setIsSaving(true)
    try {
      const solves = snap.solves.map((s, i) => ({
        time_ms: s.time_ms,
        penalty: s.penalty,
        scramble: s.scramble,
        comp_sim_group: snap.groupNumber,
        solve_number: i + 1,
      }))

      await saveTimerSession({
        event: eventRef.current,
        solves,
        duration_minutes: sessionStartRef.current
          ? (Date.now() - sessionStartRef.current) / 1000 / 60
          : 1,
        practice_type: "Comp Sim",
        title: `Comp Sim Ao5 #${snap.groupNumber}`,
        notes: null,
        feed_visible: true,
        session_start_ms: sessionStartRef.current ?? Date.now(),
      })
    } catch {
      // Save failed silently — user can see in profile
    }
    setIsSaving(false)
  }, [])

  const cancelSim = useCallback(() => {
    clearAllTimeouts()
    stopAllNoise()
    workerRef.current?.terminate()
    workerRef.current = null
    engineRef.current.dispatch({ type: "CANCEL_SIM" })
    attemptRef.current = 0
  }, [clearAllTimeouts])

  const setBackgroundNoise = useCallback((noise: BackgroundNoise) => {
    engineRef.current.dispatch({ type: "SET_NOISE", noise })
    const snap = engineRef.current.getSnapshot()
    // If sim is active, switch noise immediately
    if (snap.phase !== "idle" && snap.phase !== "sim_complete") {
      startNoise(noise)
    }
  }, [])

  const goAgain = useCallback(() => {
    engineRef.current.dispatch({ type: "RESET" })
    startSim()
  }, [startSim])

  const done = useCallback(() => {
    stopAllNoise()
    engineRef.current.dispatch({ type: "RESET" })
    attemptRef.current = 0
  }, [])

  const ao5Result = snapshot.phase === "sim_complete"
    ? computeAo5(snapshot.solves)
    : null

  return {
    snapshot,
    startSim,
    confirmCubeCovered,
    beginInspection,
    startSolve,
    handleSolveComplete,
    cancelSim,
    setBackgroundNoise,
    isActive: snapshot.phase !== "idle",
    attemptNumber: attemptRef.current,
    ao5Result,
    isSaving,
    goAgain,
    done,
  }
}
