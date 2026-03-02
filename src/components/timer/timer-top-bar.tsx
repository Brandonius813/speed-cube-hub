import { Square, X, Download } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SessionSelector } from "@/components/timer/session-selector"
import { ScrambleTypeSelector } from "@/components/timer/scramble-type-selector"
import { CaseFilterPanel } from "@/components/timer/case-filter-panel"
import { TimerSettings } from "@/components/timer/timer-settings"
import { ScrambleDisplay } from "@/components/timer/scramble-display"
import type { InputMode, SidebarPosition, PhaseCount } from "@/components/timer/timer-settings"
import type { HoldDuration, TimerSize, TimerUpdateMode } from "@/components/timer/timer-display"
import type { SolveSession } from "@/lib/types"

export function TimerTopBar({
  sessions,
  currentSession,
  onSelectSession,
  onCreateSession,
  onManageSessions,
  mode,
  onModeChange,
  inputMode,
  onInputModeChange,
  inspectionEnabled,
  onInspectionChange,
  timerUpdateMode,
  onTimerUpdateModeChange,
  timerSize,
  onTimerSizeChange,
  smallDecimals,
  onSmallDecimalsChange,
  hideWhileTiming,
  onHideWhileTimingChange,
  holdDuration,
  onHoldDurationChange,
  sidebarPosition,
  onSidebarPositionChange,
  statIndicators,
  onStatIndicatorsChange,
  solveCount,
  onEndPractice,
  onExport,
  saveError,
  onDismissError,
  scrambleTypeId,
  onScrambleTypeChange,
  caseFilter,
  onCaseFilterChange,
  trainingCstimerType,
  phaseCount,
  onPhaseCountChange,
  phaseLabels,
  onPhaseLabelsChange,
  stackmatConnected,
  stackmatReceiving,
  stackmatError,
  onStackmatConnect,
  onStackmatDisconnect,
  scramble,
  event,
}: {
  sessions: SolveSession[]
  currentSession: SolveSession | null
  onSelectSession: (session: SolveSession) => void
  onCreateSession: (name: string, event: string, isTracked: boolean) => void
  onManageSessions: () => void
  mode: "normal" | "comp_sim"
  onModeChange: (mode: "normal" | "comp_sim") => void
  inputMode: InputMode
  onInputModeChange: (mode: InputMode) => void
  inspectionEnabled: boolean
  onInspectionChange: (enabled: boolean) => void
  timerUpdateMode: TimerUpdateMode
  onTimerUpdateModeChange: (mode: TimerUpdateMode) => void
  timerSize: TimerSize
  onTimerSizeChange: (size: TimerSize) => void
  smallDecimals: boolean
  onSmallDecimalsChange: (enabled: boolean) => void
  hideWhileTiming?: boolean
  onHideWhileTimingChange?: (enabled: boolean) => void
  holdDuration?: HoldDuration
  onHoldDurationChange?: (duration: HoldDuration) => void
  sidebarPosition: SidebarPosition
  onSidebarPositionChange: (position: SidebarPosition) => void
  statIndicators: string
  onStatIndicatorsChange: (indicators: string) => void
  solveCount: number
  onEndPractice: () => void
  onExport?: (format: "csv" | "json" | "txt" | "clipboard") => void
  saveError: string | null
  onDismissError: () => void
  scrambleTypeId?: string
  onScrambleTypeChange?: (typeId: string) => void
  caseFilter?: number[] | null
  onCaseFilterChange?: (cases: number[] | null) => void
  trainingCstimerType?: string
  phaseCount?: PhaseCount
  onPhaseCountChange?: (count: PhaseCount) => void
  phaseLabels?: string[]
  onPhaseLabelsChange?: (labels: string[]) => void
  stackmatConnected?: boolean
  stackmatReceiving?: boolean
  stackmatError?: string | null
  onStackmatConnect?: () => void
  onStackmatDisconnect?: () => void
  scramble: string | null
  event?: string
}) {
  const [showExport, setShowExport] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showExport])

  return (
    <>
      <div className="relative z-50 border-b border-border/50">
      <div className="flex items-center gap-2 px-3 py-1">

        {/* Left: session selector + status chips */}
        <div className="flex items-center gap-2 shrink-0">
          <SessionSelector
            sessions={sessions}
            currentSessionId={currentSession?.id ?? null}
            onSelect={onSelectSession}
            onCreate={onCreateSession}
            onManage={onManageSessions}
          />
          {scrambleTypeId && onScrambleTypeChange && currentSession && (
            <ScrambleTypeSelector
              eventId={currentSession.event}
              selectedTypeId={scrambleTypeId}
              onTypeChange={onScrambleTypeChange}
            />
          )}
          {trainingCstimerType && onCaseFilterChange && (
            <CaseFilterPanel
              cstimerType={trainingCstimerType}
              selectedCases={caseFilter ?? null}
              onSelectedCasesChange={onCaseFilterChange}
            />
          )}
          {mode === "comp_sim" && (
            <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full">
              Comp Sim
            </span>
          )}
          {phaseCount && phaseCount > 1 && (
            <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">
              {phaseCount}-Phase
            </span>
          )}
          {inputMode === "stackmat" && (
            <span className="text-xs bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  stackmatReceiving ? "bg-green-400" : stackmatConnected ? "bg-yellow-400" : "bg-muted-foreground/30"
                )}
              />
              Stackmat
            </span>
          )}
        </div>

        {/* Center: scramble */}
        <div className="flex-1 min-w-0">
          <ScrambleDisplay
            scramble={scramble}
            event={event}
          />
        </div>

        {/* Right: export, end practice, settings */}
        <div className="flex items-center gap-1 shrink-0">
          {solveCount > 0 && onExport && (
            <div className="relative" ref={exportRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowExport(!showExport)}
                title="Export solves"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                  {[
                    { key: "csv" as const, label: "Export CSV" },
                    { key: "json" as const, label: "Export JSON" },
                    { key: "txt" as const, label: "Export csTimer TXT" },
                    { key: "clipboard" as const, label: "Copy Stats" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        onExport(opt.key)
                        setShowExport(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {solveCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={onEndPractice}
            >
              <Square className="h-3 w-3 fill-current" />
              End Practice
            </Button>
          )}
          <TimerSettings
            mode={mode}
            onModeChange={onModeChange}
            inspectionEnabled={inspectionEnabled}
            onInspectionChange={onInspectionChange}
            timerUpdateMode={timerUpdateMode}
            onTimerUpdateModeChange={onTimerUpdateModeChange}
            timerSize={timerSize}
            onTimerSizeChange={onTimerSizeChange}
            smallDecimals={smallDecimals}
            onSmallDecimalsChange={onSmallDecimalsChange}
            hideWhileTiming={hideWhileTiming}
            onHideWhileTimingChange={onHideWhileTimingChange}
            holdDuration={holdDuration}
            onHoldDurationChange={onHoldDurationChange}
            inputMode={inputMode}
            onInputModeChange={onInputModeChange}
            sidebarPosition={sidebarPosition}
            onSidebarPositionChange={onSidebarPositionChange}
            statIndicators={statIndicators}
            onStatIndicatorsChange={onStatIndicatorsChange}
            phaseCount={phaseCount}
            onPhaseCountChange={onPhaseCountChange}
            phaseLabels={phaseLabels}
            onPhaseLabelsChange={onPhaseLabelsChange}
            stackmatConnected={stackmatConnected}
            stackmatReceiving={stackmatReceiving}
            stackmatError={stackmatError}
            onStackmatConnect={onStackmatConnect}
            onStackmatDisconnect={onStackmatDisconnect}
          />
        </div>
      </div>
      </div>

      {saveError && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-destructive/15 text-destructive text-sm border-b border-destructive/30">
          <span>{saveError}</span>
          <button
            onClick={onDismissError}
            className="shrink-0 p-0.5 hover:bg-destructive/20 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}
