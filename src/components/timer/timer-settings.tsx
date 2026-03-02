"use client"

import { Settings, X, Minus, Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  HOLD_DURATION_OPTIONS,
  type HoldDuration,
  type TimerSize,
  type TimerUpdateMode,
} from "@/components/timer/timer-display"

export type InputMode = "timer" | "typing" | "stackmat"
export type SidebarPosition = "right" | "left" | "hidden"
export type ScrambleSize = "auto" | "small" | "medium" | "large"

export const PHASE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export type PhaseCount = (typeof PHASE_COUNT_OPTIONS)[number]

/** Default phase labels for common phase counts */
export const DEFAULT_PHASE_LABELS: Record<number, string[]> = {
  2: ["First", "Last"],
  3: ["Phase 1", "Phase 2", "Phase 3"],
  4: ["Cross", "F2L", "OLL", "PLL"],
  5: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5"],
  6: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6"],
  7: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7"],
  8: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7", "Phase 8"],
  9: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7", "Phase 8", "Phase 9"],
  10: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7", "Phase 8", "Phase 9", "Phase 10"],
}

type TimerSettingsProps = {
  inspectionEnabled: boolean
  onInspectionChange: (enabled: boolean) => void
  inspectionVoice: boolean
  onInspectionVoiceChange: (enabled: boolean) => void
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
  inputMode: InputMode
  onInputModeChange: (mode: InputMode) => void
  sidebarPosition: SidebarPosition
  onSidebarPositionChange: (position: SidebarPosition) => void
  statIndicators: string
  onStatIndicatorsChange: (indicators: string) => void
  phaseCount?: PhaseCount
  onPhaseCountChange?: (count: PhaseCount) => void
  phaseLabels?: string[]
  onPhaseLabelsChange?: (labels: string[]) => void
  stackmatConnected?: boolean
  stackmatReceiving?: boolean
  stackmatError?: string | null
  onStackmatConnect?: () => void
  onStackmatDisconnect?: () => void
  scrambleSize: ScrambleSize
  onScrambleSizeChange: (size: ScrambleSize) => void
}

