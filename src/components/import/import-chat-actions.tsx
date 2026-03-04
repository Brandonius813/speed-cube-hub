"use client"

import { CheckCircle2, Loader2, RotateCcw, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImportDropZone } from "@/components/import/import-drop-zone"
import { WCA_EVENTS, DEFAULT_SECONDS_PER_SOLVE } from "@/lib/constants"
import { useState } from "react"
import type { PreviewStats } from "@/lib/import/chat-scripts"

// ---- Types ----

export type ChatMessage = {
  id: string
  role: "bot" | "user"
  content: string
  action?: ChatAction
  timestamp: number
}

export type ChatAction =
  | { type: "timer-select" }
  | { type: "file-upload" }
  | { type: "event-select"; source: string }
  | { type: "preview-confirm"; stats: PreviewStats }
  | { type: "importing"; progress: string }
  | { type: "complete"; solveCount: number; hasRawSolves: boolean }
  | { type: "error"; message: string; canRetry?: boolean }

// ---- Helpers ----

export function makeMessage(
  role: "bot" | "user",
  content: string,
  action?: ChatAction
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    action,
    timestamp: Date.now(),
  }
}

// ---- Timer Select ----

const TIMER_OPTIONS = [
  { id: "cstimer", label: "csTimer", subtitle: "Web", color: "text-green-400" },
  { id: "cubetime", label: "CubeTime", subtitle: "iOS", color: "text-blue-400" },
  { id: "twistytimer", label: "Twisty Timer", subtitle: "Android", color: "text-orange-400" },
  { id: "other", label: "Other", subtitle: "Any timer", color: "text-muted-foreground" },
]

export function TimerSelectAction({
  onSelect,
  disabled,
}: {
  onSelect: (timerId: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
      {TIMER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          disabled={disabled}
          className="flex min-h-11 items-center gap-3 rounded-xl border border-border/50 bg-background px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/30 disabled:pointer-events-none disabled:opacity-50"
        >
          <Timer className={`h-5 w-5 shrink-0 ${opt.color}`} />
          <div>
            <p className="text-sm font-medium text-foreground">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.subtitle}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ---- File Upload ----

export function FileUploadAction({
  onData,
  disabled,
}: {
  onData: (text: string, fileName?: string) => void
  disabled?: boolean
}) {
  return (
    <div className="pt-1">
      <ImportDropZone onData={onData} disabled={disabled} />
    </div>
  )
}

// ---- Event Select ----

function secondsToMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function mmSsToSeconds(value: string): number | null {
  const trimmed = value.trim()
  // Support "m:ss" or "mm:ss" or just plain seconds
  const match = trimmed.match(/^(\d{1,3}):(\d{1,2})$/)
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2])
  }
  // Fallback: plain number = seconds
  const num = parseInt(trimmed)
  return isNaN(num) ? null : num
}

export function EventSelectAction({
  source,
  onConfirm,
  disabled,
}: {
  source: string
  onConfirm: (event: string, secondsPerSolve: number) => void
  disabled?: boolean
}) {
  const [event, setEvent] = useState("333")
  const defaultTotal = (DEFAULT_SECONDS_PER_SOLVE["333"] ?? 30) * 10
  const [tenSolveTime, setTenSolveTime] = useState(secondsToMmSs(defaultTotal))

  return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Event
        </label>
        <select
          value={event}
          onChange={(e) => {
            setEvent(e.target.value)
            const perSolve = DEFAULT_SECONDS_PER_SOLVE[e.target.value] ?? 30
            setTenSolveTime(secondsToMmSs(perSolve * 10))
          }}
          disabled={disabled}
          className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
        >
          {WCA_EVENTS.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          How long do 10 solves take you? (m:ss)
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={tenSolveTime}
          onChange={(e) => setTenSolveTime(e.target.value)}
          placeholder="5:00"
          disabled={disabled}
          className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground"
        />
        <p className="mt-1 text-xs text-muted-foreground/70">
          Include scrambling and inspection time — doesn&apos;t need to be exact
        </p>
      </div>

      <Button
        onClick={() => {
          const totalSeconds = mmSsToSeconds(tenSolveTime)
          const perSolve = totalSeconds ? Math.max(1, Math.round(totalSeconds / 10)) : (DEFAULT_SECONDS_PER_SOLVE[event] ?? 30)
          onConfirm(event, perSolve)
        }}
        disabled={disabled}
        className="w-full"
        size="sm"
      >
        Continue
      </Button>
    </div>
  )
}

// ---- Preview Confirm ----

export function PreviewConfirmAction({
  stats,
  onImport,
  onStartOver,
  disabled,
}: {
  stats: PreviewStats
  onImport: () => void
  onStartOver: () => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-3 pt-1">
      <div className="rounded-xl border border-border/50 bg-background p-4">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-muted-foreground">Source</div>
          <div className="text-right font-medium text-foreground">{stats.source}</div>

          <div className="text-muted-foreground">Solves</div>
          <div className="text-right font-mono font-medium text-foreground">
            {stats.solveCount.toLocaleString()}
          </div>

          <div className="text-muted-foreground">Sessions</div>
          <div className="text-right font-mono font-medium text-foreground">
            {stats.sessionCount}
          </div>

          {stats.dateRange && (
            <>
              <div className="text-muted-foreground">Date range</div>
              <div className="text-right text-foreground">{stats.dateRange}</div>
            </>
          )}

          {stats.bestTime && (
            <>
              <div className="text-muted-foreground">Best time</div>
              <div className="text-right font-mono font-medium text-foreground">
                {stats.bestTime}
              </div>
            </>
          )}

          {stats.pbCount > 0 && (
            <>
              <div className="text-muted-foreground">PBs detected</div>
              <div className="text-right font-mono font-medium text-foreground">
                {stats.pbCount}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartOver}
          disabled={disabled}
          className="text-muted-foreground"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Start Over
        </Button>
        <Button
          onClick={onImport}
          disabled={disabled}
          className="flex-1"
          size="sm"
        >
          {stats.hasRawSolves
            ? `Import ${stats.solveCount.toLocaleString()} Solves`
            : `Import ${stats.sessionCount} Session${stats.sessionCount !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  )
}

// ---- Importing (in-progress) ----

export function ImportingAction({ progress }: { progress: string }) {
  return (
    <div className="flex items-center gap-3 pt-1 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      <span>{progress || "Importing your data..."}</span>
    </div>
  )
}

// ---- Complete ----

export function CompleteAction({
  solveCount,
  hasRawSolves,
  onImportMore,
}: {
  solveCount: number
  hasRawSolves: boolean
  onImportMore: () => void
}) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">Import complete!</span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onImportMore}>
          Import More
        </Button>
        <Button asChild size="sm" className="flex-1">
          <a href={hasRawSolves ? "/timer" : "/profile?tab=stats"}>
            {hasRawSolves ? "Open Timer" : "View Stats"}
          </a>
        </Button>
      </div>
    </div>
  )
}

// ---- Error ----

export function ErrorAction({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-sm text-red-400">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Try Again
      </Button>
    </div>
  )
}
