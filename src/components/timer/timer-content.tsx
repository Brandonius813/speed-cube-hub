"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Square, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TimerDisplay } from "@/components/timer/timer-display"
import { ScrambleDisplay } from "@/components/timer/scramble-display"
import { SolveList } from "@/components/timer/solve-list"
import { StatsPanel } from "@/components/timer/stats-panel"
import { EventSelector, TimerSettings } from "@/components/timer/timer-settings"
import { TimeInput } from "@/components/timer/time-input"
import type { InputMode, SidebarPosition } from "@/components/timer/timer-settings"
import { InspectionOverlay } from "@/components/timer/inspection-overlay"
import { SessionSummaryModal } from "@/components/timer/session-summary-modal"
import { generateScramble, preGenerateScramble } from "@/lib/timer/scrambles"
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

  // Scramble state
  const [currentScramble, setCurrentScramble] = useState<string | null>(null)
  const [isLoadingScramble, setIsLoadingScramble] = useState(false)
  const nextScrambleRef = useRef<string | null>(null)

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

  // Compute stats from current solves
  const stats = computeSessionStats(solves)

  // Comp sim progress
  const currentCompSimGroup = mode === "comp_sim"
    ? Math.floor(solves.length / 5) + 1
    : undefined
  const currentCompSimProgress = mode === "comp_sim"
    ? { current: (solves.length % 5) + 1, total: 5 }
    : undefined

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

  const loadScramble = async (eventId: WcaEventId) => {
    setIsLoadingScramble(true)
    try {
      // Use pre-generated scramble if available
      if (nextScrambleRef.current) {
        setCurrentScramble(nextScrambleRef.current)
        nextScrambleRef.current = null
      } else {
        const scramble = await generateScramble(eventId)
        setCurrentScramble(scramble)
      }
    } catch (err) {
      console.error("Failed to generate scramble:", err)
      setCurrentScramble("Error generating scramble — try refreshing")
    } finally {
      setIsLoadingScramble(false)
    }

    // Pre-generate next scramble in background
    preGenerateScramble(eventId).then((s) => {
      nextScrambleRef.current = s
    }).catch(() => {
      // Pre-generation is optional — next scramble will generate on-demand
    })
  }

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
  const saveSolve = useCallback(
    async (timeMs: number, penalty: "+2" | "DNF" | null) => {
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
          // Remove optimistic solve on failure
          setSolves((prev) => prev.filter((s) => s.id !== tempId))
          setSaveError(`Failed to save solve: ${result.error}`)
        } else if (result.data) {
          // Replace temp solve with real one from server
          setSolves((prev) =>
            prev.map((s) => (s.id === tempId ? result.data! : s))
          )
        }
      } catch (err) {
        setSolves((prev) => prev.filter((s) => s.id !== tempId))
        const message = err instanceof Error ? err.message : "Unknown error"
        setSaveError(`Failed to save solve: ${message}`)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solves.length, event, mode, timerSessionId, currentScramble]
  )

  // Handle a completed solve
  const handleSolveComplete = useCallback(
    async (timeMs: number) => {
      const inspPenalty = inspectionPenaltyRef.current
      inspectionPenaltyRef.current = null
      const penalty = inspPenalty

      setLastTime(
        penalty === "+2"
          ? timeMs + 2000
          : penalty === "DNF"
            ? null
            : timeMs
      )

      saveSolve(timeMs, penalty)
      loadScramble(event as WcaEventId)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saveSolve, event]
  )

  // Handle a typed time submission
  const handleTypedTime = useCallback(
    async (timeMs: number) => {
      setLastTime(timeMs)
      saveSolve(timeMs, null)
      loadScramble(event as WcaEventId)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saveSolve, event]
  )

  const handlePenaltyChange = async (
    solveId: string,
    penalty: "+2" | "DNF" | null
  ) => {
    // Optimistic update
    setSolves((prev) =>
      prev.map((s) => (s.id === solveId ? { ...s, penalty } : s))
    )

    const result = await updateSolve(solveId, { penalty })
    if (result.error) {
      // Revert on error
      checkActiveSession(event)
    }
  }

  const handleDeleteSolve = async (solveId: string) => {
    // Optimistic update
    setSolves((prev) => prev.filter((s) => s.id !== solveId))

    const result = await deleteSolve(solveId)
    if (result.error) {
      checkActiveSession(event)
    }
  }

  const handleEventChange = (newEvent: string) => {
    if (newEvent === event) return

    // If there's an active session with solves, prompt to end it first
    if (solves.length > 0) {
      setShowSummary(true)
      return
    }

    setEvent(newEvent)
    setTimerSessionId(null)
    setSolves([])
    setLastTime(null)
    nextScrambleRef.current = null
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
      // Auto-DNF: inspection timed out, record a DNF solve with 0ms time
      saveSolve(0, "DNF")
      loadScramble(event as WcaEventId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.state])

  // Inspection handlers
  const handleStartInspection = () => {
    inspection.startInspection()
  }

  const handleStartFromInspection = () => {
    if (!inspection.isInspecting) return
    const penalty = inspection.finishInspection()
    inspectionPenaltyRef.current = penalty
    // The timer-display will handle starting the actual timer
    // We need to tell it inspection is done so it can start
  }

  // Sidebar panel (shared between all positions)
  const sidebarPanel = sidebarPosition !== "hidden" && (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        sidebarPosition === "bottom"
          ? "border-t border-border/50 max-h-[40vh]"
          : sidebarPosition === "left"
            ? "border-r border-border/50"
            : "border-l border-border/50"
      )}
    >
      <StatsPanel
        stats={stats}
        mode={mode}
        currentCompSimProgress={
          mode === "comp_sim" ? currentCompSimProgress : undefined
        }
        solves={solves}
        event={event}
      />
      <div className="flex-1 border-t border-border/50 overflow-y-auto min-h-0">
        <SolveList
          solves={solves}
          onPenaltyChange={handlePenaltyChange}
          onDelete={handleDeleteSolve}
          mode={mode}
        />
      </div>
    </div>
  )

  // Timer or typing input area
  const timerArea = (
    <div className="flex flex-col flex-1 min-h-0">
      <ScrambleDisplay
        scramble={currentScramble}
        isLoading={isLoadingScramble}
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
          disabled={showSummary || inspection.isInspecting}
          inspectionActive={inspectionEnabled && !inspection.isInspecting}
          onStartInspection={handleStartInspection}
        />
      )}
    </div>
  )

  // Build grid class based on sidebar position
  const getLayoutClass = () => {
    if (sidebarPosition === "hidden" || sidebarPosition === "bottom") {
      return "flex-1 flex flex-col min-h-0 overflow-hidden"
    }
    if (sidebarPosition === "left") {
      return "flex-1 flex flex-col md:grid md:grid-cols-[320px_1fr] min-h-0 overflow-hidden"
    }
    // right (default)
    return "flex-1 flex flex-col md:grid md:grid-cols-[1fr_320px] min-h-0 overflow-hidden"
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <EventSelector event={event} onEventChange={handleEventChange} />
          {mode === "comp_sim" && (
            <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full">
              Comp Sim
            </span>
          )}
          {inputMode === "typing" && (
            <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">
              Typing
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {solves.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleEndSession}
            >
              <Square className="h-3 w-3 fill-current" />
              End Session
            </Button>
          )}
          <TimerSettings
            event={event}
            onEventChange={handleEventChange}
            mode={mode}
            onModeChange={handleModeChange}
            inspectionEnabled={inspectionEnabled}
            onInspectionChange={setInspectionEnabled}
            showTimeWhileSolving={showTimeWhileSolving}
            onShowTimeChange={setShowTimeWhileSolving}
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            sidebarPosition={sidebarPosition}
            onSidebarPositionChange={setSidebarPosition}
          />
        </div>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-destructive/15 text-destructive text-sm border-b border-destructive/30">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="shrink-0 p-0.5 hover:bg-destructive/20 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main content — layout depends on sidebar position */}
      <div className={getLayoutClass()}>
        {sidebarPosition === "left" && sidebarPanel}
        {timerArea}
        {sidebarPosition === "right" && sidebarPanel}
        {sidebarPosition === "bottom" && sidebarPanel}
      </div>

      {/* Inspection overlay */}
      <InspectionOverlay
        secondsLeft={inspection.secondsLeft}
        state={inspection.state}
        onStart={handleStartFromInspection}
      />

      {/* Session summary modal */}
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
