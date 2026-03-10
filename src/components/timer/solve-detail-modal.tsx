"use client"

import { useState, useEffect, useRef } from "react"
import { X, Copy, Check, Pencil, Share2, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTimeMs } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import type { TimerSolve } from "@/lib/timer/stats"

type SolveDetailModalProps = {
  solve: TimerSolve | null
  isOpen: boolean
  onClose: () => void
  onPenaltyChange: (solveId: string, penalty: "+2" | "DNF" | null) => void
  onDelete: (solveId: string) => boolean
  onNotesChange?: (solveId: string, notes: string) => void
  onShare?: (solve: TimerSolve) => void
  isPersonalBest?: boolean
  solveNumber?: number | null
  phaseLabels?: string[]
}

export function SolveDetailModal({
  solve,
  isOpen,
  onClose,
  onPenaltyChange,
  onDelete,
  onNotesChange,
  onShare,
  isPersonalBest = false,
  solveNumber,
  phaseLabels,
}: SolveDetailModalProps) {
  const [copied, setCopied] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(() => solve?.notes ?? "")
  const notesRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingNotes && notesRef.current) {
      notesRef.current.focus()
    }
  }, [editingNotes])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen || !solve) return null

  const effectiveTime =
    solve.penalty === "DNF"
      ? Infinity
      : solve.penalty === "+2"
        ? solve.time_ms + 2000
        : solve.time_ms
  const isDNF = solve.penalty === "DNF"
  const isPlus2 = solve.penalty === "+2"

  const solvedAt = solve.solved_at ?? solve.created_at ?? null
  const solvedDate = solvedAt ? new Date(solvedAt) : null
  const hasValidDate = !!solvedDate && !Number.isNaN(solvedDate.getTime())
  const dateStr = hasValidDate
    ? solvedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null
  const timeStr = hasValidDate
    ? solvedDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null

  const handleCopyScramble = async () => {
    if (!solve.scramble) return
    await navigator.clipboard.writeText(solve.scramble)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveNotes = () => {
    if (onNotesChange) {
      onNotesChange(solve.id, notesValue.trim())
    }
    setEditingNotes(false)
  }

  const handleDelete = () => {
    const deleted = onDelete(solve.id)
    if (deleted) onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Solve #{solveNumber ?? solve.solve_number ?? "?"}
              </span>
              {isPersonalBest && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-green-300">
                  <Trophy className="h-3 w-3" />
                  PB
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-secondary/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Big time display */}
          <div className="flex flex-col items-center py-6 px-4">
            <div
              className={cn(
                "font-mono text-4xl font-bold tabular-nums",
                isDNF && "text-destructive",
                isPlus2 && "text-yellow-400"
              )}
            >
              {isDNF ? "DNF" : formatTimeMs(effectiveTime)}
              {isPlus2 && <span className="text-lg ml-1">+2</span>}
            </div>
            {isPlus2 && (
              <span className="text-xs text-muted-foreground font-mono mt-1">
                ({formatTimeMs(solve.time_ms)} + 2.000)
              </span>
            )}
            {dateStr && timeStr && (
              <span className="text-xs text-muted-foreground mt-2">
                {dateStr} at {timeStr}
              </span>
            )}
          </div>

          {/* Phase breakdown */}
          {solve.phases && solve.phases.length > 1 && (
            <div className="px-4 pb-3">
              <div className="rounded-lg bg-secondary/30 px-3 py-2">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {solve.phases.map((phaseMs, i) => {
                    const pct = Math.round((phaseMs / solve.time_ms) * 100)
                    return (
                      <div key={i} className="text-center min-w-[52px]">
                        <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                          {phaseLabels?.[i] || `Phase ${i + 1}`}
                        </div>
                        <div className="text-sm font-mono tabular-nums font-medium">
                          {formatTimeMs(phaseMs)}
                        </div>
                        <div className="text-[9px] text-muted-foreground/40 font-mono">
                          {pct}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Scramble */}
          {solve.scramble && (
            <div className="px-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-mono text-muted-foreground leading-relaxed break-all flex-1">
                  {solve.scramble}
                </p>
                <button
                  onClick={handleCopyScramble}
                  className="shrink-0 p-1.5 rounded hover:bg-secondary/80 transition-colors"
                  title="Copy scramble"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="px-4 pb-4">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  ref={notesRef}
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full h-20 bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  maxLength={500}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setNotesValue(solve.notes ?? "")
                      setEditingNotes(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSaveNotes}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {solve.notes ? solve.notes : "Add note..."}
              </button>
            )}
          </div>

          {/* Penalty toggles */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={solve.penalty === null ? "default" : "outline"}
                size="sm"
                className="flex-1 h-9"
                onClick={() => onPenaltyChange(solve.id, null)}
              >
                OK
              </Button>
              <Button
                variant={solve.penalty === "+2" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1 h-9",
                  solve.penalty === "+2" && "bg-yellow-600 hover:bg-yellow-700"
                )}
                onClick={() =>
                  onPenaltyChange(solve.id, solve.penalty === "+2" ? null : "+2")
                }
              >
                +2
              </Button>
              <Button
                variant={solve.penalty === "DNF" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1 h-9",
                  solve.penalty === "DNF" && "bg-destructive hover:bg-destructive/90"
                )}
                onClick={() =>
                  onPenaltyChange(solve.id, solve.penalty === "DNF" ? null : "DNF")
                }
              >
                DNF
              </Button>
            </div>
          </div>

          {onShare && (
            <div className="px-4 pb-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9"
                onClick={() => onShare(solve)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {isPersonalBest ? "Share PB" : "Share Solve"}
              </Button>
            </div>
          )}

          {/* Delete */}
          <div className="px-4 pb-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              Delete Solve
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
