"use client"

import { Mic, MicOff, Signal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStackmat } from "@/lib/timer/use-stackmat"
import { StackmatDecoder } from "@/lib/timer/stackmat"
import { cn } from "@/lib/utils"

type StackmatPanelProps = {
  onSolveComplete?: (timeMs: number) => void
  enabled?: boolean
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000)
  const cents = Math.floor((ms % 1000) / 10)
  const mins = Math.floor(secs / 60)
  const remSecs = secs % 60
  if (mins > 0) return `${mins}:${String(remSecs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`
  return `${remSecs}.${String(cents).padStart(2, "0")}`
}

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  running: "Running",
  stopped: "Stopped",
  reset: "Reset",
  left_hand: "Left",
  right_hand: "Right",
}

export function StackmatPanel({ onSolveComplete, enabled = true }: StackmatPanelProps) {
  const {
    isConnected,
    isReceiving,
    stackmatState,
    currentTimeMs,
    connect,
    disconnect,
    isSupported,
    error,
  } = useStackmat({
    onSolveComplete: onSolveComplete ?? (() => {}),
    enabled,
  })

  if (!isSupported) {
    return (
      <div className="rounded-lg bg-secondary/30 p-3 text-center">
        <MicOff className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          Microphone access not available in this browser.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className={cn("h-4 w-4", isConnected ? "text-green-400" : "text-muted-foreground")} />
          <span className="text-sm font-medium">Stackmat</span>
          {isConnected && (
            <div className="flex items-center gap-1">
              <Signal className={cn("h-3 w-3", isReceiving ? "text-green-400" : "text-muted-foreground/50")} />
              <span className="text-[10px] text-muted-foreground">
                {isReceiving ? "Signal OK" : "No signal"}
              </span>
            </div>
          )}
        </div>
        {isConnected ? (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={connect}
          >
            <Mic className="h-3 w-3" />
            Connect
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isConnected && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-2xl font-bold">{formatTime(currentTimeMs)}</span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              stackmatState === "running" && "bg-green-500/15 text-green-400",
              stackmatState === "stopped" && "bg-blue-500/15 text-blue-400",
              stackmatState === "idle" && "bg-muted-foreground/15 text-muted-foreground",
              stackmatState === "reset" && "bg-muted-foreground/15 text-muted-foreground",
              (stackmatState === "left_hand" || stackmatState === "right_hand") && "bg-yellow-500/15 text-yellow-400"
            )}
          >
            {STATUS_LABELS[stackmatState] ?? stackmatState}
          </span>
        </div>
      )}
    </div>
  )
}
