"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { TimerDisplay, DEFAULT_HOLD_DURATION } from "@/components/timer/timer-display"
import type { HoldDuration } from "@/components/timer/timer-display"
import { ScrambleDisplay } from "@/components/timer/scramble-display"
import { TimerTopBar } from "@/components/timer/timer-top-bar"
import { TimerSidebar } from "@/components/timer/timer-sidebar"
import { TimeInput } from "@/components/timer/time-input"
import { SessionManager } from "@/components/timer/session-manager"
import { SolveDetailModal } from "@/components/timer/solve-detail-modal"
import { StatDetailModal } from "@/components/timer/stat-detail-modal"
import type { StatDetailInfo } from "@/components/timer/stat-detail-modal"
import type { InputMode, SidebarPosition } from "@/components/timer/timer-settings"
import { DEFAULT_STAT_INDICATORS } from "@/components/timer/stats-panel"
import { InspectionOverlay } from "@/components/timer/inspection-overlay"
import { SessionSummaryModal } from "@/components/timer/session-summary-modal"
import { useTimerScramble } from "@/lib/timer/use-timer-scramble"
import { computeSessionStats } from "@/lib/timer/averages"
import { useInspection } from "@/lib/timer/inspection"
import {
  createTimerSession,
  addSolve,
  updateSolve,
  deleteSolve,
  deleteSolves,
  finalizeTimerSession,
  getActiveTimerSession,
  getSolvesBySession,
} from "@/lib/actions/timer"
import {
  getUserSolveSessions,
  getOrCreateDefaultSession,
  createSolveSession,
  updateSolveSession,
  resetSolveSession,
  archiveSolveSession,
  deleteSolveSession,
} from "@/lib/actions/solve-sessions"
import { PBCelebration } from "@/components/share/pb-celebration"
import { ShareModal } from "@/components/share/share-modal"
import type { ShareCardData } from "@/components/share/share-card"
import { getEffectiveTime, bestAoN } from "@/lib/timer/averages"
import {
  solvesToCSV,
  solvesToJSON,
  solvesToCsTimerTxt,
  statsToClipboard,
  downloadFile,
} from "@/lib/timer/export"
import { getCurrentPBs, logNewPB } from "@/lib/actions/personal-bests"
import { getProfile } from "@/lib/actions/profiles"
import { getTodayPacific } from "@/lib/utils"
import type { Solve, SolveSession, PBRecord } from "@/lib/types"
import type { WcaEventId } from "@/lib/constants"

type PBDetection = {
  event: string
  pbType: string
  newTimeMs: number
  previousTimeMs?: number
  scramble?: string
}

type UserInfo = {
  userName: string
  handle: string
  avatarUrl: string | null
}

const LAST_SESSION_KEY = "sch_last_solve_session_id"
const STAT_INDICATORS_KEY = "sch_stat_indicators"
const HOLD_DURATION_KEY = "sch_hold_duration"

