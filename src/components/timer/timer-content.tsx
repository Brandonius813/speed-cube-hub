"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimerDisplay } from "@/components/timer/timer-display"
import { ScrambleDisplay } from "@/components/timer/scramble-display"
import { SolveList } from "@/components/timer/solve-list"
import { StatsPanel } from "@/components/timer/stats-panel"
import { EventSelector, TimerSettings } from "@/components/timer/timer-settings"
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

  // UI state
  const [showSummary, setShowSummary] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [lastTime, setLastTime] = useState<number | null>(null)

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

  // Handle a completed solve
  const handleSolveComplete = useCallback(
    async (timeMs: number) => {
      const inspPenalty = inspectionPenaltyRef.current
      inspectionPenaltyRef.current = null

      // Combine inspection penalty
      const penalty = inspPenalty

      setLastTime(
        penalty === "+2"
          ? timeMs + 2000
          : penalty === "DNF"
            ? null
            : timeMs
      )

      try {
        const sessionId = await ensureTimerSession()
        const solveNumber = solves.length + 1
        const compSimGroup =
          mode === "comp_sim" ? Math.floor((solveNumber - 1) / 5) + 1 : null

        const result = await addSolve(sessionId, {
          solve_number: solveNumber,
          time_ms: timeMs,
          penalty,
          scramble: currentScramble ?? "",
          event,
          comp_sim_group: compSimGroup,
        })

        if (result.data) {
          setSolves((prev) => [...prev, result.data!])
        }
      } catch (err) {
        console.error("Failed to save solve:", err)
      }

      // Load next scramble
      loadScramble(event as WcaEventId)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solves.length, event, mode, timerSessionId, currentScramble]
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
      await finalizeTimerSession(timerSessionId)
    }

    setTimerSessionId(null)
    setSolves([])
    setLastTime(null)
    setShowSummary(false)
    router.refresh()
  }

  const handleKeepGoing = () => {
    setShowSummary(false)
  }

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
          {/* Toggle sidebar on mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs md:hidden"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? "Hide" : "Stats"}
          </Button>
          <TimerSettings
            event={event}
            onEventChange={handleEventChange}
            mode={mode}
            onModeChange={handleModeChange}
            inspectionEnabled={inspectionEnabled}
            onInspectionChange={setInspectionEnabled}
            showTimeWhileSolving={showTimeWhileSolving}
            onShowTimeChange={setShowTimeWhileSolving}
          />
        </div>
      </div>

      {/* Main content — adaptive layout */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_320px] min-h-0 overflow-hidden">
        {/* Timer area */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Scramble */}
          <ScrambleDisplay
            scramble={currentScramble}
            isLoading={isLoadingScramble}
          />

          {/* Timer */}
          <TimerDisplay
            onSolveComplete={handleSolveComplete}
            lastTime={lastTime}
            showTimeWhileSolving={showTimeWhileSolving}
            disabled={showSummary || inspection.isInspecting}
            inspectionActive={inspectionEnabled && !inspection.isInspecting}
            onStartInspection={handleStartInspection}
          />
        </div>

        {/* Sidebar — stats + solve list */}
        {showSidebar && (
          <div className="flex flex-col border-t md:border-t-0 md:border-l border-border/50 max-h-[40vh] md:max-h-full overflow-hidden">
            {/* Stats */}
            <StatsPanel
              stats={stats}
              mode={mode}
              currentCompSimProgress={
                mode === "comp_sim" ? currentCompSimProgress : undefined
              }
            />

            {/* Solve list */}
            <div className="flex-1 border-t border-border/50 overflow-y-auto min-h-0">
              <SolveList
                solves={solves}
                onPenaltyChange={handlePenaltyChange}
                onDelete={handleDeleteSolve}
                mode={mode}
              />
            </div>
          </div>
        )}
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
