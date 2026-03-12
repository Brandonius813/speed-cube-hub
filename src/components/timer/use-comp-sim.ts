"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { saveTimerSession } from "@/lib/actions/save-timer-session"
import { getCompSimBenchmarks } from "@/lib/actions/sessions"
import {
  createCompSimEngine,
  DEFAULT_COMP_SIM_SNAPSHOT,
  type CompSimEngine,
  type CompSimRoundConfig,
  type CompSimSnapshot,
} from "@/lib/timer/comp-sim-engine"
import {
  computeCompSimRoundResult,
  getPlannedSolveCount,
  normalizeCompSimConfig,
} from "@/lib/timer/comp-sim-round"
import { startNoise, stopAllNoise } from "@/lib/timer/comp-sim-audio"
import { msToTruncatedSeconds } from "@/lib/timer/averages"

type ScrambleWorkerRequest = { requestId: number; eventId: string }
type ScrambleWorkerResponse = { requestId: number; eventId: string; scramble: string | null }

type UseCompSimOptions = {
  event: string
  config: CompSimRoundConfig
}

type CompSimBenchmarks = {
  previousCompSimResultSeconds: number | null
  normalBaselineSeconds: number | null
}

export type CompSimApi = {
  snapshot: CompSimSnapshot
  startSim: () => void
  confirmCubeCovered: () => void
  beginInspection: () => void
  startSolve: () => void
  handleSolveComplete: (time_ms: number, penalty: "+2" | "DNF" | null) => void
  cancelSim: () => void
  applyRoundConfig: (config: CompSimRoundConfig) => void
  isActive: boolean
  attemptNumber: number
  roundResult: ReturnType<typeof computeCompSimRoundResult> | null
  isSaving: boolean
  goAgain: () => void
  done: () => void
  benchmarks: CompSimBenchmarks | null
}

