"use client"

import { WCA_EVENTS } from "@/lib/constants"
import { formatTimeMs } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"

export type PBToast = {
  event: string
  pbType: string
  newTimeMs: number
  previousTimeMs?: number
}

type PBCelebrationProps = {
  toast: PBToast
  onDismiss: () => void
  className?: string
}

export function PBCelebration({ toast, onDismiss, className }: PBCelebrationProps) {
  const eventLabel = WCA_EVENTS.find((e) => e.id === toast.event)?.label ?? toast.event

  const pbLabel =
    toast.pbType === "Single"
      ? "Single"
      : toast.pbType.startsWith("Ao") || toast.pbType.startsWith("ao")
        ? toast.pbType.toUpperCase()
        : toast.pbType

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-xl border border-border shadow-lg bg-background px-4 py-3 min-w-[200px]",
        "animate-in slide-in-from-bottom-2 fade-in duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">New PB!</p>
          <p className="text-xs text-muted-foreground">{eventLabel} · {pbLabel}</p>
          <p className="text-2xl font-mono font-bold">{formatTimeMs(toast.newTimeMs)}</p>
          {toast.previousTimeMs !== undefined && (
            <p className="text-xs text-muted-foreground">
              Previous: {formatTimeMs(toast.previousTimeMs)}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
