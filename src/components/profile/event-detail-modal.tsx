"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Plus, Eye, EyeOff } from "lucide-react"
import { WCA_EVENTS, getPBTypesForEvent } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import type { PBRecord } from "@/lib/types"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function formatTime(seconds: number, eventId?: string): string {
  if (eventId === "333fm")
    return Number.isInteger(seconds) ? `${seconds}` : `${seconds.toFixed(2)}`
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

function formatMBLD(pb: PBRecord): string {
  if (pb.mbld_solved && pb.mbld_attempted) {
    return `${pb.mbld_solved}/${pb.mbld_attempted} in ${formatTime(pb.time_seconds)}`
  }
  return formatTime(pb.time_seconds)
}

/** Default PB types shown on the compact grid per event */
export function getDefaultDisplayTypes(eventId: string): string[] {
  if (["333bf", "444bf", "555bf", "333fm"].includes(eventId)) {
    return ["Single", "Mo3"]
  }
  if (eventId === "333mbf") return ["Single"]
  if (["666", "777"].includes(eventId)) return ["Single", "Mo3"]
  return ["Single", "Ao5"]
}

export function EventDetailModal({
  event,
  open,
  onOpenChange,
  pbsByType,
  isOwner,
  displayTypes,
  onDisplayTypesChange,
  onAddPB,
  onSelectPBType,
}: {
  event: string
  open: boolean
  onOpenChange: (open: boolean) => void
  pbsByType: Record<string, PBRecord>
  isOwner: boolean
  displayTypes: string[]
  onDisplayTypesChange?: (eventId: string, types: string[]) => void
  onAddPB?: (event: string, pbType?: string) => void
  onSelectPBType?: (event: string, pbType: string) => void
}) {
  const allTypes = getPBTypesForEvent(event)
  const [localDisplayTypes, setLocalDisplayTypes] = useState<Set<string>>(
    () => new Set(displayTypes)
  )

  function toggleDisplayType(type: string) {
    setLocalDisplayTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size <= 1) return prev
        next.delete(type)
      } else {
        next.add(type)
      }
      const arr = allTypes.filter((t) => next.has(t))
      onDisplayTypesChange?.(event, arr)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CubingIcon event={event} className="text-base" />
            {getEventLabel(event)}
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Tap a time to view history below. Toggle the eye to show/hide on your profile."
              : "Personal best times for this event."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-1">
            {allTypes.map((type) => {
              const pb = pbsByType[type]
              const isDisplayed = localDisplayTypes.has(type)

              return (
                <div
                  key={type}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 transition ${
                    pb ? "cursor-pointer hover:bg-secondary/80" : ""
                  }`}
                  onClick={
                    pb
                      ? () => {
                          onSelectPBType?.(event, type)
                          onOpenChange(false)
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleDisplayType(type)
                        }}
                        className={`shrink-0 transition ${
                          isDisplayed
                            ? "text-primary"
                            : "text-muted-foreground/30 hover:text-muted-foreground/60"
                        }`}
                        title={
                          isDisplayed
                            ? "Shown on profile — click to hide"
                            : "Hidden — click to show on profile"
                        }
                      >
                        {isDisplayed ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <span className="text-sm font-medium text-muted-foreground">
                      {type}
                    </span>
                  </div>

                  {pb ? (
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-semibold text-foreground">
                        {event === "333mbf"
                          ? formatMBLD(pb)
                          : formatTime(pb.time_seconds, event)}
                      </div>
                      <div className="font-mono text-[10px] uppercase text-muted-foreground/60">
                        {new Date(
                          pb.date_achieved + "T12:00:00"
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ) : isOwner ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddPB?.(event, type)
                      }}
                      className="text-sm text-muted-foreground/40 transition hover:text-foreground shrink-0"
                    >
                      — add
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground/30 shrink-0">
                      —
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {isOwner && (
          <div className="pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 min-h-11"
              onClick={() => onAddPB?.(event)}
            >
              <Plus className="h-4 w-4" />
              Add PB
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