export function useCompSim({ event, config }: UseCompSimOptions): CompSimApi {
  const engineRef = useRef<CompSimEngine>(createCompSimEngine())
  const [snapshot, setSnapshot] = useState<CompSimSnapshot>(DEFAULT_COMP_SIM_SNAPSHOT)
  const [isSaving, setIsSaving] = useState(false)
  const [benchmarks, setBenchmarks] = useState<CompSimBenchmarks | null>(null)
  const [attemptNumber, setAttemptNumber] = useState(0)
  const attemptRef = useRef(0)
  const simStartedAtRef = useRef<number | null>(null)
  const eventRef = useRef(event)
  const configRef = useRef(normalizeCompSimConfig(config))

  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe(setSnapshot)
    return unsubscribe
  }, [])

  useEffect(() => {
    eventRef.current = event
  }, [event])

  useEffect(() => {
    const nextConfig = normalizeCompSimConfig(config)
    configRef.current = nextConfig
    engineRef.current.dispatch({ type: "SET_CONFIG", roundConfig: nextConfig })
  }, [config])

  const clearAllTimeouts = useCallback(() => {
    if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current)
    if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current)
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    waitTimeoutRef.current = null
    cueTimeoutRef.current = null
    advanceTimeoutRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearAllTimeouts()
      stopAllNoise()
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [clearAllTimeouts])

  const generateScrambles = useCallback((eventId: string, count: number): Promise<string[]> => {
    return new Promise((resolve) => {
      try {
        const worker = new Worker(new URL("../../lib/timer/scramble-worker.ts", import.meta.url))
        workerRef.current = worker
        const scrambles: string[] = []
        let nextId = 1

        worker.onmessage = (message: MessageEvent<ScrambleWorkerResponse>) => {
          scrambles.push(
            message.data.scramble ??
              "R U R' U' R' F R2 U' R' U' R U R' F'"
          )
          if (scrambles.length >= count) {
            worker.terminate()
            workerRef.current = null
            resolve(scrambles)
            return
          }
          nextId += 1
          const request: ScrambleWorkerRequest = { requestId: nextId, eventId }
          worker.postMessage(request)
        }

        worker.onerror = () => {
          while (scrambles.length < count) {
            scrambles.push("R U R' U' R' F R2 U' R' U' R U R' F'")
          }
          worker.terminate()
          workerRef.current = null
          resolve(scrambles)
        }

        const request: ScrambleWorkerRequest = { requestId: nextId, eventId }
        worker.postMessage(request)
      } catch {
        resolve(Array(count).fill("R U R' U' R' F R2 U' R' U' R U R' F'"))
      }
    })
  }, [])

  const startSim = useCallback(async () => {
    const engine = engineRef.current
    const current = engine.getSnapshot()
    if (current.phase !== "idle" && current.phase !== "sim_complete") return

    clearAllTimeouts()
    setBenchmarks(null)
    simStartedAtRef.current = Date.now()
    attemptRef.current += 1
    setAttemptNumber(attemptRef.current)

    const roundConfig = normalizeCompSimConfig(configRef.current)
    const scrambles = await generateScrambles(
      eventRef.current,
      getPlannedSolveCount(roundConfig.format)
    )

    if (roundConfig.scene !== "off") {
      startNoise({
        scene: roundConfig.scene,
        intensity: roundConfig.intensity,
        randomReactionsEnabled: roundConfig.randomReactionsEnabled,
      })
    }

    engine.dispatch({
      type: "START_SIM",
      scrambles,
      groupNumber: attemptRef.current,
      roundConfig,
    })
  }, [clearAllTimeouts, generateScrambles])

  const confirmCubeCovered = useCallback(() => {
    const engine = engineRef.current
    engine.dispatch({ type: "CONFIRM_CUBE_COVERED" })
    const snap = engine.getSnapshot()
    waitTimeoutRef.current = setTimeout(() => {
      engine.dispatch({ type: "WAIT_COMPLETE" })
      cueTimeoutRef.current = setTimeout(() => {
        engine.dispatch({ type: "CUE_DONE" })
      }, 1500)
    }, snap.waitDurationMs)
  }, [])

  const beginInspection = useCallback(() => {
    engineRef.current.dispatch({ type: "READY_START" })
  }, [])

  const startSolve = useCallback(() => {
    engineRef.current.dispatch({ type: "SOLVE_START" })
  }, [])

  const doAutoSave = useCallback(async (snap: CompSimSnapshot) => {
    const result = computeCompSimRoundResult(snap.roundConfig.format, snap.solves)
    setIsSaving(true)
    try {
      const simStartedAt = simStartedAtRef.current ?? Date.now()
      const saveResult = await saveTimerSession({
        event: eventRef.current,
        solves: snap.solves.map((solve) => ({
          time_ms: solve.time_ms,
          penalty: solve.penalty,
          scramble: solve.scramble,
          comp_sim_group: snap.groupNumber,
        })),
        duration_minutes: (Date.now() - simStartedAt) / 1000 / 60,
        practice_type: "Comp Sim",
        title: `Comp Sim ${snap.roundConfig.format.toUpperCase()} #${snap.groupNumber}`,
        notes: null,
        feed_visible: true,
        session_start_ms: simStartedAt,
        comp_sim: {
          format: snap.roundConfig.format,
          result_seconds:
            result.resultMs == null ? null : msToTruncatedSeconds(result.resultMs),
          scene: snap.roundConfig.scene,
          intensity: snap.roundConfig.intensity,
          time_limit_seconds:
            snap.roundConfig.cumulativeTimeLimitMs == null
              ? null
              : msToTruncatedSeconds(snap.roundConfig.cumulativeTimeLimitMs),
          cutoff_attempt: snap.roundConfig.cutoff?.attempt ?? null,
          cutoff_seconds:
            snap.roundConfig.cutoff == null
              ? null
              : msToTruncatedSeconds(snap.roundConfig.cutoff.cutoffMs),
          ended_reason: snap.endedReason ?? "completed",
          cutoff_met: snap.cutoffMet,
        },
      })

      if (saveResult.sessionId) {
        const reference = await getCompSimBenchmarks(eventRef.current, saveResult.sessionId)
        if (!reference.error) {
          setBenchmarks({
            previousCompSimResultSeconds: reference.previousCompSimResultSeconds,
            normalBaselineSeconds: reference.normalBaselineSeconds,
          })
        }
      }
    } catch {
      // Save failures are non-blocking for the timer flow.
    }
    setIsSaving(false)
  }, [])

  const handleSolveComplete = useCallback((time_ms: number, penalty: "+2" | "DNF" | null) => {
    const engine = engineRef.current
    const current = engine.getSnapshot()
    const scramble = current.scrambles[current.solveIndex] ?? ""

    engine.dispatch({ type: "SOLVE_COMPLETE", time_ms, penalty, scramble })

    const next = engine.getSnapshot()
    if (next.phase === "sim_complete") {
      stopAllNoise()
      void doAutoSave(next)
      return
    }

    if (next.phase === "solve_recorded") {
      advanceTimeoutRef.current = setTimeout(() => {
        engine.dispatch({ type: "ADVANCE_NEXT" })
      }, 1600)
    }
  }, [doAutoSave])

  const cancelSim = useCallback(() => {
    clearAllTimeouts()
    stopAllNoise()
    workerRef.current?.terminate()
    workerRef.current = null
    simStartedAtRef.current = null
    setBenchmarks(null)
    engineRef.current.dispatch({ type: "CANCEL_SIM" })
    attemptRef.current = 0
    setAttemptNumber(0)
  }, [clearAllTimeouts])

  const applyRoundConfig = useCallback((nextConfig: CompSimRoundConfig) => {
    const normalized = normalizeCompSimConfig(nextConfig)
    configRef.current = normalized
    engineRef.current.dispatch({ type: "SET_CONFIG", roundConfig: normalized })
  }, [])

  const goAgain = useCallback(() => {
    engineRef.current.dispatch({ type: "RESET" })
    void startSim()
  }, [startSim])

  const done = useCallback(() => {
    stopAllNoise()
    simStartedAtRef.current = null
    setBenchmarks(null)
    engineRef.current.dispatch({ type: "RESET" })
    attemptRef.current = 0
    setAttemptNumber(0)
  }, [])

  const roundResult =
    snapshot.phase === "sim_complete"
      ? computeCompSimRoundResult(snapshot.roundConfig.format, snapshot.solves)
      : null

  return {
    snapshot,
    startSim,
    confirmCubeCovered,
    beginInspection,
    startSolve,
    handleSolveComplete,
    cancelSim,
    applyRoundConfig,
    isActive: snapshot.phase !== "idle",
    attemptNumber,
    roundResult,
    isSaving,
    goAgain,
    done,
    benchmarks,
  }
}
