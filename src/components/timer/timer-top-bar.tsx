import { Square, X, Download } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SessionSelector } from "@/components/timer/session-selector"
import { TimerSettings } from "@/components/timer/timer-settings"
import type { InputMode, SidebarPosition } from "@/components/timer/timer-settings"
import type { HoldDuration } from "@/components/timer/timer-display"
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
  showTimeWhileSolving,
  onShowTimeChange,
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
  showTimeWhileSolving: boolean
  onShowTimeChange: (show: boolean) => void
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <SessionSelector
            sessions={sessions}
            currentSessionId={currentSession?.id ?? null}
            onSelect={onSelectSession}
            onCreate={onCreateSession}
            onManage={onManageSessions}
          />
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
            showTimeWhileSolving={showTimeWhileSolving}
            onShowTimeChange={onShowTimeChange}
            holdDuration={holdDuration}
            onHoldDurationChange={onHoldDurationChange}
            inputMode={inputMode}
            onInputModeChange={onInputModeChange}
            sidebarPosition={sidebarPosition}
            onSidebarPositionChange={onSidebarPositionChange}
            statIndicators={statIndicators}
            onStatIndicatorsChange={onStatIndicatorsChange}
          />
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
