"use client"

import { Settings, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  HOLD_DURATION_OPTIONS,
  type HoldDuration,
  type TimerSize,
  type TimerUpdateMode,
} from "@/components/timer/timer-display"

export type InputMode = "timer" | "typing"
export type SidebarPosition = "right" | "left" | "bottom" | "hidden"

type TimerSettingsProps = {
  mode: "normal" | "comp_sim"
  onModeChange: (mode: "normal" | "comp_sim") => void
  inspectionEnabled: boolean
  onInspectionChange: (enabled: boolean) => void
  timerUpdateMode: TimerUpdateMode
  onTimerUpdateModeChange: (mode: TimerUpdateMode) => void
  timerSize: TimerSize
  onTimerSizeChange: (size: TimerSize) => void
  smallDecimals: boolean
  onSmallDecimalsChange: (enabled: boolean) => void
  holdDuration?: HoldDuration
  onHoldDurationChange?: (duration: HoldDuration) => void
  inputMode: InputMode
  onInputModeChange: (mode: InputMode) => void
  sidebarPosition: SidebarPosition
  onSidebarPositionChange: (position: SidebarPosition) => void
  statIndicators: string
  onStatIndicatorsChange: (indicators: string) => void
}

export function TimerSettings({
  mode,
  onModeChange,
  inspectionEnabled,
  onInspectionChange,
  timerUpdateMode,
  onTimerUpdateModeChange,
  timerSize,
  onTimerSizeChange,
  smallDecimals,
  onSmallDecimalsChange,
  holdDuration,
  onHoldDurationChange,
  inputMode,
  onInputModeChange,
  sidebarPosition,
  onSidebarPositionChange,
  statIndicators,
  onStatIndicatorsChange,
}: TimerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  return (
    <div className="relative" ref={popoverRef}>
      {/* Settings toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Settings popover — floats above content, never rearranges layout */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 max-h-[80vh] overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Settings</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

              {/* Mode toggle */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Mode
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={mode === "normal" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => onModeChange("normal")}
                  >
                    Normal
                  </Button>
                  <Button
                    variant={mode === "comp_sim" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => onModeChange("comp_sim")}
                  >
                    Comp Sim
                  </Button>
                </div>
              </div>

              {/* Inspection toggle */}
              <ToggleSetting
                label="WCA Inspection"
                description="15-second countdown with voice warnings"
                enabled={inspectionEnabled}
                onChange={onInspectionChange}
              />

              {/* Timer update mode */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  During Solve
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

              {/* Small decimals toggle */}
              <ToggleSetting
                label="Small Decimals"
                description="Show decimal digits in a smaller font"
                enabled={smallDecimals}
                onChange={onSmallDecimalsChange}
              />

              {/* Hold duration */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Hold Duration
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
                      {ms === 0 ? "None" : `${ms}ms`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Input mode toggle */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Input
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={inputMode === "timer" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => onInputModeChange("timer")}
                  >
                    Timer
                  </Button>
                  <Button
                    variant={inputMode === "typing" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => onInputModeChange("typing")}
                  >
                    Typing
                  </Button>
                </div>
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
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { value: "right", label: "Right" },
                      { value: "left", label: "Left" },
                      { value: "bottom", label: "Bottom" },
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
    </div>
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
