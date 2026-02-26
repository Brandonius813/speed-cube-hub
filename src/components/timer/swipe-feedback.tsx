"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { SwipeDirection } from "@/lib/timer/swipe-directions"
import { SWIPE_LABELS } from "@/lib/timer/swipe-directions"

type SwipeFeedbackProps = {
  /** The direction that was swiped, or null when no feedback to show */
  direction: SwipeDirection | null
  /** Called when the feedback animation completes */
  onDone: () => void
}

const DIRECTION_ARROWS: Record<SwipeDirection, string> = {
  up: "↑",
  "up-right": "↗",
  right: "→",
  "down-right": "↘",
  down: "↓",
  "down-left": "↙",
  left: "←",
  "up-left": "↖",
}

const DIRECTION_COLORS: Record<SwipeDirection, string> = {
  up: "text-yellow-400",        // +2
  "up-right": "text-green-400", // OK
  "up-left": "text-red-400",    // DNF
  left: "text-blue-400",        // Undo
  right: "text-muted-foreground", // Skip
  "down-left": "text-purple-400", // Note
  down: "text-red-400",         // Delete
  "down-right": "text-cyan-400", // Inspect
}

/**
 * Brief visual feedback toast shown after a swipe gesture.
 * Appears for ~1 second with the action name and an arrow.
 */
export function SwipeFeedback({ direction, onDone }: SwipeFeedbackProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!direction) {
      setVisible(false)
      return
    }

    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      // Small delay for the fade-out animation before calling onDone
      setTimeout(onDone, 200)
    }, 800)

    return () => clearTimeout(timer)
  }, [direction, onDone])

  if (!direction) return null

  return (
    <div
      className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
        "pointer-events-none transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-5 py-3 shadow-lg flex items-center gap-2">
        <span className={cn("text-2xl", DIRECTION_COLORS[direction])}>
          {DIRECTION_ARROWS[direction]}
        </span>
        <span className={cn("text-lg font-semibold", DIRECTION_COLORS[direction])}>
          {SWIPE_LABELS[direction]}
        </span>
      </div>
    </div>
  )
}
