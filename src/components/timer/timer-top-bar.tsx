import { Square, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SessionSelector } from "@/components/timer/session-selector"
import { TimerSettings } from "@/components/timer/timer-settings"
import type { InputMode, SidebarPosition } from "@/components/timer/timer-settings"
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
  sidebarPosition,
  onSidebarPositionChange,
  solveCount,
  onEndPractice,
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
  sidebarPosition: SidebarPosition
  onSidebarPositionChange: (position: SidebarPosition) => void
  solveCount: number
  onEndPractice: () => void
  saveError: string | null
  onDismissError: () => void
}) {
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
            inputMode={inputMode}
            onInputModeChange={onInputModeChange}
            sidebarPosition={sidebarPosition}
            onSidebarPositionChange={onSidebarPositionChange}
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
