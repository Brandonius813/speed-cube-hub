"use client"

import { useState, useTransition, useMemo } from "react"
import { X } from "lucide-react"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"
import { bestStat } from "@/lib/timer/stats"
import { cn, formatDuration, formatDurationInput, parseDuration } from "@/lib/utils"
import { saveTimerSession } from "@/lib/actions/save-timer-session"
import type { TimerSolve } from "@/lib/timer/stats"

type SavedSessionPayload = {
  title: string
  durationMinutes: number
  practiceType: string
  sessionId: string
  timerSessionId: string
  numDnf: number
  avgSeconds: number | null
  bestSeconds: number | null
}

interface Props {
  solves: TimerSolve[]
  event: string
  eventName: string
  practiceType: string
  durationMinutes: number
  sessionStartMs: number
  autoStopReason?: "idle" | null
  onClose: () => void
  onDiscard: () => void
  onSaved: (payload: SavedSessionPayload) => void
}

function SessionSparkline({ solves }: { solves: TimerSolve[] }) {
  const points = useMemo(() => {
    const effective = solves.map((s) => {
      if (s.penalty === "DNF") return null
      return s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
    })
    const valid = effective.filter((t): t is number => t !== null)
    if (valid.length < 2) return null
    const min = Math.min(...valid)
    const max = Math.max(...valid)
    const range = max - min || 1
    const width = 220
    const height = 44
    const padding = 4

    const coords: { x: number; y: number; isBest: boolean }[] = []
    let validIdx = 0
    for (const t of effective) {
      if (t === null) continue
      const x = padding + (validIdx / (valid.length - 1)) * (width - padding * 2)
      const y = padding + (1 - (t - min) / range) * (height - padding * 2)
      coords.push({ x, y, isBest: t === min })
      validIdx++
    }
    return { coords, width, height }
  }, [solves])

  if (!points) return null

  const { coords, width, height } = points
  const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const bestPoint = coords.find((p) => p.isBest)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11" preserveAspectRatio="none">
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/60" />
      {bestPoint && (
        <circle cx={bestPoint.x} cy={bestPoint.y} r="3" className="fill-green-400" />
      )}
    </svg>
  )
}

export function EndSessionModal({
  solves,
  event,
  eventName,
  practiceType,
  durationMinutes,
  sessionStartMs,
  autoStopReason,
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

  // Extended stats
  const bestAo5 = useMemo(() => bestStat(solves, "ao5"), [solves])
  const bestAo12 = useMemo(() => bestStat(solves, "ao12"), [solves])

  // Improvement indicator: compare first-half avg vs second-half avg
  const improvement = useMemo(() => {
    if (effectiveTimes.length < 6) return null
    const mid = Math.floor(effectiveTimes.length / 2)
    const firstHalf = effectiveTimes.slice(0, mid)
    const secondHalf = effectiveTimes.slice(mid)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    if (firstAvg === 0) return null
    const pct = ((firstAvg - secondAvg) / firstAvg) * 100
    return { pct, improved: pct > 0 }
  }, [effectiveTimes])

  const [title, setTitle] = useState(
    practiceType === "Solves"
      ? `${eventName} Solves`
      : `${eventName} ${practiceType}`
  )
  const [durationInput, setDurationInput] = useState(formatDurationInput(durationMinutes))
  const [notes, setNotes] = useState("")
  const [shareToFeed, setShareToFeed] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      setError(null)
      const parsedDurationMinutes = parseDuration(durationInput)
      if (!parsedDurationMinutes) {
        setError('Invalid duration. Use minutes like "10" or h:mm like "1:30".')
        return
      }
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
        duration_minutes: parsedDurationMinutes,
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
      if (!result.sessionId || !result.timerSessionId) {
        setError("Session saved, but the timer session reference was missing.")
        return
      }
      onSaved({
        title:
          title.trim() ||
          (practiceType === "Solves" ? `${eventName} Solves` : `${eventName} ${practiceType}`),
        durationMinutes: parsedDurationMinutes,
        practiceType,
        sessionId: result.sessionId,
        timerSessionId: result.timerSessionId,
        numDnf,
        avgSeconds: avgMs ? avgMs / 1000 : null,
        bestSeconds: bestMs ? bestMs / 1000 : null,
      })
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
        className="relative w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
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

        {autoStopReason === "idle" && (
          <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
            Session ended automatically due to inactivity.
          </div>
        )}

        <h2 className="text-lg font-semibold mb-1">Session Summary</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Review your session stats, then save or discard.
        </p>

        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2 mb-3 p-3 rounded-lg bg-muted/50 border border-border">
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
            <div className="font-mono text-base font-medium">
              {bestMs ? formatTimeMsCentiseconds(bestMs) : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Best</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-base font-medium">
              {avgMs ? formatTimeMsCentiseconds(avgMs) : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Avg</div>
          </div>
        </div>

        {/* Extended stats row: Ao5, Ao12, improvement */}
        {(bestAo5 !== null || bestAo12 !== null || improvement !== null) && (
          <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-xs">
            {bestAo5 !== null && (
              <div className="text-center">
                <div className="font-mono font-medium">{formatTimeMsCentiseconds(bestAo5)}</div>
                <div className="text-[10px] text-muted-foreground">Best Ao5</div>
              </div>
            )}
            {bestAo12 !== null && (
              <div className="text-center">
                <div className="font-mono font-medium">{formatTimeMsCentiseconds(bestAo12)}</div>
                <div className="text-[10px] text-muted-foreground">Best Ao12</div>
              </div>
            )}
            {improvement !== null && (
              <div className="ml-auto text-center">
                <div className={cn("font-mono font-medium", improvement.improved ? "text-green-400" : "text-red-400")}>
                  {improvement.improved ? "↓" : "↑"} {Math.abs(improvement.pct).toFixed(1)}%
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {improvement.improved ? "Faster" : "Slower"} 2nd half
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sparkline */}
        {solves.length >= 3 && (
          <div className="mb-4 px-1">
            <SessionSparkline solves={solves} />
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Duration
          </label>
          <input
            type="text"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            inputMode="numeric"
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-mono"
            placeholder='10 or 1:30'
            aria-label="Session duration"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Minutes or h:mm. Saved as {formatDuration(Math.max(1, Math.round(durationMinutes)))} by default.
          </p>
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
