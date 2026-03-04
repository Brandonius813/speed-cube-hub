"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Settings } from "lucide-react"
import { useInspection } from "@/lib/timer/inspection"
import { cn } from "@/lib/utils"
import {
  type Penalty,
  type TimerSolve as Solve,
  bestStat,
  computeStat,
} from "@/lib/timer/stats"
import {
  SolveListPanel,
  type SolveListRow,
  type SolveStats,
} from "@/components/timer/solve-list-panel"
import {
  useBluetoothTimer,
  type BtTimerCallbacks,
} from "@/components/timer/use-bluetooth-timer"
import { isBleSupported } from "@/lib/timer/bluetooth"
import { EndSessionModal } from "@/components/timer/end-session-modal"
import {
  createTimerEngine,
  type TimerEvent,
  type TimerPhase,
} from "@/lib/timer/engine"
import { createSolveStore } from "@/lib/timer/solve-store"
import { emitTimerTelemetry } from "@/lib/timer/telemetry"
import { getPracticeTypesForEvent } from "@/lib/constants"
import { PracticeModeSelector } from "@/components/timer/practice-mode-selector"
import { CompSimOverlay } from "@/components/timer/comp-sim-overlay"
import type {
  StatsSummary,
  StatsWorkerRequest,
  StatsWorkerResponse,
} from "@/lib/timer/stats-worker-types"

const HOLD_MS = 550
const MILESTONES = [5, 12, 25, 50, 100, 200, 500, 1000]
const SCRAMBLE_TIMEOUT_MS = 1800
const SCRAMBLE_MAX_RETRIES = 3
const INITIAL_SOLVE_WINDOW = 120
const TIMER_V2_ENGINE_ENABLED = process.env.NEXT_PUBLIC_TIMER_V2_ENGINE !== "false"

const EVENTS = [
  { id: "333", name: "3x3" },
  { id: "222", name: "2x2" },
  { id: "444", name: "4x4" },
  { id: "555", name: "5x5" },
  { id: "666", name: "6x6" },
  { id: "777", name: "7x7" },
  { id: "333bf", name: "3BLD" },
  { id: "333oh", name: "3OH" },
  { id: "pyram", name: "Pyram" },
  { id: "skewb", name: "Skewb" },
  { id: "clock", name: "Clock" },
  { id: "minx", name: "Megaminx" },
  { id: "sq1", name: "SQ-1" },
]

type ScrambleWorkerRequest = {
  requestId: number
  eventId: string
}

type ScrambleWorkerResponse = {
  requestId: number
  eventId: string
  scramble: string | null
  error?: string
}

type PendingScrambleRequest = {
  requestId: number
  eventId: string
  kind: "current" | "prefetch"
  attempt: number
  timeoutId: number
}

type SessionGroupMeta = {
  id: string
  title: string
  savedAt: number
  solveCount: number
}

function loadSessionGroups(eventId: string): SessionGroupMeta[] {
  try {
    return JSON.parse(localStorage.getItem(`timer-session-groups-${eventId}`) ?? "[]")
  } catch {
    return []
  }
}

function saveSessionGroups(eventId: string, groups: SessionGroupMeta[]) {
  try {
    localStorage.setItem(`timer-session-groups-${eventId}`, JSON.stringify(groups))
  } catch {}
}