export function TimerSettings({
  inspectionEnabled,
  onInspectionChange,
  inspectionVoice,
  onInspectionVoiceChange,
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
  inputMode,
  onInputModeChange,
  sidebarPosition,
  onSidebarPositionChange,
  statIndicators,
  onStatIndicatorsChange,
  phaseCount = 1,
  onPhaseCountChange,
  phaseLabels,
  onPhaseLabelsChange,
  stackmatConnected,
  stackmatReceiving,
  stackmatError,
  onStackmatConnect,
  onStackmatDisconnect,
  scrambleSize,
  onScrambleSizeChange,
}: TimerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Settings toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={() => setIsOpen(true)}
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Full-screen settings modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Panel */}
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl">
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Settings</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Inspection toggle */}
              <ToggleSetting
                label="WCA Inspection"
                description="15-second countdown with voice warnings"
                enabled={inspectionEnabled}
                onChange={onInspectionChange}
              />

              {/* WCA voice warnings — only shown when inspection is on */}
              {inspectionEnabled && (
                <ToggleSetting
                  label="WCA voice warnings"
                  description="Announce 8 seconds and 12 seconds"
                  enabled={inspectionVoice}
                  onChange={onInspectionVoiceChange}
                />
              )}

              {/* Timer update mode */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  update timer during solve
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: "realtime", label: "Real-time" },
                    { value: "seconds", label: "Seconds" },
                    { value: "hidden", label: "Hidden" },
                  ] as const).map((opt) => (
                    <Button
                      key={opt.value}
                      variant={timerUpdateMode === opt.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => onTimerUpdateModeChange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Timer size */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Timer Size
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ] as const).map((opt) => (
                    <Button
                      key={opt.value}
                      variant={timerSize === opt.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => onTimerSizeChange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Scramble size */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Scramble Size
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { value: "auto", label: "Auto" },
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ] as const).map((opt) => (
                    <Button
                      key={opt.value}
                      variant={scrambleSize === opt.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => onScrambleSizeChange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Small decimals toggle */}
              <ToggleSetting
                label="Small Decimals"
                description="Show decimal digits in a smaller font"
                enabled={smallDecimals}
                onChange={onSmallDecimalsChange}
              />

              {/* Focus mode toggle */}
              <ToggleSetting
                label="Focus Mode"
                description="Hide everything except time while solving"
                enabled={hideWhileTiming ?? false}
                onChange={onHideWhileTimingChange ?? (() => {})}
              />

              {/* Spacebar hold duration */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium font-mono">
                  spacebar_hold_duration
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {HOLD_DURATION_OPTIONS.map((ms) => (
                    <Button
                      key={ms}
                      variant={holdDuration === ms ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => onHoldDurationChange?.(ms)}
                    >
                      {ms === 550 ? "550ms (stackmat)" : `${ms}ms`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Multi-phase timing */}
              {onPhaseCountChange && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Multi-Phase
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Split timing into phases (tap/key to advance)
                  </p>
                  {/* +/- stepper */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onPhaseCountChange(Math.max(1, phaseCount - 1) as PhaseCount)}
                      disabled={phaseCount <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm font-medium font-mono w-10 text-center">
                      {phaseCount === 1 ? "Off" : phaseCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onPhaseCountChange(Math.min(10, phaseCount + 1) as PhaseCount)}
                      disabled={phaseCount >= 10}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {phaseCount > 1 && onPhaseLabelsChange && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Phase labels:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Array.from({ length: phaseCount }, (_, i) => (
                          <input
                            key={i}
                            type="text"
                            value={phaseLabels?.[i] ?? ""}
                            onChange={(e) => {
                              const newLabels = [...(phaseLabels ?? [])]
                              while (newLabels.length < phaseCount) newLabels.push("")
                              newLabels[i] = e.target.value
                              onPhaseLabelsChange(newLabels)
                            }}
                            placeholder={DEFAULT_PHASE_LABELS[phaseCount]?.[i] ?? `Phase ${i + 1}`}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input mode toggle */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Input
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    variant={inputMode === "timer" ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => onInputModeChange("timer")}
                  >
                    Timer
                  </Button>
                  <Button
                    variant={inputMode === "typing" ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => onInputModeChange("typing")}
                  >
                    Typing
                  </Button>
                  <Button
                    variant={inputMode === "stackmat" ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => onInputModeChange("stackmat")}
                  >
                    Stackmat
                  </Button>
                </div>
                {inputMode === "stackmat" && (
                  <div className="space-y-2 rounded-lg bg-secondary/30 p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            stackmatReceiving
                              ? "bg-green-400"
                              : stackmatConnected
                                ? "bg-yellow-400"
                                : "bg-muted-foreground/30"
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {stackmatReceiving
                            ? "Signal detected"
                            : stackmatConnected
                              ? "Listening..."
                              : "Disconnected"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={stackmatConnected ? onStackmatDisconnect : onStackmatConnect}
                      >
                        {stackmatConnected ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                    {stackmatError && (
                      <p className="text-xs text-red-400">{stackmatError}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">
                      Connect a Stackmat timer via audio jack. Gen 3/4/5 supported.
                    </p>
                  </div>
                )}
              </div>

              {/* Statistics indicators */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Statistics
                </label>
                <p className="text-xs text-muted-foreground">
                  Space-separated averages (e.g., mo3 ao5 ao12 ao50 ao100)
                </p>
                <input
                  type="text"
                  value={statIndicators}
                  onChange={(e) => onStatIndicatorsChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="mo3 ao5 ao12 ao50 ao100"
                />
              </div>

              {/* Sidebar position */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Stats Panel
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { value: "right", label: "Right" },
                      { value: "left", label: "Left" },
                      { value: "hidden", label: "Hidden" },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.value}
                      variant={sidebarPosition === opt.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => onSidebarPositionChange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors shrink-0",
          enabled ? "bg-primary" : "bg-secondary"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            enabled && "translate-x-5"
          )}
        />
      </button>
    </div>
  )
}
