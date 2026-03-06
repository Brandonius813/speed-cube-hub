"use client"

import { useState, useTransition } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveTimerSession } from "@/lib/actions/save-timer-session"
import type { TimerSolve } from "@/lib/timer/stats"

function fmtTime(ms: number): string {
  const s = ms / 1000
  if (s < 60) return s.toFixed(2)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(2).padStart(5, "0")}`
}

function fmtDuration(minutes: number): string {
  const m = Math.floor(minutes)
  const s = Math.round((minutes - m) * 60)
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

interface Props {
  solves: TimerSolve[]
  event: string
  eventName: string
  practiceType: string
  durationMinutes: number
  sessionStartMs: number
  onClose: () => void
  onDiscard: () => void
  onSaved: (title: string) => void
}

export function EndSessionModal({
  solves,
  event,
  eventName,
  practiceType,
  durationMinutes,
  sessionStartMs,
  onClose,
  onDiscard,
  onSaved,
}: Props) {
  // Compute stats from the solve list
  const nonDnf = solves.filter((s) => s.penalty !== "DNF")
  const effectiveTimes = nonDnf.map((s) =>
    s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
  )
  const avgMs =
    effectiveTimes.length > 0
      ? Math.round(effectiveTimes.reduce((a, b) => a + b, 0) / effectiveTimes.length)
      : null
  const bestMs = effectiveTimes.length > 0 ? Math.min(...effectiveTimes) : null
  const numDnf = solves.length - nonDnf.length

  const [title, setTitle] = useState(
    practiceType === "Solves"
      ? `${eventName} Solves`
      : `${eventName} ${practiceType}`
  )
  const [notes, setNotes] = useState("")
  const [shareToFeed, setShareToFeed] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      setError(null)
      const result = await saveTimerSession({
        event,
        solves: solves.map((s) => ({
          time_ms: s.time_ms,
          penalty: s.penalty,
          scramble: s.scramble,
          notes: s.notes ?? null,
          phases: s.phases ?? null,
          solved_at: s.solved_at,
        })),
        duration_minutes: durationMinutes,
        practice_type: practiceType,
        title: title.trim() || null,
        notes: notes.trim() || null,
        feed_visible: shareToFeed,
        session_start_ms: sessionStartMs,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      onSaved(title.trim() || (practiceType === "Solves" ? `${eventName} Solves` : `${eventName} ${practiceType}`))
    })
  }

  function handleDiscard() {
    const solveCount = solves.length
    const confirmed = window.confirm(
      `Discard this session and permanently delete ${solveCount} solve${
        solveCount === 1 ? "" : "s"
      }? This cannot be undone.`
    )
    if (!confirmed) return
    onDiscard()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold mb-1">Save Session</h2>
        <p className="text-xs text-muted-foreground mb-4">{fmtDuration(durationMinutes)} session</p>

        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2 mb-5 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="text-center">
            <div className="font-mono text-base font-medium">{solves.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Solves</div>
          </div>
          <div className="text-center">
            <div className={cn("font-mono text-base font-medium", numDnf > 0 && "text-red-400")}>
              {numDnf}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">DNF</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-base font-medium">{bestMs ? fmtTime(bestMs) : "—"}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Best</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-base font-medium">{avgMs ? fmtTime(avgMs) : "—"}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Avg</div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
            placeholder="Give your session a title…"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors resize-none"
            placeholder="What did you work on? How did it feel?"
          />
        </div>

        {/* Share to feed toggle */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-sm font-medium">Share to feed</div>
            <div className="text-xs text-muted-foreground">Followers can see this session</div>
          </div>
          <button
            className={cn(
              "relative w-10 h-6 rounded-full transition-colors duration-200",
              shareToFeed ? "bg-primary" : "bg-muted"
            )}
            onClick={() => setShareToFeed((v) => !v)}
            role="switch"
            aria-checked={shareToFeed}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                shareToFeed && "translate-x-4"
              )}
            />
          </button>
        </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Session"}
          </button>
          <button
            className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleDiscard}
            disabled={isPending}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
