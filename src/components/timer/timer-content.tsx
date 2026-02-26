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
} from "@/lib/actions/timer"
import type { Solve } from "@/lib/types"
import type { WcaEventId } from "@/lib/constants"

export function TimerContent() {
  const router = useRouter()

  // Session state
  const [event, setEvent] = useState<string>("333")
  const [mode, setMode] = useState<"normal" | "comp_sim">("normal")
  const [timerSessionId, setTimerSessionId] = useState<string | null>(null)
  const [solves, setSolves] = useState<Solve[]>([])

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

  // Generate initial scramble and check for active session
  useEffect(() => {
    loadScramble(event as WcaEventId)
    checkActiveSession(event)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkActiveSession = async (eventId: string) => {
    const result = await getActiveTimerSession(eventId)
    if (result.data) {
      setTimerSessionId(result.data.id)
      setSolves(result.data.solves)
      if (result.data.solves.length > 0) {
        const lastSolve = result.data.solves[result.data.solves.length - 1]
        setLastTime(
          lastSolve.penalty === "+2"
            ? lastSolve.time_ms + 2000
            : lastSolve.penalty === "DNF"
              ? null
              : lastSolve.time_ms
        )
      }
      setMode(result.data.mode)
    }
  }

  const ensureTimerSession = async (): Promise<string> => {
    if (timerSessionId) return timerSessionId

    const result = await createTimerSession(event, mode)
    if (result.error || !result.data) {
      throw new Error(result.error ?? "Failed to create timer session")
    }

    setTimerSessionId(result.data.id)
    return result.data.id
  }

  // Save a solve: optimistic update first, then persist to server
  // React Compiler auto-memoizes — no manual useCallback needed
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
    if (result.error) {
      checkActiveSession(event)
    }
  }

  const handleDeleteSolve = async (solveId: string) => {
    setSolves((prev) => prev.filter((s) => s.id !== solveId))

    const result = await deleteSolve(solveId)
    if (result.error) {
      checkActiveSession(event)
    }
  }

  const handleEventChange = (newEvent: string) => {
    if (newEvent === event) return

    if (solves.length > 0) {
      setShowSummary(true)
      return
    }

    setEvent(newEvent)
    setTimerSessionId(null)
    setSolves([])
    setLastTime(null)
    clearNextScramble()
    loadScramble(newEvent as WcaEventId)
    checkActiveSession(newEvent)
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
        onEventChange={handleEventChange}
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
        onEndSession={handleEndSession}
        saveError={saveError}
        onDismissError={() => setSaveError(null)}
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
    </div>
  )
}