export function TimerContent() {
  const router = useRouter()

  // Named solve session state
  const [solveSessions, setSolveSessions] = useState<SolveSession[]>([])
  const [currentSession, setCurrentSession] = useState<SolveSession | null>(null)
  const [showManager, setShowManager] = useState(false)

  // Timer session state (per-sitting, linked to solve session)
  const [mode, setMode] = useState<"normal" | "comp_sim">("normal")
  const [timerSessionId, setTimerSessionId] = useState<string | null>(null)
  const [solves, setSolves] = useState<Solve[]>([])

  // Derived event from current session
  const event = currentSession?.event ?? "333"

  // Scramble management
  const { currentScramble, isManualScramble, loadScramble, setManualScramble, clearNextScramble } =
    useTimerScramble()

  // Settings
  const [inspectionEnabled, setInspectionEnabled] = useState(false)
  const [showTimeWhileSolving, setShowTimeWhileSolving] = useState(true)
  const [inputMode, setInputMode] = useState<InputMode>("timer")
  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>("right")
  const [statIndicators, setStatIndicators] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STAT_INDICATORS_KEY) ?? DEFAULT_STAT_INDICATORS
    }
    return DEFAULT_STAT_INDICATORS
  })
  const [holdDuration, setHoldDuration] = useState<HoldDuration>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(HOLD_DURATION_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if ([0, 100, 200, 300, 500, 1000].includes(parsed)) {
          return parsed as HoldDuration
        }
      }
    }
    return DEFAULT_HOLD_DURATION
  })

  // UI state
  const [showSummary, setShowSummary] = useState(false)
  const [lastTime, setLastTime] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Solve detail modal
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null)

  // Stat detail modal
  const [statDetail, setStatDetail] = useState<StatDetailInfo | null>(null)

  // PB detection + share state
  const pbMapRef = useRef<Map<string, number>>(new Map())
  const userInfoRef = useRef<UserInfo | null>(null)
  const [celebration, setCelebration] = useState<PBDetection | null>(null)
  const [shareVariant, setShareVariant] = useState<ShareCardData | null>(null)

  // Undo state
  const [undoSolve, setUndoSolve] = useState<Solve | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inspection hook
  const inspection = useInspection()
  const inspectionPenaltyRef = useRef<"+2" | "DNF" | null>(null)

  // Compute stats from current solves
  const stats = computeSessionStats(solves)

  // Session duration
  const durationMinutes = solves.length > 0
    ? Math.max(
        1,
        Math.round(
          (new Date().getTime() -
            new Date(solves[0].solved_at).getTime()) /
            60000
        )
      )
    : 0

  // ---- Initialization ----

  useEffect(() => {
    initializeSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeSession = async () => {
    setIsLoading(true)

    // Load PBs and profile in parallel with sessions
    const [{ data: sessions }, pbResult, profileResult] = await Promise.all([
      getUserSolveSessions(),
      getCurrentPBs(),
      getProfile(),
    ])

    // Build PB map: "event|pbType" → time in ms
    if (pbResult.data) {
      const map = new Map<string, number>()
      for (const pb of pbResult.data) {
        map.set(`${pb.event}|${pb.pb_type}`, pb.time_seconds * 1000)
      }
      pbMapRef.current = map
    }

    // Store user info for share cards
    if (profileResult.profile) {
      const p = profileResult.profile
      userInfoRef.current = {
        userName: p.display_name,
        handle: p.handle,
        avatarUrl: p.avatar_url,
      }
    }
    setSolveSessions(sessions)

    const lastId = typeof window !== "undefined"
      ? localStorage.getItem(LAST_SESSION_KEY)
      : null

    let session: SolveSession | null = null

    if (lastId) {
      session = sessions.find((s) => s.id === lastId) ?? null
    }

    if (!session) {
      const result = await getOrCreateDefaultSession("333")
      if (result.data) {
        session = result.data
        if (!sessions.find((s) => s.id === session!.id)) {
          const { data: refreshed } = await getUserSolveSessions()
          setSolveSessions(refreshed)
        }
      }
    }

    if (session) {
      setCurrentSession(session)
      saveLastSessionId(session.id)
      loadScramble(session.event as WcaEventId)
      await loadSessionSolves(session)
    } else {
      loadScramble("333" as WcaEventId)
    }

    setIsLoading(false)
  }

  // ---- Session management helpers ----

  const saveLastSessionId = (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_SESSION_KEY, id)
    }
  }

  const loadSessionSolves = async (session: SolveSession) => {
    const activeResult = await getActiveTimerSession(session.event, session.id)
    if (activeResult.data) {
      setTimerSessionId(activeResult.data.id)
      setSolves(activeResult.data.solves)
      setMode(activeResult.data.mode)
      if (activeResult.data.solves.length > 0) {
        const last = activeResult.data.solves[activeResult.data.solves.length - 1]
        setLastTime(
          last.penalty === "+2"
            ? last.time_ms + 2000
            : last.penalty === "DNF"
              ? null
              : last.time_ms
        )
      }
      return
    }

    const { solves: sessionSolves } = await getSolvesBySession(
      session.id,
      session.active_from
    )
    setSolves(sessionSolves)
    setTimerSessionId(null)
    if (sessionSolves.length > 0) {
      const last = sessionSolves[sessionSolves.length - 1]
      setLastTime(
        last.penalty === "+2"
          ? last.time_ms + 2000
          : last.penalty === "DNF"
            ? null
            : last.time_ms
      )
    } else {
      setLastTime(null)
    }
  }

  const refreshSessions = async () => {
    const { data } = await getUserSolveSessions()
    setSolveSessions(data)
  }

  // ---- Session switching ----

  const handleSelectSession = async (session: SolveSession) => {
    if (session.id === currentSession?.id) return

    if (timerSessionId && solves.length > 0) {
      await finalizeTimerSession(timerSessionId)
    }

    setCurrentSession(session)
    saveLastSessionId(session.id)
    setSolves([])
    setLastTime(null)
    setTimerSessionId(null)
    clearNextScramble()
    loadScramble(session.event as WcaEventId)
    await loadSessionSolves(session)
  }

  const handleCreateSession = async (name: string, eventId: string, isTracked: boolean) => {
    const result = await createSolveSession(name, eventId, isTracked)
    if (result.data) {
      await refreshSessions()
      await handleSelectSession(result.data)
    }
  }

  // ---- Timer session management ----

  const ensureTimerSession = async (): Promise<string> => {
    if (timerSessionId) return timerSessionId

    const solveSessionId = currentSession?.id
    const result = await createTimerSession(event, mode, solveSessionId)
    if (result.error || !result.data) {
      throw new Error(result.error ?? "Failed to create timer session")
    }

    setTimerSessionId(result.data.id)
    return result.data.id
  }

  // ---- PB detection ----

  const checkForPB = (allSolves: Solve[], latestSolve: Solve) => {
    if (latestSolve.penalty === "DNF") return
    const effectiveMs = getEffectiveTime(latestSolve)
    const map = pbMapRef.current
    const singleKey = `${event}|Single`
    const curSingle = map.get(singleKey)
    if (curSingle === undefined || effectiveMs < curSingle) {
      firePBDetection("Single", effectiveMs, curSingle, latestSolve.scramble)
      return
    }
    if (allSolves.length >= 5) {
      const ao5 = bestAoN(allSolves, 5)
      if (ao5 !== null) {
        const prev = map.get(`${event}|Ao5`)
        if (prev === undefined || ao5 < prev) { firePBDetection("Ao5", ao5, prev, latestSolve.scramble); return }
      }
    }
    if (allSolves.length >= 12) {
      const ao12 = bestAoN(allSolves, 12)
      if (ao12 !== null) {
        const prev = map.get(`${event}|Ao12`)
        if (prev === undefined || ao12 < prev) { firePBDetection("Ao12", ao12, prev); return }
      }
    }
  }

  const firePBDetection = (pbType: string, newTimeMs: number, previousTimeMs?: number, scramble?: string) => {
    pbMapRef.current.set(`${event}|${pbType}`, newTimeMs)
    setCelebration({ event, pbType, newTimeMs, previousTimeMs, scramble })
    logNewPB({ event, pb_type: pbType, time_seconds: newTimeMs / 1000, date_achieved: getTodayPacific() })
  }

  // ---- Share handlers ----

  const handleShareSession = () => {
    const user = userInfoRef.current
    setShareVariant({
      variant: "session", event, practiceType: mode === "comp_sim" ? "Comp Sim" : "Normal",
      numSolves: stats.count, avgTime: stats.mean ? stats.mean / 1000 : null,
      bestTime: stats.best ? stats.best / 1000 : null, durationMinutes,
      sessionDate: new Date().toLocaleDateString(),
      userName: user?.userName ?? "Cuber", handle: user?.handle ?? "cuber", avatarUrl: user?.avatarUrl ?? null,
    })
  }

  const handleShareSolve = (solve: Solve) => {
    const user = userInfoRef.current
    setShareVariant({
      variant: "solve", event: solve.event,
      timeMs: solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms,
      penalty: solve.penalty, scramble: solve.scramble, solveNumber: solve.solve_number,
      solvedAt: solve.solved_at,
      userName: user?.userName ?? "Cuber", handle: user?.handle ?? "cuber", avatarUrl: user?.avatarUrl ?? null,
    })
  }

  const handleSharePB = () => {
    if (!celebration) return
    const user = userInfoRef.current
    setShareVariant({
      variant: "pb", event: celebration.event, pbType: celebration.pbType,
      timeSeconds: celebration.newTimeMs / 1000, dateAchieved: new Date().toLocaleDateString(),
      userName: user?.userName ?? "Cuber", handle: user?.handle ?? "cuber", avatarUrl: user?.avatarUrl ?? null,
      previousTimeSeconds: celebration.previousTimeMs ? celebration.previousTimeMs / 1000 : undefined,
    })
    setCelebration(null)
  }

  // ---- Solve handling ----

  const saveSolve = async (timeMs: number, penalty: "+2" | "DNF" | null) => {
    const solveNumber = solves.length + 1
    const compSimGroup =
      mode === "comp_sim" ? Math.floor((solveNumber - 1) / 5) + 1 : null
    const tempId = `temp-${Date.now()}`

    const optimisticSolve: Solve = {
      id: tempId,
      timer_session_id: timerSessionId ?? "",
      user_id: "",
      solve_number: solveNumber,
      time_ms: timeMs,
      penalty,
      scramble: currentScramble ?? "",
      event,
      comp_sim_group: compSimGroup,
      notes: null,
      solve_session_id: currentSession?.id ?? null,
      solved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    setSolves((prev) => [...prev, optimisticSolve])

    // Check for PBs optimistically (don't wait for server)
    const allSolvesNow = [...solves, optimisticSolve]
    checkForPB(allSolvesNow, optimisticSolve)

    try {
      setSaveError(null)
      const sessionId = await ensureTimerSession()
      const result = await addSolve(sessionId, {
        solve_number: solveNumber,
        time_ms: timeMs,
        penalty,
        scramble: currentScramble ?? "",
        event,
        comp_sim_group: compSimGroup,
        solve_session_id: currentSession?.id ?? null,
      })

      if (result.error) {
        setSolves((prev) => prev.filter((s) => s.id !== tempId))
        setSaveError(`Failed to save solve: ${result.error}`)
      } else if (result.data) {
        setSolves((prev) =>
          prev.map((s) => (s.id === tempId ? result.data! : s))
        )
      }
    } catch (err) {
      setSolves((prev) => prev.filter((s) => s.id !== tempId))
      const message = err instanceof Error ? err.message : "Unknown error"
      setSaveError(`Failed to save solve: ${message}`)
    }
  }

  const handleSolveComplete = async (timeMs: number) => {
    const inspPenalty = inspectionPenaltyRef.current
    inspectionPenaltyRef.current = null

    setLastTime(
      inspPenalty === "+2"
        ? timeMs + 2000
        : inspPenalty === "DNF"
          ? null
          : timeMs
    )

    saveSolve(timeMs, inspPenalty)
    loadScramble(event as WcaEventId)
  }

  const handleTypedTime = async (timeMs: number) => {
    setLastTime(timeMs)
    saveSolve(timeMs, null)
    loadScramble(event as WcaEventId)
  }

  const handlePenaltyChange = async (
    solveId: string,
    penalty: "+2" | "DNF" | null
  ) => {
    setSolves((prev) =>
      prev.map((s) => (s.id === solveId ? { ...s, penalty } : s))
    )
    setSelectedSolve((prev) =>
      prev && prev.id === solveId ? { ...prev, penalty } : prev
    )

    const result = await updateSolve(solveId, { penalty })
    if (result.error && currentSession) {
      await loadSessionSolves(currentSession)
    }
  }

  const handleDeleteSolve = async (solveId: string) => {
    setSolves((prev) => prev.filter((s) => s.id !== solveId))

    const result = await deleteSolve(solveId)
    if (result.error && currentSession) {
      await loadSessionSolves(currentSession)
    }
  }

  const handleBatchDelete = async (solveIds: string[]) => {
    if (solveIds.length === 0) return
    const idSet = new Set(solveIds)
    setSolves((prev) => prev.filter((s) => !idSet.has(s.id)))

    const result = await deleteSolves(solveIds)
    if (result.error && currentSession) {
      await loadSessionSolves(currentSession)
    }
  }

  const handleNotesChange = async (solveId: string, notes: string) => {
    setSolves((prev) =>
      prev.map((s) => (s.id === solveId ? { ...s, notes: notes || null } : s))
    )
    setSelectedSolve((prev) =>
      prev && prev.id === solveId ? { ...prev, notes: notes || null } : prev
    )
    await updateSolve(solveId, { notes: notes || null })
  }

  // ---- Undo last solve (Ctrl+Z) ----

  const handleUndoLastSolve = useCallback(async () => {
    if (solves.length === 0) return

    const lastSolve = solves[solves.length - 1]
    setSolves((prev) => prev.slice(0, -1))
    setUndoSolve(lastSolve)

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      setUndoSolve(null)
    }, 5000)

    await deleteSolve(lastSolve.id)
  }, [solves])

  const handleRestoreUndo = useCallback(async () => {
    if (!undoSolve) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)

    const sessionId = await ensureTimerSession()
    const result = await addSolve(sessionId, {
      solve_number: undoSolve.solve_number,
      time_ms: undoSolve.time_ms,
      penalty: undoSolve.penalty,
      scramble: undoSolve.scramble,
      event: undoSolve.event,
      comp_sim_group: undoSolve.comp_sim_group,
      solve_session_id: undoSolve.solve_session_id,
    })

    if (result.data) {
      setSolves((prev) => [...prev, result.data!])
    }
    setUndoSolve(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoSolve])

  // ---- Keyboard shortcuts ----

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (showSummary || showManager || selectedSolve || statDetail) return

      // Ctrl+Z = Undo last solve
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault()
        handleUndoLastSolve()
        return
      }

      // Ctrl+1 = OK, Ctrl+2 = +2, Ctrl+3 = DNF (last solve)
      if ((e.ctrlKey || e.metaKey) && solves.length > 0) {
        const lastSolve = solves[solves.length - 1]
        if (e.code === "Digit1") {
          e.preventDefault()
          handlePenaltyChange(lastSolve.id, null)
          return
        }
        if (e.code === "Digit2") {
          e.preventDefault()
          handlePenaltyChange(lastSolve.id, "+2")
          return
        }
        if (e.code === "Digit3") {
          e.preventDefault()
          handlePenaltyChange(lastSolve.id, "DNF")
          return
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showSummary, showManager, selectedSolve, statDetail, solves, handleUndoLastSolve])

  const handleModeChange = (newMode: "normal" | "comp_sim") => {
    if (newMode === mode) return

    if (solves.length > 0) {
      setShowSummary(true)
      return
    }

    setMode(newMode)
    setTimerSessionId(null)
  }

  const handleStatIndicatorsChange = (indicators: string) => {
    setStatIndicators(indicators)
    if (typeof window !== "undefined") {
      localStorage.setItem(STAT_INDICATORS_KEY, indicators)
    }
  }

  const handleHoldDurationChange = (duration: HoldDuration) => {
    setHoldDuration(duration)
    if (typeof window !== "undefined") {
      localStorage.setItem(HOLD_DURATION_KEY, String(duration))
    }
  }

  const handleEndSession = () => {
    if (solves.length === 0) return
    setShowSummary(true)
  }

  const handleSaveAndClose = async () => {
    if (timerSessionId) {
      const result = await finalizeTimerSession(timerSessionId)
      if (result.error) {
        setSaveError(`Failed to save session: ${result.error}`)
        setShowSummary(false)
        return
      }
    }

    setTimerSessionId(null)
    setSolves([])
    setLastTime(null)
    setShowSummary(false)
    setSaveError(null)
    router.refresh()
  }

  const handleKeepGoing = () => {
    setShowSummary(false)
  }

  // ---- Session manager callbacks ----

  const handleManagerRename = async (id: string, name: string) => {
    await updateSolveSession(id, { name })
    await refreshSessions()
    if (currentSession?.id === id) {
      setCurrentSession((prev) => prev ? { ...prev, name } : prev)
    }
  }

  const handleManagerToggleTracked = async (id: string, isTracked: boolean) => {
    await updateSolveSession(id, { is_tracked: isTracked })
    await refreshSessions()
    if (currentSession?.id === id) {
      setCurrentSession((prev) => prev ? { ...prev, is_tracked: isTracked } : prev)
    }
  }

  const handleManagerReset = async (id: string) => {
    if (currentSession?.id === id && timerSessionId) {
      await finalizeTimerSession(timerSessionId)
      setTimerSessionId(null)
    }

    await resetSolveSession(id)
    await refreshSessions()

    if (currentSession?.id === id) {
      const { data: sessions } = await getUserSolveSessions()
      const updated = sessions.find((s) => s.id === id)
      if (updated) {
        setCurrentSession(updated)
        setSolves([])
        setLastTime(null)
      }
    }
  }

  const handleManagerArchive = async (id: string) => {
    await archiveSolveSession(id)
    await refreshSessions()
    if (currentSession?.id === id) {
      const result = await getOrCreateDefaultSession("333")
      if (result.data) {
        await refreshSessions()
        await handleSelectSession(result.data)
      }
    }
  }

  const handleManagerDelete = async (id: string) => {
    await deleteSolveSession(id)
    await refreshSessions()
    if (currentSession?.id === id) {
      const result = await getOrCreateDefaultSession("333")
      if (result.data) {
        await refreshSessions()
        await handleSelectSession(result.data)
      }
    }
  }

  // ---- Inspection ----

  useEffect(() => {
    if (inspection.state === "done" && inspectionEnabled) {
      saveSolve(0, "DNF")
      loadScramble(event as WcaEventId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.state])

  const handleStartInspection = () => {
    inspection.startInspection()
  }

  const handleStartFromInspection = () => {
    if (!inspection.isInspecting) return
    const penalty = inspection.finishInspection()
    inspectionPenaltyRef.current = penalty
  }

  // ---- Export ----

  const handleExport = async (format: "csv" | "json" | "txt" | "clipboard") => {
    if (solves.length === 0) return
    const sessionName = currentSession?.name ?? event
    const timestamp = new Date().toISOString().slice(0, 10)

    switch (format) {
      case "csv": {
        const csv = solvesToCSV(solves, event)
        downloadFile(csv, `${sessionName}_${timestamp}.csv`, "text/csv")
        break
      }
      case "json": {
        const json = solvesToJSON(solves, event)
        downloadFile(json, `${sessionName}_${timestamp}.json`, "application/json")
        break
      }
      case "txt": {
        const txt = solvesToCsTimerTxt(solves, event)
        downloadFile(txt, `${sessionName}_${timestamp}.txt`, "text/plain")
        break
      }
      case "clipboard": {
        const text = statsToClipboard(solves, event)
        await navigator.clipboard.writeText(text)
        break
      }
    }
  }

  // ---- Render ----

  const handleSolveClick = (solve: Solve) => {
    setSelectedSolve(solve)
  }

  const handleStatClick = (statLabel: string, column: "current" | "best") => {
    setStatDetail({ label: statLabel, column })
  }

  const sidebarPanel = sidebarPosition !== "hidden" && (
    <TimerSidebar
      sidebarPosition={sidebarPosition}
      stats={stats}
      mode={mode}
      solves={solves}
      event={event}
      statIndicators={statIndicators}
      onPenaltyChange={handlePenaltyChange}
      onDelete={handleDeleteSolve}
      onSolveClick={handleSolveClick}
      onShareSolve={handleShareSolve}
      onBatchDelete={handleBatchDelete}
      onStatClick={handleStatClick}
    />
  )

  const layoutClass =
    sidebarPosition === "hidden" || sidebarPosition === "bottom"
      ? "flex-1 flex flex-col min-h-0 overflow-hidden"
      : sidebarPosition === "left"
        ? "flex-1 flex flex-col md:grid md:grid-cols-[320px_1fr] min-h-0 overflow-hidden"
        : "flex-1 flex flex-col md:grid md:grid-cols-[1fr_320px] min-h-0 overflow-hidden"

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading timer...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <TimerTopBar
        sessions={solveSessions}
        currentSession={currentSession}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onManageSessions={() => setShowManager(true)}
        mode={mode}
        onModeChange={handleModeChange}
        inputMode={inputMode}
        onInputModeChange={setInputMode}
        inspectionEnabled={inspectionEnabled}
        onInspectionChange={setInspectionEnabled}
        showTimeWhileSolving={showTimeWhileSolving}
        onShowTimeChange={setShowTimeWhileSolving}
        holdDuration={holdDuration}
        onHoldDurationChange={handleHoldDurationChange}
        sidebarPosition={sidebarPosition}
        onSidebarPositionChange={setSidebarPosition}
        statIndicators={statIndicators}
        onStatIndicatorsChange={handleStatIndicatorsChange}
        solveCount={solves.length}
        onEndPractice={handleEndSession}
        onExport={handleExport}
        saveError={saveError}
        onDismissError={() => setSaveError(null)}
      />

      <div className={layoutClass}>
        {sidebarPosition === "left" && sidebarPanel}
        <div className="flex flex-col flex-1 min-h-0">
          <ScrambleDisplay
            scramble={currentScramble}
            event={event}
            isManualScramble={isManualScramble}
            onManualScramble={setManualScramble}
            onClearManualScramble={() => loadScramble(event as WcaEventId)}
          />
          {inputMode === "typing" ? (
            <TimeInput
              onSubmit={handleTypedTime}
              disabled={showSummary}
            />
          ) : (
            <TimerDisplay
              onSolveComplete={handleSolveComplete}
              lastTime={lastTime}
              showTimeWhileSolving={showTimeWhileSolving}
              holdDuration={holdDuration}
              disabled={showSummary || inspection.isInspecting}
              inspectionActive={inspectionEnabled && !inspection.isInspecting}
              onStartInspection={handleStartInspection}
            />
          )}
        </div>
        {sidebarPosition === "right" && sidebarPanel}
        {sidebarPosition === "bottom" && sidebarPanel}
      </div>

      {undoSolve && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm">Solve deleted</span>
          <button
            onClick={handleRestoreUndo}
            className="text-sm font-medium text-primary hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      <InspectionOverlay
        secondsLeft={inspection.secondsLeft}
        state={inspection.state}
        onStart={handleStartFromInspection}
      />

      <SessionSummaryModal
        isOpen={showSummary}
        stats={stats}
        event={event}
        mode={mode}
        durationMinutes={durationMinutes}
        onSaveAndClose={handleSaveAndClose}
        onKeepGoing={handleKeepGoing}
        onShare={handleShareSession}
      />

      <SessionManager
        isOpen={showManager}
        onClose={() => setShowManager(false)}
        sessions={solveSessions}
        currentSessionId={currentSession?.id ?? null}
        onSelect={handleSelectSession}
        onRename={handleManagerRename}
        onToggleTracked={handleManagerToggleTracked}
        onReset={handleManagerReset}
        onArchive={handleManagerArchive}
        onDelete={handleManagerDelete}
        onCreate={handleCreateSession}
      />

      <SolveDetailModal
        solve={selectedSolve}
        isOpen={selectedSolve !== null}
        onClose={() => setSelectedSolve(null)}
        onPenaltyChange={handlePenaltyChange}
        onDelete={handleDeleteSolve}
        onNotesChange={handleNotesChange}
      />

      <StatDetailModal
        isOpen={statDetail !== null}
        onClose={() => setStatDetail(null)}
        info={statDetail}
        solves={solves}
        onSolveClick={handleSolveClick}
      />

      {celebration && (
        <PBCelebration
          isOpen
          onClose={() => setCelebration(null)}
          event={celebration.event}
          pbType={celebration.pbType}
          newTimeMs={celebration.newTimeMs}
          previousTimeMs={celebration.previousTimeMs}
          scramble={celebration.scramble}
          userName={userInfoRef.current?.userName ?? "Cuber"}
          handle={userInfoRef.current?.handle ?? "cuber"}
          avatarUrl={userInfoRef.current?.avatarUrl ?? null}
        />
      )}

      {shareVariant && (
        <ShareModal
          isOpen
          onClose={() => setShareVariant(null)}
          data={shareVariant}
        />
      )}
    </div>
  )
}
