"use client"

import { createPortal } from "react-dom"
import type { Session } from "@/lib/types"
import { getEventLabel } from "@/lib/constants"
import { formatDuration } from "@/lib/utils"

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function HeatmapTooltip({
  sessions,
  date,
  mouseX,
  mouseY,
  visible,
}: {
  sessions: Session[]
  date: string
  mouseX: number
  mouseY: number
  visible: boolean
}) {
  if (!visible || typeof window === "undefined") return null

  // Smart positioning: offset 12px from cursor, flip near edges
  const offset = 12
  const tooltipWidth = 220
  const tooltipHeight = 150

  let left = mouseX + offset
  let top = mouseY + offset

  // Flip horizontal if near right edge
  if (left + tooltipWidth > window.innerWidth - 16) {
    left = mouseX - tooltipWidth - offset
  }

  // Flip vertical if near bottom
  if (top + tooltipHeight > window.innerHeight - 16) {
    top = mouseY - tooltipHeight - offset
  }

  // Clamp to viewport
  left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8))
  top = Math.max(8, top)

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] w-[220px] rounded-lg border border-border/50 bg-background px-3 py-2.5 text-xs shadow-xl"
      style={{ left, top }}
    >
      <p className="mb-1.5 font-medium text-foreground">{formatDate(date)}</p>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground">No practice</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-muted-foreground">
                  {getEventLabel(s.event)}
                  {s.num_solves ? ` · ${s.num_solves} solves` : ""}
                </span>
                <span className="shrink-0 font-mono text-foreground">
                  {formatDuration(s.duration_minutes)}
                </span>
              </div>
            ))}
          </div>

          {sessions.length > 1 && (
            <>
              <div className="my-1.5 border-t border-border/30" />
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono text-foreground">
                  {formatDuration(totalMinutes)}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>,
    document.body
  )
}
