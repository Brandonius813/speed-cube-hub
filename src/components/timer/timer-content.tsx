"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { TimerDisplay } from "@/components/timer/timer-display"
import { ScrambleDisplay } from "@/components/timer/scramble-display"
import { TimerTopBar } from "@/components/timer/timer-top-bar"
import { TimerSidebar } from "@/components/timer/timer-sidebar"
import { TimeInput } from "@/components/timer/time-input"
import type { InputMode, SidebarPosition } from "@/components/timer/timer-settings"
import { InspectionOverlay } from "@/components/timer/inspection-overlay"
import { SessionSummaryModal } from "@/components/timer/session-summary-modal"
import { SessionSelector } from "@/components/timer/session-selector"
import { SessionManager } from "@/components/timer/session-manager"
import { useTimerScramble } from "@/lib/timer/use-timer-scramble"
import { computeSessionStats } from "@/lib/timer/averages"
import { useInspection } from "@/lib/timer/inspection"
import {
  createTimerSession,
  addSolve,
  updateSolve,
  deleteSolve,
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
import type { Solve, SolveSession } from "@/lib/types"
import type { WcaEventId } from "@/lib/constants"

const LAST_SESSION_KEY = "speedcubehub_last_session_id"

export function TimerContent() {
  const router = useRouter()

  // Named session state
  const [solveSessions, setSolveSessions] = useState<SolveSession[]>([])
  const [currentSession, setCurrentSession] = useState<SolveSession | null>(null)
  const [showManager, setShowManager] = useState(false)

  // Timer session state (the active "sitting" within a solve session)
  const [mode, setMode] = useState<"normal" | "comp_sim">("normal")
  const [timerSessionId, setTimerSessionId] = useState<string | null>(null)
  const [solves, setSolves] = useState<Solve[]>([])

  // Derive event from current session
  const event = currentSession?.event ?? "333"

  // Scramble management (extracted hook)
  const { currentScramble, loadScramble, clearNextScramble } =
    useTimerScramble()

  // Settings
  const [inspectionEnabled, setInspectionEnabled] = useState(false)
  const [showTimeWhileSolving, setShowTimeWhileSolving] = useState(true)
  const [inputMode, setInputMode] = useState<InputMode>("timer")
  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>("right")

  // UI state
  const [showSummary, setShowSummary] = useState(false)
  const [lastTime, setLastTime] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Inspection hook
  const inspection = useInspection()
  const inspectionPenaltyRef = useRef<"+2" | "DNF" | null>(null)

  // Compute stats from current solves (React Compiler auto-memoizes this)
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

  // Initialize: load sessions and select the last-used one
  useEffect(() => {
    initializeSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeSessions = async () => {
    setIsLoading(true)

    // Load all user sessions
    const { data: sessions } = await getUserSolveSessions()
    setSolveSessions(sessions)

    // Try to restore last-used session from localStorage
    const lastId = localStorage.getItem(LAST_SESSION_KEY)
    let selected = lastId ? sessions.find((s) => s.id === lastId) : null

    if (!selected) {
      // No saved session or it was archived/deleted — get or create default
      const { data: defaultSession } = await getOrCreateDefaultSession("333")
      if (defaultSession) {
        selected = defaultSession
        // Refresh session list if we just created one
        if (!sessions.find((s) => s.id === defaultSession.id)) {
          const { data: refreshed } = await getUserSolveSessions()
          setSolveSessions(refreshed)
        }
      }
    }

    if (selected) {
      await switchToSession(selected)
    }

    setIsLoading(false)
  }

  /** Switch to a different solve session — loads its solves and active timer session */
  const switchToSession = async (session: SolveSession) => {
    // Save to localStorage
    localStorage.setItem(LAST_SESSION_KEY, session.id)
    setCurrentSession(session)
    setTimerSessionId(null)
    setSolves([])
    setLastTime(null)
    clearNextScramble()
    loadScramble(session.event as WcaEventId)

    // Check for an active timer session linked to this solve session
    const activeResult = await getActiveTimerSession(session.event, session.id)
    if (activeResult.data) {
      setTimerSessionId(activeResult.data.id)
      setSolves(activeResult.data.solves)
      setMode(activeResult.data.mode)
      if (activeResult.data.solves.length > 0) {
        const lastSolve = activeResult.data.solves[activeResult.data.solves.length - 1]
        setLastTime(
          lastSolve.penalty === "+2"
            ? lastSolve.time_ms + 2000
            : lastSolve.penalty === "DNF"
              ? null
              : lastSolve.time_ms
        )
      }
    } else {
      // No active timer session — load persisted solves for this session (after active_from)
      const { solves: sessionSolves } = await getSolvesBySession(
        session.id,
        session.active_from
      )
      setSolves(sessionSolves)
      if (sessionSolves.length > 0) {
        const lastSolve = sessionSolves[sessionSolves.length - 1]
        setLastTime(
          lastSolve.penalty === "+2"
            ? lastSolve.time_ms + 2000
            : lastSolve.penalty === "DNF"
              ? null
              : lastSolve.time_ms
        )
      }
    }
  }

  const ensureTimerSession = async (): Promise<string> => {
    if (timerSessionId) return timerSessionId

    const result = await createTimerSession(event, mode, currentSession?.id)
    if (result.error || !result.data) {
      throw new Error(result.error ?? "Failed to create timer session")
    }

    setTimerSessionId(result.data.id)
    return result.data.id
  }

  // Save a solve: optimistic update first, then persist to server
  const saveSolve = async (timeMs: number, penalty: "+2" | "DNF" | null) => {
    const solveNumber = solves.length + 1
    const compSimGroup =
      mode === "comp_sim" ? Math.floor((solveNumber - 1) / 5) + 1 : null
    const tempId = `temp-${Date.now()}`

    // Optimistic update — show solve instantly
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

    // Persist to server in background
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

    const result = await updateSolve(solveId, { penalty })
    if (result.error && currentSession) {
      switchToSession(currentSession)
    }
  }

  const handleDeleteSolve = async (solveId: string) => {
    setSolves((prev) => prev.filter((s) => s.id !== solveId))

    const result = await deleteSolve(solveId)
    if (result.error && currentSession) {
      switchToSession(currentSession)
    }
  }

  const handleModeChange = (newMode: "normal" | "comp_sim") => {
    if (newMode === mode) return

    if (solves.length > 0) {
      setShowSummary(true)
      return
    }

    setMode(newMode)
    setTimerSessionId(null)
  }

  const handleEndPractice = () => {
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

  // --- Session management callbacks ---

  const handleSessionSelect = async (session: SolveSession) => {
    if (session.id === currentSession?.id) return

    // Finalize current timer session if it has solves
    if (timerSessionId && solves.length > 0) {
      await finalizeTimerSession(timerSessionId)
    }

    await switchToSession(session)
  }

  const handleSessionCreate = async (
    name: string,
    sessionEvent: string,
    isTracked: boolean
  ) => {
    const { data: newSession, error } = await createSolveSession(
      name,
      sessionEvent,
      isTracked
    )
    if (error || !newSession) {
      setSaveError(`Failed to create session: ${error}`)
      return
    }

    // Refresh session list and switch to the new one
    const { data: refreshed } = await getUserSolveSessions()
    setSolveSessions(refreshed)

    // Finalize current if needed
    if (timerSessionId && solves.length > 0) {
      await finalizeTimerSession(timerSessionId)
    }

    await switchToSession(newSession)
  }

  const handleSessionRename = async (id: string, name: string) => {
    await updateSolveSession(id, { name })
    setSolveSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    )
    if (currentSession?.id === id) {
      setCurrentSession((prev) => (prev ? { ...prev, name } : prev))
    }
  }

  const handleSessionToggleTracked = async (
    id: string,
    isTracked: boolean
  ) => {
    await updateSolveSession(id, { is_tracked: isTracked })
    setSolveSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_tracked: isTracked } : s))
    )
    if (currentSession?.id === id) {
      setCurrentSession((prev) =>
        prev ? { ...prev, is_tracked: isTracked } : prev
      )
    }
  }

  const handleSessionReset = async (id: string) => {
    await resetSolveSession(id)

    // Refresh session list to get updated active_from
    const { data: refreshed } = await getUserSolveSessions()
    setSolveSessions(refreshed)

    // If resetting current session, reload with empty solve list
    if (currentSession?.id === id) {
      const updated = refreshed.find((s) => s.id === id)
      if (updated) {
        setCurrentSession(updated)
        setTimerSessionId(null)
        setSolves([])
        setLastTime(null)
      }
    }
  }

  const handleSessionArchive = async (id: string) => {
    await archiveSolveSession(id)
    setSolveSessions((prev) => prev.filter((s) => s.id !== id))

    // If archiving current session, switch to another
    if (currentSession?.id === id) {
      const remaining = solveSessions.filter((s) => s.id !== id)
      if (remaining.length > 0) {
        await switchToSession(remaining[0])
      } else {
        // Create a new default
        const { data: newDefault } = await getOrCreateDefaultSession("333")
        if (newDefault) {
          const { data: refreshed } = await getUserSolveSessions()
          setSolveSessions(refreshed)
          await switchToSession(newDefault)
        }
      }
    }
  }

  const handleSessionDelete = async (id: string) => {
    await deleteSolveSession(id)
    setSolveSessions((prev) => prev.filter((s) => s.id !== id))

    // If deleting current session, switch to another
    if (currentSession?.id === id) {
      const remaining = solveSessions.filter((s) => s.id !== id)
      if (remaining.length > 0) {
        await switchToSession(remaining[0])
      } else {
        const { data: newDefault } = await getOrCreateDefaultSession("333")
        if (newDefault) {
          const { data: refreshed } = await getUserSolveSessions()
          setSolveSessions(refreshed)
          await switchToSession(newDefault)
        }
      }
    }
  }

  // Handle inspection auto-DNF: when inspection exceeds 17s, record a DNF solve
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading timer...</div>
      </div>
    )
  }

  // Sidebar panel (shared between all positions)
  const sidebarPanel = sidebarPosition !== "hidden" && (
    <TimerSidebar
      sidebarPosition={sidebarPosition}
      stats={stats}
      mode={mode}
      solves={solves}
      event={event}
      onPenaltyChange={handlePenaltyChange}
      onDelete={handleDeleteSolve}
    />
  )

  // Layout class based on sidebar position
  const layoutClass =
    sidebarPosition === "hidden" || sidebarPosition === "bottom"
      ? "flex-1 flex flex-col min-h-0 overflow-hidden"
      : sidebarPosition === "left"
        ? "flex-1 flex flex-col md:grid md:grid-cols-[320px_1fr] min-h-0 overflow-hidden"
        : "flex-1 flex flex-col md:grid md:grid-cols-[1fr_320px] min-h-0 overflow-hidden"

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <TimerTopBar
        event={event}
        onEventChange={() => {}} // Event changes handled by session selector now
        mode={mode}
        onModeChange={handleModeChange}
        inputMode={inputMode}
        onInputModeChange={setInputMode}
        inspectionEnabled={inspectionEnabled}
        onInspectionChange={setInspectionEnabled}
        showTimeWhileSolving={showTimeWhileSolving}
        onShowTimeChange={setShowTimeWhileSolving}
        sidebarPosition={sidebarPosition}
        onSidebarPositionChange={setSidebarPosition}
        solveCount={solves.length}
        onEndSession={handleEndPractice}
        saveError={saveError}
        onDismissError={() => setSaveError(null)}
        sessionSelector={
          <SessionSelector
            sessions={solveSessions}
            currentSessionId={currentSession?.id ?? null}
            onSelect={handleSessionSelect}
            onCreate={handleSessionCreate}
            onManage={() => setShowManager(true)}
          />
        }
      />

      {/* Main content — layout depends on sidebar position */}
      <div className={layoutClass}>
        {sidebarPosition === "left" && sidebarPanel}
        <div className="flex flex-col flex-1 min-h-0">
          <ScrambleDisplay scramble={currentScramble} />
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
              disabled={showSummary || inspection.isInspecting}
              inspectionActive={inspectionEnabled && !inspection.isInspecting}
              onStartInspection={handleStartInspection}
            />
          )}
        </div>
        {sidebarPosition === "right" && sidebarPanel}
        {sidebarPosition === "bottom" && sidebarPanel}
      </div>

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
      />

      <SessionManager
        isOpen={showManager}
        onClose={() => setShowManager(false)}
        sessions={solveSessions}
        currentSessionId={currentSession?.id ?? null}
        onSelect={handleSessionSelect}
        onRename={handleSessionRename}
        onToggleTracked={handleSessionToggleTracked}
        onReset={handleSessionReset}
        onArchive={handleSessionArchive}
        onDelete={handleSessionDelete}
        onCreate={handleSessionCreate}
      />
    </div>
  )
}
