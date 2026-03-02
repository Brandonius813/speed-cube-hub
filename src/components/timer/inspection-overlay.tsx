"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

type InspectionOverlayProps = {
  secondsLeft: number
  state: "idle" | "inspecting" | "overtime" | "done"
  onStart: () => void
}

export function InspectionOverlay({
  secondsLeft,
  state,
  onStart,
}: InspectionOverlayProps) {
  // Prevent spacebar from scrolling while inspection overlay is visible
  useEffect(() => {
    if (state === "idle" || state === "done") return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        // Keyboard start is handled by TimerDisplay — don't call onStart here
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [state])

  if (state === "idle" || state === "done") return null

  const getColor = () => {
    if (state === "overtime") return "text-destructive"
    if (secondsLeft <= 3) return "text-destructive"
    if (secondsLeft <= 7) return "text-yellow-400"
    return "text-green-400"
  }

  const getBgColor = () => {
    if (state === "overtime") return "bg-destructive/10"
    if (secondsLeft <= 3) return "bg-destructive/5"
    if (secondsLeft <= 7) return "bg-yellow-400/5"
    return "bg-green-400/5"
  }

  const getDisplayText = () => {
    if (state === "overtime") {
      return secondsLeft <= -2 ? "DNF" : "+2"
    }
    // Count up from 0: elapsed = 15 - secondsLeft
    return (15 - Math.max(0, secondsLeft)).toString()
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center select-none touch-none",
        getBgColor(),
        "backdrop-blur-sm"
      )}
      onTouchStart={(e) => {
        e.preventDefault()
        onStart()
      }}
      onClick={onStart}
    >
      {/* Large countdown number */}
      <div
        className={cn(
          "font-mono text-[10rem] sm:text-[14rem] font-bold tabular-nums leading-none transition-colors",
          getColor(),
          state === "overtime" && "animate-pulse"
        )}
      >
        {getDisplayText()}
      </div>

      {/* Hint */}
      <p className="mt-6 text-sm text-muted-foreground">
        {state === "overtime"
          ? "Start now to avoid DNF!"
          : "Press space or tap to start solving"}
      </p>
    </div>
  )
}
