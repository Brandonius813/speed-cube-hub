"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTimeMs } from "@/lib/timer/averages"
import type { SessionStats } from "@/lib/timer/averages"
import { WCA_EVENTS } from "@/lib/constants"

type SessionSummaryModalProps = {
  isOpen: boolean
  stats: SessionStats
  event: string
  mode: "normal" | "comp_sim"
  durationMinutes: number
  onSaveAndClose: () => Promise<void>
  onKeepGoing: () => void
  onShare?: () => void
}

export function SessionSummaryModal({
  isOpen,
  stats,
  event,
  mode,
  durationMinutes,
  onSaveAndClose,
  onKeepGoing,
  onShare,
}: SessionSummaryModalProps) {
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const eventLabel =
    WCA_EVENTS.find((e) => e.id === event)?.label ?? event

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveAndClose()
    } finally {
      setIsSaving(false)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 space-y-5">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-lg font-semibold">Practice Saved!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {eventLabel} · {mode === "comp_sim" ? "Comp Sim" : "Normal"} ·{" "}
              {formatDuration(durationMinutes)}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryStat label="Solves" value={stats.count.toString()} />
            <SummaryStat
              label="Session Mean"
              value={stats.mean !== null ? formatTimeMs(stats.mean) : "–"}
              mono
            />
            <SummaryStat
              label="Best Single"
              value={stats.best !== null ? formatTimeMs(stats.best) : "–"}
              mono
              highlight
            />
            <SummaryStat
              label="Worst"
              value={stats.worst !== null ? formatTimeMs(stats.worst) : "–"}
              mono
            />
            {stats.bestAo5 !== null && (
              <SummaryStat
                label="Best Ao5"
                value={formatTimeMs(stats.bestAo5)}
                mono
                highlight
              />
            )}
            {stats.bestAo12 !== null && (
              <SummaryStat
                label="Best Ao12"
                value={formatTimeMs(stats.bestAo12)}
                mono
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {onShare && (
              <Button
                variant="outline"
                size="icon"
                onClick={onShare}
                disabled={isSaving}
                title="Share session"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={onKeepGoing}
              disabled={isSaving}
            >
              Keep Going
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save & Close"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function SummaryStat({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="rounded-md bg-secondary/50 p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-sm font-medium ${mono ? "font-mono tabular-nums" : ""} ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  )
}
