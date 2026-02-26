"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { WCA_EVENTS } from "@/lib/constants"
import { formatTimeMs } from "@/lib/timer/averages"

type PBCelebrationProps = {
  isOpen: boolean
  onClose: () => void
  event: string
  pbType: string
  newTimeMs: number
  previousTimeMs?: number
  scramble?: string
  userName: string
  handle: string
  avatarUrl: string | null
}

export function PBCelebration({
  isOpen,
  onClose,
  event,
  pbType,
  newTimeMs,
  previousTimeMs,
}: PBCelebrationProps) {
  const eventLabel =
    WCA_EVENTS.find((e) => e.id === event)?.label ?? event

  const pbLabel =
    pbType === "single"
      ? "Single"
      : pbType.startsWith("ao")
        ? pbType.toUpperCase()
        : pbType

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            New PB!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {eventLabel} &middot; {pbLabel}
          </p>
          <p className="text-3xl font-mono font-bold text-primary">
            {formatTimeMs(newTimeMs)}
          </p>
          {previousTimeMs !== undefined && (
            <p className="text-xs text-muted-foreground">
              Previous: {formatTimeMs(previousTimeMs)}
            </p>
          )}
        </div>
        <Button onClick={onClose} className="w-full">
          Nice!
        </Button>
      </DialogContent>
    </Dialog>
  )
}
