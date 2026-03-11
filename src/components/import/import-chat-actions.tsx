"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImportDropZone } from "@/components/import/import-drop-zone"
import { WCA_EVENTS, DEFAULT_SECONDS_PER_SOLVE } from "@/lib/constants"
import type { ImportPreviewData, ImportPreviewSolve } from "@/lib/import/preview"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"

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
  | { type: "preview-confirm"; preview: ImportPreviewData }
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

function formatPreviewValue(valueMs: number | null): string {
  return valueMs == null ? "—" : formatTimeMsCentiseconds(valueMs)
}

function formatSolveLabel(solve: ImportPreviewSolve): string {
  if (solve.penalty === "DNF") return "DNF"
  if (solve.effectiveMs == null) return "—"

  const formatted = formatTimeMsCentiseconds(solve.effectiveMs)
  return solve.penalty === "+2" ? `${formatted}+` : formatted
}

function PreviewStatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  )
}

export function PreviewConfirmAction({
  preview,
  onImport,
  onToggleSolveIncluded,
  onStartOver,
  disabled,
}: {
  preview: ImportPreviewData
  onImport: () => void
  onToggleSolveIncluded: (solveIndex: number) => void
  onStartOver: () => void
  disabled?: boolean
}) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewMode, setReviewMode] = useState<"flagged" | "all">(
    preview.flaggedCount > 0 ? "flagged" : "all"
  )

  const visibleSolves =
    reviewMode === "flagged"
      ? preview.solves.filter((solve) => solve.flagged)
      : preview.solves
  const removedSolveCount = preview.totalSolveCount - preview.includedSolveCount

  return (
    <div className="space-y-3 pt-1">
      <div className="rounded-xl border border-border/50 bg-background p-4">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-muted-foreground">Source</div>
          <div className="text-right font-medium text-foreground">{preview.source}</div>

          <div className="text-muted-foreground">Solves</div>
          <div className="text-right font-mono font-medium text-foreground">
            {preview.hasRawSolves
              ? `${preview.includedSolveCount.toLocaleString()}/${preview.totalSolveCount.toLocaleString()}`
              : preview.totalSolveCount.toLocaleString()}
          </div>

          <div className="text-muted-foreground">Sessions</div>
          <div className="text-right font-mono font-medium text-foreground">
            {preview.sessions.length}
          </div>

          {preview.dateRange && (
            <>
              <div className="text-muted-foreground">Date range</div>
              <div className="text-right text-foreground">{preview.dateRange}</div>
            </>
          )}

          {preview.pbCount > 0 && (
            <>
              <div className="text-muted-foreground">PBs detected</div>
              <div className="text-right font-mono font-medium text-foreground">
                {preview.pbCount}
              </div>
            </>
          )}

          {preview.flaggedCount > 0 && (
            <>
              <div className="text-muted-foreground">Flagged solves</div>
              <div className="text-right font-mono font-medium text-amber-400">
                {preview.includedFlaggedCount}/{preview.flaggedCount}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <PreviewStatCard
            label="Best Single"
            value={formatPreviewValue(preview.bestSingleMs)}
          />
          <PreviewStatCard
            label="Current Ao5"
            value={formatPreviewValue(preview.currentStats.ao5)}
          />
          <PreviewStatCard
            label="Current Ao12"
            value={formatPreviewValue(preview.currentStats.ao12)}
          />
          <PreviewStatCard
            label="Current Ao100"
            value={formatPreviewValue(preview.currentStats.ao100)}
          />
          <PreviewStatCard
            label="Best Ao5"
            value={formatPreviewValue(preview.bestStats.ao5)}
          />
          <PreviewStatCard
            label="Best Ao12"
            value={formatPreviewValue(preview.bestStats.ao12)}
          />
          <PreviewStatCard
            label="Best Ao100"
            value={formatPreviewValue(preview.bestStats.ao100)}
          />
          <PreviewStatCard
            label="Removed"
            value={removedSolveCount.toLocaleString()}
          />
        </div>

        {preview.flaggedCount > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>
              {preview.flaggedCount} suspicious solve
              {preview.flaggedCount !== 1 ? "s were" : " was"} flagged for review.
              Flagged solves stay included unless you turn them off.
            </p>
          </div>
        )}

        {preview.hasRawSolves && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReviewOpen(true)}
            disabled={disabled}
            className="mt-4 w-full"
          >
            {preview.flaggedCount > 0
              ? `Review ${preview.flaggedCount} Flagged Solve${preview.flaggedCount !== 1 ? "s" : ""}`
              : "Review Solves"}
          </Button>
        )}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/50 px-4 py-4 sm:px-6">
            <DialogTitle>Review Imported Solves</DialogTitle>
            <DialogDescription>
              Remove anything suspicious before importing. The summary above
              updates immediately when you toggle a solve.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 sm:px-6">
            {preview.flaggedCount > 0 && (
              <Button
                variant={reviewMode === "flagged" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setReviewMode("flagged")}
              >
                Flagged
              </Button>
            )}
            <Button
              variant={reviewMode === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setReviewMode("all")}
            >
              All Solves
            </Button>
          </div>

          <div className="max-h-[55vh] overflow-y-auto px-4 py-3 sm:px-6">
            <div className="space-y-2">
              {visibleSolves.map((solve) => (
                <label
                  key={solve.index}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-3"
                >
                  <Checkbox
                    checked={solve.included}
                    onCheckedChange={() => onToggleSolveIncluded(solve.index)}
                    disabled={disabled}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {formatSolveLabel(solve)}
                        </span>
                        {solve.flagged && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                            flagged
                          </span>
                        )}
                        {solve.penalty === "DNF" && solve.timeMs > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            recorded {formatTimeMsCentiseconds(solve.timeMs)}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        #{solve.index + 1}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{solve.date}</span>
                      {solve.scramble && (
                        <span className="max-w-[55%] truncate text-right">
                          {solve.scramble}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}

              {visibleSolves.length === 0 && (
                <div className="rounded-lg border border-border/50 bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                  No solves in this view.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          disabled={disabled || preview.includedSolveCount === 0}
          className="flex-1"
          size="sm"
        >
          {preview.hasRawSolves
            ? `Import ${preview.includedSolveCount.toLocaleString()} Solve${preview.includedSolveCount !== 1 ? "s" : ""}`
            : `Import ${preview.sessions.length} Session${preview.sessions.length !== 1 ? "s" : ""}`}
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
  hasRawSolves,
  onImportMore,
}: {
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
