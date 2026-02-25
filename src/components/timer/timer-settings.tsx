"use client"

import { Settings, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { WCA_EVENTS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TimerSettingsProps = {
  event: string
  onEventChange: (eventId: string) => void
  mode: "normal" | "comp_sim"
  onModeChange: (mode: "normal" | "comp_sim") => void
  inspectionEnabled: boolean
  onInspectionChange: (enabled: boolean) => void
  showTimeWhileSolving: boolean
  onShowTimeChange: (show: boolean) => void
}

export function TimerSettings({
  event,
  onEventChange,
  mode,
  onModeChange,
  inspectionEnabled,
  onInspectionChange,
  showTimeWhileSolving,
  onShowTimeChange,
}: TimerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Settings toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Settings panel — slides in from right on mobile, inline on desktop */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 overflow-y-auto md:static md:w-full md:border-l-0 md:border-t md:border-border md:z-auto">
            <div className="p-4 space-y-5">
              {/* Close button (mobile only) */}
              <div className="flex items-center justify-between md:hidden">
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

              {/* Event selector */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Event
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WCA_EVENTS.map((e) => (
                    <Badge
                      key={e.id}
                      variant={event === e.id ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer min-h-8 text-xs",
                        event === e.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      )}
                      onClick={() => onEventChange(e.id)}
                    >
                      {e.label}
                    </Badge>
                  ))}
                </div>
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

              {/* Show time while solving toggle */}
              <ToggleSetting
                label="Show Time"
                description="Display running time while solving"
                enabled={showTimeWhileSolving}
                onChange={onShowTimeChange}
              />
            </div>
          </div>
        </>
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

/**
 * Compact event selector shown in the top bar (not the full settings panel).
 * Shows current event as a badge with dropdown.
 */
export function EventSelector({
  event,
  onEventChange,
}: {
  event: string
  onEventChange: (eventId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentEvent = WCA_EVENTS.find((e) => e.id === event)

  return (
    <div className="relative">
      <Badge
        variant="outline"
        className="cursor-pointer min-h-8 text-sm font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentEvent?.label ?? event}
      </Badge>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-md shadow-lg p-2 min-w-48">
            <div className="flex flex-wrap gap-1.5">
              {WCA_EVENTS.map((e) => (
                <Badge
                  key={e.id}
                  variant={event === e.id ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer min-h-8 text-xs",
                    event === e.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  )}
                  onClick={() => {
                    onEventChange(e.id)
                    setIsOpen(false)
                  }}
                >
                  {e.label}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