function fmt(ms: number, dec = 2): string {
  const s = ms / 1000
  if (s < 60) return s.toFixed(dec)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(dec).padStart(dec + 3, "0")}`
}

function parseTime(raw: string): number | null {
  if (raw.includes(":")) {
    const colonMatch = raw.trim().match(/^(\d+):(\d{1,2})(?:[.,](\d{1,2}))?$/)
    if (!colonMatch) return null
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    const cs = parseInt((colonMatch[3] ?? "0").padEnd(2, "0"), 10)
    if (secs >= 60) return null
    const ms = (mins * 60 + secs) * 1000 + cs * 10
    return ms > 0 ? ms : null
  }
  const digits = raw.replace(/\D/g, "")
  if (!digits) return null
  const padded = digits.padStart(3, "0")
  const cs = parseInt(padded.slice(-2), 10)
  const rest = padded.slice(0, -2)
  const secs = parseInt(rest.slice(-2) || "0", 10)
  const mins = parseInt(rest.slice(0, -2) || "0", 10)
  if (secs >= 60) return null
  const ms = (mins * 60 + secs) * 1000 + cs * 10
  return ms > 0 ? ms : null
}

function computeStatsSync(solves: Solve[], statCols: [string, string]): SolveStats {
  const valid = solves
    .filter((s) => s.penalty !== "DNF")
    .map((s) => (s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms))
  const mean = valid.length
    ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    : null

  const milestoneRows = MILESTONES.filter((n) => solves.length >= n).map((n) => {
    const key = `ao${n}`
    return {
      key,
      cur: computeStat(solves, key),
      best: bestStat(solves, key),
    }
  })

  const n1 = parseInt(statCols[0].slice(2), 10)
  const n2 = parseInt(statCols[1].slice(2), 10)
  const rolling1 = solves.map((_, i) => {
    if (i + 1 < n1) return null
    return computeStat(solves.slice(i + 1 - n1, i + 1), statCols[0])
  })
  const rolling2 = solves.map((_, i) => {
    if (i + 1 < n2) return null
    return computeStat(solves.slice(i + 1 - n2, i + 1), statCols[1])
  })

  return {
    best: valid.length ? Math.min(...valid) : null,
    mean,
    milestoneRows,
    rolling1,
    rolling2,
  }
}

function summaryToStats(summary: StatsSummary): SolveStats {
  return {
    best: summary.best,
    mean: summary.mean,
    milestoneRows: summary.milestoneRows,
    rolling1: summary.rolling1,
    rolling2: summary.rolling2,
  }
}

export function TimerContent() {
  const [event, setEvent] = useState(() => {
    try {
      return localStorage.getItem("timer-event") ?? "333"
    } catch {
      return "333"
    }
  })
  const [scramble, setScramble] = useState("Preparing scramble...")
  const [scrambleError, setScrambleError] = useState<string | null>(null)
  const [solves, setSolves] = useState<Solve[]>([])
  const [inspOn, setInspOn] = useState(() => {
    try {
      return localStorage.getItem("timer-insp-on") === "true"
    } catch {
      return false
    }
  })
  const [typing, setTyping] = useState(() => {
    try {
      return localStorage.getItem("timer-typing") === "true"
    } catch {
      return false
    }
  })
  const [typeVal, setTypeVal] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scrambleCopied, setScrambleCopied] = useState(false)
  const [scrambleCanGoPrev, setScrambleCanGoPrev] = useState(false)
  const [practiceType, setPracticeType] = useState(() => {
    try {
      return localStorage.getItem("timer-practice-type") ?? "Solves"
    } catch {
      return "Solves"
    }
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [statCols, setStatCols] = useState<[string, string]>(() => {
    try {
      const s = localStorage.getItem("timer-stat-rows")
      if (s) return JSON.parse(s)
    } catch {}
    return ["ao5", "ao12"]
  })
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(() => {
    try {
      const s = localStorage.getItem("timer-session-start")
      return s ? Number(s) : null
    } catch {
      return null
    }
  })
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [sessionPaused, setSessionPaused] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [stats, setStats] = useState<SolveStats>(() => computeStatsSync([], ["ao5", "ao12"]))
  const [solveRange, setSolveRange] = useState({
    start: 0,
    end: INITIAL_SOLVE_WINDOW,
    scrollOffset: 0,
  })
  const [solveRows, setSolveRows] = useState<SolveListRow[]>([])
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  const engineRef = useRef(createTimerEngine({ phase: "idle", scrambleReady: false }))
  const [engineSnapshot, setEngineSnapshot] = useState(() => engineRef.current.getSnapshot())
  const phase = engineSnapshot.phase

  const solveStoreRef = useRef(createSolveStore())
  const statsWorkerRef = useRef<Worker | null>(null)
  const scrambleWorkerRef = useRef<Worker | null>(null)
  const btCallbacksRef = useRef<BtTimerCallbacks>({
    onHandsOn: () => {},
    onGetSet: () => {},
    onHandsOff: () => {},
    onRunning: () => {},
    onStopped: () => {},
    onIdle: () => {},
    onDisconnect: () => {},
  })

  const { btStatus, connect: btConnect, disconnect: btDisconnect } =
    useBluetoothTimer(btCallbacksRef.current)

  const startRef = useRef(0)
  const phaseRef = useRef<TimerPhase>("idle")
  const heldRef = useRef(false)
  const holdTimeoutRef = useRef<number | null>(null)
  const scrambleRef = useRef("")
  const eventRef = useRef("333")
  const inspOnRef = useRef(false)
  const inspRef = useRef<ReturnType<typeof useInspection> | null>(null)
  const inspHoldRef = useRef(false)
  const tapToInspectRef = useRef(false)
  const btConnectedRef = useRef(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const scrambleHistoryRef = useRef<string[]>([])
  const scrambleIdxRef = useRef(0)
  const nextScrambleRef = useRef<string | null>(null)
  const scrambleRequestSeqRef = useRef(0)
  const pendingScrambleRef = useRef<Map<number, PendingScrambleRequest>>(new Map())
  const scrambleReadyRef = useRef(false)
  const sessionPausedMsRef = useRef<number>(
    (() => {
      try {
        return Number(localStorage.getItem("timer-session-paused-ms") ?? 0)
      } catch {
        return 0
      }
    })()
  )
  const pausedAtRef = useRef<number | null>(null)
  const suppressUiResetRef = useRef<number | null>(null)
  const solvesRef = useRef<Solve[]>([])
  const statColsRef = useRef<[string, string]>(statCols)

  const insp = useInspection({ voice: true })

  const dispatchEngine = useCallback((eventMessage: TimerEvent) => {
    engineRef.current.dispatch(eventMessage)
  }, [])

  phaseRef.current = phase
  scrambleRef.current = scramble
  eventRef.current = event
  inspOnRef.current = inspOn
  inspRef.current = insp
  scrambleReadyRef.current = engineSnapshot.scrambleReady
  solvesRef.current = solves
  statColsRef.current = statCols

  // Compute saved vs current session solve counts for display + stats
  const savedSolveCount = useMemo(() => solves.filter((s) => !!s.group).length, [solves])
  const currentSolveCount = solves.length - savedSolveCount

  // Compute group boundaries for visual dividers (indices in reversed display order)
  const groupBoundaries = useMemo(() => {
    const boundaries = new Set<number>()
    for (let i = solves.length - 2; i >= 0; i--) {
      const displayIdx = solves.length - 1 - i
      const curGroup = solves[i].group ?? null
      const nextGroup = solves[i + 1].group ?? null
      if (curGroup !== nextGroup) {
        boundaries.add(displayIdx)
      }
    }
    return boundaries
  }, [solves])

  const setIdle = useCallback(() => {
    dispatchEngine({ type: "RESET_IDLE" })
  }, [dispatchEngine])

  const goToScramble = useCallback((idx: number) => {
    scrambleIdxRef.current = idx
    const value = scrambleHistoryRef.current[idx]
    if (value) setScramble(value)
    setScrambleCanGoPrev(idx > 0)
  }, [])

  const resetScrambleHistory = useCallback((value: string) => {
    scrambleHistoryRef.current = [value]
    scrambleIdxRef.current = 0
    setScramble(value)
    setScrambleCanGoPrev(false)
  }, [])

  const clearPendingScrambleRequests = useCallback(() => {
    for (const pending of pendingScrambleRef.current.values()) {
      clearTimeout(pending.timeoutId)
    }
    pendingScrambleRef.current.clear()
  }, [])

  const hasPendingScrambleKind = useCallback(
    (kind: "current" | "prefetch", eventId: string) => {
      for (const pending of pendingScrambleRef.current.values()) {
        if (pending.kind === kind && pending.eventId === eventId) return true
      }
      return false
    },
    []
  )

  const requestScramble = useCallback(
    (kind: "current" | "prefetch", eventId = eventRef.current, attempt = 1) => {
      const worker = scrambleWorkerRef.current
      if (!worker) {
        if (kind === "current") {
          dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
          setScramble("Scramble worker unavailable")
          setScrambleError("Scramble worker unavailable in this browser tab")
          emitTimerTelemetry("timer_error", { scope: "scramble-worker-init" })
        }
        return
      }

      const requestId = ++scrambleRequestSeqRef.current
      const timeoutId = window.setTimeout(() => {
        const pending = pendingScrambleRef.current.get(requestId)
        if (!pending) return
        pendingScrambleRef.current.delete(requestId)
        emitTimerTelemetry("scramble_worker_timeout", {
          eventId: pending.eventId,
          kind: pending.kind,
          attempt: pending.attempt,
        })
        if (pending.attempt < SCRAMBLE_MAX_RETRIES) {
          requestScramble(pending.kind, pending.eventId, pending.attempt + 1)
          return
        }
        if (pending.kind === "current" && pending.eventId === eventRef.current) {
          dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
          setScrambleError("Scramble generation timed out. Retrying in background.")
        }
      }, SCRAMBLE_TIMEOUT_MS)

      const pending: PendingScrambleRequest = {
        requestId,
        eventId,
        kind,
        attempt,
        timeoutId,
      }
      pendingScrambleRef.current.set(requestId, pending)
      const message: ScrambleWorkerRequest = { requestId, eventId }
      worker.postMessage(message)
    },
    [dispatchEngine]
  )

  const rebuildWindowRows = useCallback(
    (windowSolves: Solve[]): SolveListRow[] => {
      const rows: SolveListRow[] = []
      for (let i = 0; i < windowSolves.length; i++) {
        const displayIndex = solveRange.start + i
        const solveIndex = solves.length - 1 - displayIndex
        if (solveIndex < 0) continue
        const liveSolve = solves[solveIndex] ?? windowSolves[i]
        rows.push({
          solve: liveSolve,
          solveIndex,
          displayNumber: solves.length - displayIndex,
        })
      }
      return rows
    },
    [solveRange.start, solves]
  )

  const initStats = useCallback(
    (sessionId: string, seedSolves: Solve[]) => {
      if (!statsWorkerRef.current) {
        setStats(computeStatsSync(seedSolves, statColsRef.current))
        return
      }
      const message: StatsWorkerRequest = {
        type: "init",
        sessionId,
        solves: seedSolves,
        statCols: statColsRef.current,
        milestones: MILESTONES,
      }
      statsWorkerRef.current.postMessage(message)
    },
    []
  )

  const appendStats = useCallback((sessionId: string, solve: Solve) => {
    if (!statsWorkerRef.current) {
      setStats(computeStatsSync([...solvesRef.current, solve], statColsRef.current))
      return
    }
    const message: StatsWorkerRequest = { type: "append", sessionId, solve }
    statsWorkerRef.current.postMessage(message)
  }, [])

  const updateStatsForPenalty = useCallback(
    (sessionId: string, id: string, penalty: Penalty) => {
      if (!statsWorkerRef.current) {
        const next = solvesRef.current.map((solve) =>
          solve.id === id ? { ...solve, penalty } : solve
        )
        setStats(computeStatsSync(next, statColsRef.current))
        return
      }
      const message: StatsWorkerRequest = {
        type: "update",
        sessionId,
        id,
        penalty,
      }
      statsWorkerRef.current.postMessage(message)
    },
    []
  )

  const deleteStatsSolve = useCallback((sessionId: string, id: string) => {
    if (!statsWorkerRef.current) {
      const next = solvesRef.current.filter((solve) => solve.id !== id)
      setStats(computeStatsSync(next, statColsRef.current))
      return
    }
    const message: StatsWorkerRequest = { type: "delete", sessionId, id }
    statsWorkerRef.current.postMessage(message)
  }, [])

  const recomputeStats = useCallback(
    (sessionId: string, seedSolves?: Solve[]) => {
      if (!statsWorkerRef.current) {
        setStats(computeStatsSync(seedSolves ?? solvesRef.current, statColsRef.current))
        return
      }
      const message: StatsWorkerRequest = {
        type: "recompute",
        sessionId,
        solves: seedSolves,
        statCols: statColsRef.current,
        milestones: MILESTONES,
      }
      statsWorkerRef.current.postMessage(message)
    },
    []
  )

  const consumeNextScramble = useCallback(() => {
    const eventId = eventRef.current
    const currentValue =
      scrambleHistoryRef.current[scrambleIdxRef.current] ?? scrambleRef.current

    if (nextScrambleRef.current) {
      const next = nextScrambleRef.current
      nextScrambleRef.current = null
      scrambleHistoryRef.current = [currentValue, next]
      goToScramble(1)
      dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: true })
      if (!hasPendingScrambleKind("prefetch", eventId)) {
        requestScramble("prefetch", eventId, 1)
      }
      return
    }

    scrambleHistoryRef.current = [currentValue, "Preparing scramble..."]
    goToScramble(1)
    dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
    if (!hasPendingScrambleKind("current", eventId)) {
      requestScramble("current", eventId, 1)
    }
  }, [dispatchEngine, goToScramble, hasPendingScrambleKind, requestScramble])

  const migrateLegacySolves = useCallback(async (sessionId: string) => {
    if (typeof window === "undefined") return
    const migratedKey = "timer-solves-migrated-v2"
    if (localStorage.getItem(migratedKey) === "true") return

    const raw = localStorage.getItem("timer-solves")
    if (!raw) {
      localStorage.setItem(migratedKey, "true")
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      localStorage.removeItem("timer-solves")
      localStorage.setItem(migratedKey, "true")
      return
    }

    const legacy = Array.isArray(parsed)
      ? parsed
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null
            const candidate = entry as Partial<Solve>
            if (typeof candidate.id !== "string") return null
            if (typeof candidate.time_ms !== "number") return null
            if (typeof candidate.scramble !== "string") return null
            const penalty: Penalty =
              candidate.penalty === "+2" || candidate.penalty === "DNF"
                ? candidate.penalty
                : null
            return {
              id: candidate.id,
              time_ms: Math.max(0, Math.round(candidate.time_ms)),
              penalty,
              scramble: candidate.scramble,
            } satisfies Solve
          })
          .filter((solve): solve is Solve => solve !== null)
      : []

    const existing = await solveStoreRef.current.count(sessionId)
    if (existing === 0 && legacy.length > 0) {
      await solveStoreRef.current.replaceSession(sessionId, legacy)
    }

    localStorage.removeItem("timer-solves")
    localStorage.setItem(migratedKey, "true")
  }, [])

  useEffect(() => {
    return engineRef.current.subscribe(setEngineSnapshot)
  }, [])

  useEffect(() => {
    solveStoreRef.current.onFallback = (reason) => {
      setStorageWarning("Solves are stored in memory only — they'll be lost if you refresh the page.")
      emitTimerTelemetry("timer_error", { scope: "solve_store_fallback", reason })
    }
  }, [])

  useEffect(() => {
    if (!TIMER_V2_ENGINE_ENABLED) return
    try {
      const worker = new Worker(
        new URL("../../lib/timer/stats-worker.ts", import.meta.url)
      )
      worker.onmessage = (eventMessage: MessageEvent<StatsWorkerResponse>) => {
        const message = eventMessage.data
        if (message.type === "error") {
          emitTimerTelemetry("timer_error", {
            scope: "stats_worker",
            message: message.message,
          })
          return
        }
        if (message.sessionId !== eventRef.current) return
        setStats(summaryToStats(message.summary))
        if (message.latencyMs > 16) {
          emitTimerTelemetry("stats_worker_latency_ms", {
            latencyMs: message.latencyMs,
            solveCount: solvesRef.current.length,
            sessionId: message.sessionId,
          })
        }
      }
      worker.onerror = (errorEvent) => {
        errorEvent.preventDefault()
        emitTimerTelemetry("timer_error", {
          scope: "stats_worker_crash",
          message: errorEvent.message,
        })
        worker.terminate()
        statsWorkerRef.current = null
        setStats(computeStatsSync(solvesRef.current, statColsRef.current))
      }
      statsWorkerRef.current = worker
      initStats(eventRef.current, solvesRef.current)
    } catch {
      statsWorkerRef.current = null
    }
    return () => {
      statsWorkerRef.current?.terminate()
      statsWorkerRef.current = null
    }
  }, [initStats])

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL("../../lib/timer/scramble-worker.ts", import.meta.url)
      )
      worker.onmessage = (eventMessage: MessageEvent<ScrambleWorkerResponse>) => {
        const message = eventMessage.data
        const pending = pendingScrambleRef.current.get(message.requestId)
        if (!pending) return
        pendingScrambleRef.current.delete(message.requestId)
        clearTimeout(pending.timeoutId)

        if (pending.eventId !== eventRef.current) return
        if (message.eventId !== pending.eventId) return

        if (message.error || !message.scramble) {
          if (pending.attempt < SCRAMBLE_MAX_RETRIES) {
            requestScramble(pending.kind, pending.eventId, pending.attempt + 1)
            return
          }
          if (pending.kind === "current") {
            dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
            setScrambleError("Failed to generate scramble. Please wait and retry.")
          }
          emitTimerTelemetry("timer_error", {
            scope: "scramble_worker",
            eventId: pending.eventId,
            kind: pending.kind,
            message: message.error ?? "null scramble",
          })
          return
        }

        if (pending.kind === "current") {
          setScrambleError(null)
          resetScrambleHistory(message.scramble)
          dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: true })
          if (!hasPendingScrambleKind("prefetch", pending.eventId)) {
            requestScramble("prefetch", pending.eventId, 1)
          }
          return
        }

        nextScrambleRef.current = message.scramble
      }
      worker.onerror = (errorEvent) => {
        errorEvent.preventDefault()
        emitTimerTelemetry("timer_error", {
          scope: "scramble_worker_crash",
          message: errorEvent.message,
        })
        worker.terminate()
        scrambleWorkerRef.current = null
        setScrambleError("Scramble worker crashed. Attempting restart...")
        setTimeout(() => {
          try {
            const newWorker = new Worker(
              new URL("../../lib/timer/scramble-worker.ts", import.meta.url)
            )
            newWorker.onmessage = worker.onmessage
            newWorker.onerror = worker.onerror
            scrambleWorkerRef.current = newWorker
            requestScramble("current", eventRef.current, 1)
            setScrambleError(null)
          } catch {
            setScrambleError("Scramble generation unavailable. Please refresh the page.")
          }
        }, 500)
      }
      scrambleWorkerRef.current = worker
    } catch {
      scrambleWorkerRef.current = null
      dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
      setScramble("Scramble worker unavailable")
      setScrambleError("Failed to start scramble worker")
    }
    return () => {
      clearPendingScrambleRequests()
      scrambleWorkerRef.current?.terminate()
      scrambleWorkerRef.current = null
    }
  }, [
    clearPendingScrambleRequests,
    dispatchEngine,
    hasPendingScrambleKind,
    requestScramble,
    resetScrambleHistory,
  ])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await migrateLegacySolves(event)
      const loaded = await solveStoreRef.current.loadSession(event)
      if (cancelled) return
      setSolves(loaded)
      setSelectedId(null)
      setSolveRange((prev) => ({
        ...prev,
        start: 0,
        end: Math.max(INITIAL_SOLVE_WINDOW, prev.end),
        scrollOffset: 0,
      }))
      // Stats only computed on current session solves (ungrouped)
      const currentSolves = loaded.filter((s) => !s.group)
      initStats(event, currentSolves)
    })()
    return () => {
      cancelled = true
    }
  }, [event, initStats, migrateLegacySolves])

  useEffect(() => {
    clearPendingScrambleRequests()
    nextScrambleRef.current = null
    scrambleHistoryRef.current = []
    scrambleIdxRef.current = 0
    setScramble("Preparing scramble...")
    setScrambleCanGoPrev(false)
    setScrambleError(null)
    dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
    requestScramble("current", event, 1)
  }, [clearPendingScrambleRequests, dispatchEngine, event, requestScramble])

  useEffect(() => {
    recomputeStats(event)
  }, [event, recomputeStats, statCols])

  useEffect(() => {
    let cancelled = false
    const limit = Math.max(0, solveRange.end - solveRange.start)
    if (limit === 0) {
      setSolveRows([])
      return
    }

    solveStoreRef.current
      .listWindow(event, solveRange.start, limit)
      .then((windowSolves) => {
        if (cancelled) return
        if (windowSolves.length > 0) {
          setSolveRows(rebuildWindowRows(windowSolves))
          return
        }
        const fallback: Solve[] = []
        for (
          let displayIndex = solveRange.start;
          displayIndex < solveRange.end && displayIndex < solves.length;
          displayIndex++
        ) {
          const solveIndex = solves.length - 1 - displayIndex
          if (solveIndex < 0) break
          fallback.push(solves[solveIndex])
        }
        setSolveRows(rebuildWindowRows(fallback))
      })
      .catch(() => {
        if (cancelled) return
        const fallback: Solve[] = []
        for (
          let displayIndex = solveRange.start;
          displayIndex < solveRange.end && displayIndex < solves.length;
          displayIndex++
        ) {
          const solveIndex = solves.length - 1 - displayIndex
          if (solveIndex < 0) break
          fallback.push(solves[solveIndex])
        }
        setSolveRows(rebuildWindowRows(fallback))
      })

    return () => {
      cancelled = true
    }
  }, [event, rebuildWindowRows, solveRange.end, solveRange.start, solves])

  useEffect(() => {
    try {
      if (sessionStartTime !== null) {
        localStorage.setItem("timer-session-start", String(sessionStartTime))
      } else {
        localStorage.removeItem("timer-session-start")
      }
    } catch {}
  }, [sessionStartTime])

  useEffect(() => {
    if (!sessionStartTime || sessionPaused) return
    const interval = setInterval(() => {
      setSessionElapsed(
        Math.floor(
          (Date.now() - sessionStartTime - sessionPausedMsRef.current) / 1000
        )
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionPaused, sessionStartTime])

  useEffect(() => {
    if (!TIMER_V2_ENGINE_ENABLED) return
    if (typeof PerformanceObserver === "undefined") return
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration <= 50) continue
        if (phaseRef.current !== "running") continue
        emitTimerTelemetry("longtask_while_running", {
          durationMs: Math.round(entry.duration * 100) / 100,
        })
        dispatchEngine({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: true })
        if (suppressUiResetRef.current) {
          clearTimeout(suppressUiResetRef.current)
        }
        suppressUiResetRef.current = window.setTimeout(() => {
          dispatchEngine({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: false })
          suppressUiResetRef.current = null
        }, 1500)
      }
    })
    try {
      observer.observe({ entryTypes: ["longtask"] })
    } catch {
      return undefined
    }
    return () => {
      observer.disconnect()
      if (suppressUiResetRef.current) {
        clearTimeout(suppressUiResetRef.current)
        suppressUiResetRef.current = null
      }
    }
  }, [dispatchEngine])

  useEffect(() => {
    if (phase === "running") return
    if (!engineSnapshot.suppressOptionalUi) return
    dispatchEngine({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: false })
  }, [dispatchEngine, engineSnapshot.suppressOptionalUi, phase])

  useEffect(() => {
    if (insp.state === "done" && (phaseRef.current === "inspecting" || inspHoldRef.current)) {
      inspHoldRef.current = false
      addSolve(0, "DNF")
      dispatchEngine({ type: "INSPECTION_DONE" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insp.state])

  useEffect(() => {
    if (!inspOn && phaseRef.current === "inspecting") {
      inspRef.current?.cancelInspection()
      setIdle()
    }
  }, [inspOn, setIdle])

  useEffect(() => {
    if (!settingsOpen) return
    const handler = (eventMouse: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(eventMouse.target as Node)
      ) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [settingsOpen])

  useEffect(() => {
    const dn = (eventKey: KeyboardEvent) => {
      if (btConnectedRef.current) return
      if (eventKey.code === "Space") {
        eventKey.preventDefault()
        if (eventKey.repeat || typing) return
        handlePress()
        return
      }
      if (!typing && phaseRef.current === "running") stopTimer()
    }

    const up = (eventKey: KeyboardEvent) => {
      if (btConnectedRef.current) return
      if (eventKey.code !== "Space" || typing) return
      eventKey.preventDefault()
      heldRef.current = false
      releaseHold()
    }
    window.addEventListener("keydown", dn)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", dn)
      window.removeEventListener("keyup", up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing])

  useEffect(() => {
    dispatchEngine({ type: "BT_CONNECTED", connected: btStatus === "connected" })
    btConnectedRef.current = btStatus === "connected"
  }, [btStatus, dispatchEngine])

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current)
      }
      clearPendingScrambleRequests()
    }
  }, [clearPendingScrambleRequests])

  function fmtSession(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  function startSession() {
    setSessionStartTime(Date.now())
    setSessionElapsed(0)
    setSessionPaused(false)
    setSessionSaved(false)
    sessionPausedMsRef.current = 0
    pausedAtRef.current = null
    try {
      localStorage.removeItem("timer-session-paused-ms")
    } catch {}
  }

  function pauseSession() {
    pausedAtRef.current = Date.now()
    setSessionPaused(true)
    try {
      localStorage.setItem(
        "timer-session-paused-ms",
        String(sessionPausedMsRef.current)
      )
    } catch {}
  }

  function resumeSession() {
    if (pausedAtRef.current !== null) {
      sessionPausedMsRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
      try {
        localStorage.setItem(
          "timer-session-paused-ms",
          String(sessionPausedMsRef.current)
        )
      } catch {}
    }
    setSessionPaused(false)
  }

  function cancelSession() {
    setSessionStartTime(null)
    setSessionElapsed(0)
    setSessionPaused(false)
    sessionPausedMsRef.current = 0
    pausedAtRef.current = null
    try {
      localStorage.removeItem("timer-session-start")
      localStorage.removeItem("timer-session-paused-ms")
    } catch {}
  }

  function endSession() {
    const currentCount = solves.filter((s) => !s.group).length
    if (currentCount === 0) {
      cancelSession()
      return
    }
    if (sessionPaused && pausedAtRef.current !== null) {
      sessionPausedMsRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
    }
    setShowEndModal(true)
  }

  function handleSessionSaved(sessionTitle: string) {
    setShowEndModal(false)
    const groupId = crypto.randomUUID()
    const currentCount = solves.filter((s) => !s.group).length

    // Tag current solves as belonging to this saved session
    setSolves((prev) => prev.map((s) => (s.group ? s : { ...s, group: groupId })))
    void solveStoreRef.current
      .markGroup(eventRef.current, groupId)
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_mark_group" }))

    // Store group metadata for display
    const groups = loadSessionGroups(eventRef.current)
    groups.push({ id: groupId, title: sessionTitle, savedAt: Date.now(), solveCount: currentCount })
    saveSessionGroups(eventRef.current, groups)

    setSelectedId(null)
    setIdle()
    initStats(eventRef.current, [])
    setSessionStartTime(null)
    setSessionElapsed(0)
    setSessionPaused(false)
    setSessionSaved(true)
    sessionPausedMsRef.current = 0
    pausedAtRef.current = null
    setTimeout(() => setSessionSaved(false), 3000)
    try {
      localStorage.removeItem("timer-session-paused-ms")
    } catch {}
  }

  function startTimer() {
    startRef.current = performance.now()
    dispatchEngine({ type: "START_RUNNING" })
  }

  function stopTimer() {
    const ms = Math.round((performance.now() - startRef.current) / 10) * 10
    dispatchEngine({ type: "STOP_SOLVE" })
    addSolve(ms, null)
  }

  function startHold() {
    heldRef.current = true
    dispatchEngine({ type: "START_HOLD" })
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
    holdTimeoutRef.current = window.setTimeout(() => {
      if (phaseRef.current === "holding" && heldRef.current) {
        dispatchEngine({ type: "HOLD_READY" })
      }
    }, HOLD_MS)
  }

  function releaseHold() {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }

    if (tapToInspectRef.current) {
      tapToInspectRef.current = false
      dispatchEngine({ type: "START_INSPECTION" })
      inspRef.current?.startInspection()
      return
    }

    if (inspHoldRef.current) {
      inspHoldRef.current = false
      if (phaseRef.current === "ready") {
        const pen = inspRef.current?.finishInspection() ?? null
        if (pen === "DNF") {
          addSolve(0, "DNF")
          dispatchEngine({ type: "INSPECTION_DONE" })
        } else {
          startTimer()
        }
      } else {
        dispatchEngine({ type: "CANCEL_HOLD", backTo: "inspecting" })
      }
      return
    }

    if (phaseRef.current === "holding") {
      dispatchEngine({ type: "CANCEL_HOLD", backTo: "idle" })
      return
    }

    if (phaseRef.current !== "ready") return
    startTimer()
  }

  function handlePress() {
    const currentPhase = phaseRef.current
    if (currentPhase === "running") {
      stopTimer()
      return
    }

    if (currentPhase === "inspecting") {
      inspHoldRef.current = true
      tapToInspectRef.current = false
      startHold()
      return
    }

    if (currentPhase === "idle" || currentPhase === "stopped") {
      if (sessionPaused) return
      if (!scrambleReadyRef.current) return
      inspHoldRef.current = false
      if (inspOnRef.current) {
        tapToInspectRef.current = true
        heldRef.current = true
        dispatchEngine({ type: "HOLD_READY" })
      } else {
        tapToInspectRef.current = false
        startHold()
      }
    }
  }

  function addSolve(time_ms: number, penalty: Penalty) {
    const solve: Solve = {
      id: crypto.randomUUID(),
      time_ms,
      penalty,
      scramble: scrambleRef.current,
    }
    setSolves((previous) => [...previous, solve])
    void solveStoreRef.current
      .appendSolve(eventRef.current, solve)
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_append" }))
    appendStats(eventRef.current, solve)
    setSelectedId(null)
    consumeNextScramble()
  }

  function setPenalty(id: string, penalty: Penalty) {
    setSolves((previous) =>
      previous.map((solve) => (solve.id === id ? { ...solve, penalty } : solve))
    )
    void solveStoreRef.current
      .updatePenalty(id, penalty)
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_update" }))
    updateStatsForPenalty(eventRef.current, id, penalty)
    setSelectedId(null)
  }

  function deleteSolve(id: string) {
    setSolves((previous) => previous.filter((solve) => solve.id !== id))
    void solveStoreRef.current
      .deleteSolve(id)
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_delete" }))
    deleteStatsSolve(eventRef.current, id)
    setSelectedId(null)
  }

  function changePracticeType(type: string) {
    setPracticeType(type)
    try {
      localStorage.setItem("timer-practice-type", type)
    } catch {}
  }

  function changeEvent(newEvent: string) {
    if (sessionStartTime) cancelSession()
    insp.cancelInspection()
    setSelectedId(null)
    setEvent(newEvent)
    setIdle()
    setShowEndModal(false)
    try {
      localStorage.setItem("timer-event", newEvent)
    } catch {}
    // Reset practice type if current one isn't available for the new event
    const available = getPracticeTypesForEvent(newEvent)
    if (!available.includes(practiceType)) {
      changePracticeType("Solves")
    }
  }

  function updateStatCol(idx: 0 | 1, key: string) {
    setStatCols((previous) => {
      const next: [string, string] = [previous[0], previous[1]]
      next[idx] = key
      try {
        localStorage.setItem("timer-stat-rows", JSON.stringify(next))
      } catch {}
      return next
    })
    recomputeStats(eventRef.current)
  }

  function nextScramble() {
    const history = scrambleHistoryRef.current
    const idx = scrambleIdxRef.current

    if (idx < history.length - 1) {
      goToScramble(idx + 1)
      return
    }

    if (nextScrambleRef.current) {
      const next = nextScrambleRef.current
      nextScrambleRef.current = null
      const currentValue = history[idx] ?? scrambleRef.current
      scrambleHistoryRef.current = [currentValue, next]
      goToScramble(1)
      dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: true })
      if (!hasPendingScrambleKind("prefetch", eventRef.current)) {
        requestScramble("prefetch", eventRef.current, 1)
      }
      return
    }

    const currentValue = history[idx] ?? scrambleRef.current
    scrambleHistoryRef.current = [currentValue, "Preparing scramble..."]
    goToScramble(1)
    dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
    if (!hasPendingScrambleKind("current", eventRef.current)) {
      requestScramble("current", eventRef.current, 1)
    }
  }

  function prevScramble() {
    if (scrambleIdxRef.current > 0) {
      goToScramble(scrambleIdxRef.current - 1)
    }
  }

  btCallbacksRef.current = {
    onHandsOn: () => {
      dispatchEngine({ type: "BT_HANDS_ON" })
    },
    onGetSet: () => {
      if (phaseRef.current !== "inspecting") {
        inspRef.current?.cancelInspection()
      }
      dispatchEngine({ type: "BT_GET_SET" })
    },
    onHandsOff: () => {
      if (phaseRef.current !== "inspecting") {
        inspRef.current?.cancelInspection()
      }
      dispatchEngine({ type: "BT_HANDS_OFF" })
    },
    onRunning: () => {
      inspRef.current?.cancelInspection()
      if (phaseRef.current !== "running") {
        startRef.current = performance.now()
      }
      dispatchEngine({ type: "BT_RUNNING" })
    },
    onStopped: (time_ms: number) => {
      dispatchEngine({ type: "BT_STOPPED" })
      addSolve(time_ms, null)
    },
    onIdle: () => {
      inspRef.current?.cancelInspection()
      const shouldStartInspection =
        inspOnRef.current &&
        phaseRef.current !== "stopped" &&
        phaseRef.current !== "running"
      if (shouldStartInspection) {
        dispatchEngine({ type: "START_INSPECTION" })
        inspRef.current?.startInspection()
      } else {
        dispatchEngine({ type: "BT_IDLE" })
      }
    },
    onDisconnect: () => {
      inspRef.current?.cancelInspection()
      dispatchEngine({ type: "BT_DISCONNECT" })
    },
  }

  const selectedSolve = useMemo(
    () => solves.find((solve) => solve.id === selectedId) ?? null,
    [selectedId, solves]
  )

  const inInspHold =
    (phase === "holding" || phase === "ready") && inspHoldRef.current
  const timingActive =
    phase === "running" ||
    phase === "holding" ||
    phase === "ready" ||
    phase === "inspecting"

  const timeColor =
    phase === "holding"
      ? "text-red-400"
      : phase === "ready"
      ? "text-green-400"
      : phase === "inspecting" && engineSnapshot.btArmed
      ? "text-green-400"
      : phase === "inspecting" && engineSnapshot.btHandsOnMat
      ? "text-red-400"
      : phase === "inspecting" && insp.secondsLeft <= 3
      ? "text-red-400"
      : phase === "inspecting" && insp.secondsLeft <= 7
      ? "text-yellow-400"
      : "text-foreground"

  const parsedTypeTime = useMemo(() => parseTime(typeVal), [typeVal])
  const last = solves[solves.length - 1]
  const scrambleNavBtn =
    "text-[11px] font-sans tracking-wide px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
  const sp = (eventPointer: React.PointerEvent) => eventPointer.stopPropagation()

  const handleRangeChange = useCallback(
    (next: { start: number; end: number; scrollOffset: number }) => {
      if (phaseRef.current === "running" || engineRef.current.getSnapshot().suppressOptionalUi) {
        return
      }
      setSolveRange((previous) => {
        if (
          previous.start === next.start &&
          previous.end === next.end &&
          previous.scrollOffset === next.scrollOffset
        ) {
          return previous
        }
        return next
      })
    },
    []
  )

  return (
    <div className="flex flex-col min-h-screen bg-background select-none">
      {storageWarning && (
        <div className="bg-yellow-900/60 border-b border-yellow-700/50 px-4 py-2 text-center text-xs text-yellow-200">
          {storageWarning}
        </div>
      )}
      <div
        className="relative flex items-center px-4 py-3 gap-3 border-b border-border"
        onPointerDown={sp}
      >
        <select
          className="bg-muted text-[13px] font-sans rounded px-2 py-1.5 border border-border text-foreground shrink-0"
          value={event}
          onChange={(eventSelect) => changeEvent(eventSelect.target.value)}
        >
          {EVENTS.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>

        <PracticeModeSelector
          eventId={event}
          selectedType={practiceType}
          onTypeChange={changePracticeType}
        />

        <div className="flex-1 min-w-0 flex items-center justify-center">
          <button
            className="text-center text-lg sm:text-xl font-mono font-normal text-foreground leading-snug hover:text-primary transition-colors cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(scramble).then(() => {
                setScrambleCopied(true)
                setTimeout(() => setScrambleCopied(false), 1500)
              })
            }}
            title="Click to copy scramble"
          >
            {scramble}
          </button>
        </div>

        <span
          className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs font-mono transition-all duration-200 z-20 pointer-events-none",
            scrambleCopied
              ? "opacity-100 translate-y-0 text-green-400"
              : "opacity-0 -translate-y-1 text-green-400"
          )}
        >
          {scrambleError ?? "Scramble copied!"}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button
            className={scrambleNavBtn}
            onClick={prevScramble}
            disabled={!scrambleCanGoPrev || timingActive}
            title="Go back to previous scramble"
          >
            ← Prev
          </button>
          <button
            className={scrambleNavBtn}
            onClick={nextScramble}
            disabled={timingActive}
            title="Skip to next scramble"
          >
            Next →
          </button>
          <div className="relative" ref={settingsRef}>
            <button
              className="p-1.5 rounded border border-border text-muted-foreground/70 hover:text-foreground transition-colors"
              onClick={() => setSettingsOpen((value) => !value)}
              title="Timer settings"
            >
              <Settings size={14} />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-popover border border-border rounded-lg shadow-xl z-50 p-1 text-sm">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors"
                  onClick={() =>
                    setTyping((value) => {
                      const next = !value
                      try {
                        localStorage.setItem("timer-typing", String(next))
                      } catch {}
                      return next
                    })
                  }
                >
                  <span className="text-foreground">⌨ Typing Mode</span>
                  <span
                    className={cn(
                      "font-mono text-[12px]",
                      typing ? "text-primary font-medium" : "text-muted-foreground"
                    )}
                  >
                    {typing ? "On" : "Off"}
                  </span>
                </button>
                <button
                  className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() =>
                    setInspOn((value) => {
                      const next = !value
                      try {
                        localStorage.setItem("timer-insp-on", String(next))
                      } catch {}
                      return next
                    })
                  }
                  disabled={typing}
                >
                  <span className="text-foreground">⏱ Inspection</span>
                  <span
                    className={cn(
                      "font-mono text-[12px]",
                      inspOn && !typing
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {inspOn ? "On" : "Off"}
                  </span>
                </button>
                {isBleSupported() && (
                  <>
                    <div className="my-1 border-t border-border" />
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={btStatus === "connected" ? btDisconnect : btConnect}
                      disabled={btStatus === "connecting"}
                      onPointerDown={sp}
                      title={
                        btStatus === "connected"
                          ? "Disconnect GAN Smart Timer"
                          : "Connect GAN Smart Timer via Bluetooth"
                      }
                    >
                      <span className="text-foreground">GAN Smart Timer</span>
                      <span
                        className={cn(
                          "font-mono text-[12px]",
                          btStatus === "connected"
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {btStatus === "connecting"
                          ? "Connecting…"
                          : btStatus === "connected"
                          ? "Connected"
                          : "Disconnected"}
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        <SolveListPanel
          rows={solveRows}
          totalCount={solves.length}
          rangeStart={solveRange.start}
          rangeEnd={solveRange.end}
          scrollOffset={solveRange.scrollOffset}
          frozen={phase === "running" || engineSnapshot.suppressOptionalUi}
          stats={stats}
          statCols={statCols}
          selectedId={selectedId}
          selectedSolve={selectedSolve}
          savedSolveCount={savedSolveCount}
          groupBoundaries={groupBoundaries}
          currentSolveCount={currentSolveCount}
          onSetSelectedId={setSelectedId}
          onSetPenalty={setPenalty}
          onDeleteSolve={deleteSolve}
          onUpdateStatCol={updateStatCol}
          onRangeChange={handleRangeChange}
        />

        <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          {typing ? (
            <>
              <div
                className="flex items-center justify-center w-full max-w-sm pointer-events-auto"
                onPointerDown={sp}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000"
                  value={typeVal}
                  autoFocus
                  onChange={(eventInput) => setTypeVal(eventInput.target.value)}
                  onKeyDown={(eventInput) => {
                    if (eventInput.key !== "Enter") return
                    if (!parsedTypeTime) return
                    addSolve(parsedTypeTime, null)
                    setTypeVal("")
                  }}
                  className="bg-transparent border-b-2 border-border text-center font-mono text-8xl font-light w-full outline-none placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="mt-2 text-sm font-mono text-muted-foreground h-5">
                {typeVal
                  ? parsedTypeTime !== null
                    ? `= ${fmt(parsedTypeTime)}`
                    : "invalid"
                  : ""}
              </p>
            </>
          ) : (
            <TimerReadout
              className={cn(
                "font-mono text-8xl font-light transition-colors duration-75 cursor-default",
                timeColor
              )}
              phase={phase}
              startMs={startRef.current}
              last={last}
              inInspHold={inInspHold}
              inspSecondsLeft={insp.secondsLeft}
              btReset={engineSnapshot.btReset}
              onStall={(deltaMs) => {
                emitTimerTelemetry("timer_stall_detected", { deltaMs })
                if (TIMER_V2_ENGINE_ENABLED) {
                  dispatchEngine({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: true })
                }
              }}
            />
          )}

          {phase === "stopped" && last && (
            <div className="flex gap-3 py-3 pointer-events-auto" onPointerDown={sp}>
              <button
                className={cn(
                  "text-[13px] font-sans font-medium px-3 py-1.5 rounded border transition-colors",
                  last.penalty === "+2"
                    ? "bg-yellow-500 text-black border-yellow-500"
                    : "border-border text-muted-foreground hover:border-yellow-500 hover:text-yellow-400"
                )}
                onClick={() => setPenalty(last.id, last.penalty === "+2" ? null : "+2")}
              >
                +2
              </button>
              <button
                className={cn(
                  "text-[13px] font-sans font-medium px-3 py-1.5 rounded border transition-colors",
                  last.penalty === "DNF"
                    ? "bg-red-500 text-white border-red-500"
                    : "border-border text-muted-foreground hover:border-red-500 hover:text-red-400"
                )}
                onClick={() =>
                  setPenalty(last.id, last.penalty === "DNF" ? null : "DNF")
                }
              >
                DNF
              </button>
              <button
                className="text-[13px] font-sans px-3 py-1.5 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                onClick={() => {
                  deleteSolve(last.id)
                  setIdle()
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 order-first lg:order-last min-h-[60vh] lg:min-h-0" />
      </div>

      <div
        className="fixed bottom-4 right-4 z-40 w-48 rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg overflow-hidden"
        onPointerDown={sp}
      >
        {sessionStartTime ? (
          <>
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  sessionPaused ? "bg-yellow-400" : "bg-green-500 animate-pulse"
                )}
              />
              <span className="font-mono text-sm font-medium">
                {fmtSession(sessionElapsed)}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {currentSolveCount} solve{currentSolveCount !== 1 ? "s" : ""}
              </span>
            </div>
            {sessionPaused && (
              <div className="px-3 pb-1">
                <span className="text-[10px] text-yellow-400">Paused — solving disabled</span>
              </div>
            )}
            <div className="flex border-t border-border/50">
              <button
                className="flex-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                onClick={sessionPaused ? resumeSession : pauseSession}
                disabled={timingActive}
              >
                {sessionPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <div className="w-px bg-border/50" />
              <button
                className="flex-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                onClick={endSession}
                disabled={timingActive}
              >
                {currentSolveCount === 0 ? "Cancel" : "End"}
              </button>
            </div>
          </>
        ) : (
          <button
            className="w-full px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors text-left"
            onClick={startSession}
          >
            {sessionSaved ? (
              <span className="text-green-400">Session saved!</span>
            ) : (
              "Start Session"
            )}
          </button>
        )}
      </div>

      {practiceType === "Comp Sim" && (
        <CompSimOverlay
          event={event}
          eventName={EVENTS.find((e) => e.id === event)?.name ?? event}
          sessionStartMs={sessionStartTime}
          onExit={() => changePracticeType("Solves")}
        />
      )}

      {showEndModal && sessionStartTime && (
        <EndSessionModal
          solves={solves.filter((s) => !s.group)}
          event={event}
          eventName={EVENTS.find((entry) => entry.id === event)?.name ?? event}
          practiceType={practiceType}
          durationMinutes={
            (Date.now() - sessionStartTime - sessionPausedMsRef.current) / 1000 / 60
          }
          sessionStartMs={sessionStartTime}
          onClose={() => setShowEndModal(false)}
          onSaved={handleSessionSaved}
        />
      )}
    </div>
  )
}

function TimerReadout({
  className,
  phase,
  startMs,
  last,
  inInspHold,
  inspSecondsLeft,
  btReset,
  onStall,
}: {
  className: string
  phase: TimerPhase
  startMs: number
  last: Solve | undefined
  inInspHold: boolean
  inspSecondsLeft: number
  btReset: boolean
  onStall: (deltaMs: number) => void
}) {
  const displayRef = useRef<HTMLDivElement>(null)
  const lastFrameRef = useRef<number | null>(null)
  const lastStallRef = useRef(0)

  useEffect(() => {
    if (phase !== "running") {
      lastFrameRef.current = null
      return
    }
    let raf = 0
    const tick = (ts: number) => {
      if (lastFrameRef.current !== null) {
        const delta = ts - lastFrameRef.current
        if (delta > 250 && ts - lastStallRef.current > 1000) {
          lastStallRef.current = ts
          onStall(Math.round(delta * 100) / 100)
        }
      }
      lastFrameRef.current = ts
      if (displayRef.current) {
        displayRef.current.textContent = fmt(ts - startMs)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onStall, phase, startMs])

  const display = useMemo(() => {
    if (phase === "running") return "0.00"
    if (phase === "inspecting" || inInspHold) {
      return String(Math.max(0, 15 - inspSecondsLeft))
    }
    if (phase === "ready") return "0.00"
    if (phase === "idle" && btReset) return "0.00"
    if (!last) return "0.00"
    if (last.penalty === "DNF") return "DNF"
    return fmt(last.penalty === "+2" ? last.time_ms + 2000 : last.time_ms)
  }, [btReset, inInspHold, inspSecondsLeft, last, phase])

  return <div ref={displayRef} className={className}>{display}</div>
}
