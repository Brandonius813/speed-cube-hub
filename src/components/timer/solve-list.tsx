"use client"

import { useState } from "react"
import { Share2, StickyNote, CheckSquare, Square, Trash2, X } from "lucide-react"
import { formatTimeMs, getEffectiveTime } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Solve } from "@/lib/types"

type SolveListProps = {
  solves: Solve[]
  onSolveClick: (solve: Solve) => void
  onShareSolve?: (solve: Solve) => void
  onBatchDelete?: (solveIds: string[]) => void
  mode: "normal" | "comp_sim"
  bestSingleTime?: number | null
}

export function SolveList({
  solves,
  onSolveClick,
  onShareSolve,
  onBatchDelete,
  mode,
  bestSingleTime,
}: SolveListProps) {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(solves.map((s) => s.id)))
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
    setShowConfirm(false)
  }

  const handleDeleteConfirmed = () => {
    if (onBatchDelete && selectedIds.size > 0) {
      onBatchDelete(Array.from(selectedIds))
    }
    exitSelectMode()
  }

  if (solves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No solves yet. Start solving!
      </div>
    )
  }

  // Reverse for display (most recent first)
  const displaySolves = [...solves].reverse()

  return (
    <div className="flex flex-col overflow-y-auto max-h-full relative">
      {/* Select mode toggle header */}
      {onBatchDelete && solves.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1 border-b border-border/30 sticky top-0 bg-card z-10">
          {selectMode ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={exitSelectMode}
                  className="p-1 rounded hover:bg-secondary/50 transition-colors"
                  title="Cancel selection"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <span className="text-[11px] text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={selectAll}
                  className="text-[11px] text-primary hover:underline px-1"
                >
                  All
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-1 text-[11px] text-destructive hover:underline px-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors ml-auto"
            >
              Select
            </button>
          )}
        </div>
      )}

      {/* Solve rows */}
      {mode === "comp_sim" ? (
        <CompSimSolveList
          solves={displaySolves}
          onSolveClick={selectMode ? undefined : onSolveClick}
          onShareSolve={selectMode ? undefined : onShareSolve}
          bestSingleTime={bestSingleTime}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ) : (
        displaySolves.map((solve) => (
          <SolveRow
            key={solve.id}
            solve={solve}
            onClick={
              selectMode
                ? () => toggleSelect(solve.id)
                : () => onSolveClick(solve)
            }
            onShare={
              selectMode
                ? undefined
                : onShareSolve
                  ? () => onShareSolve(solve)
                  : undefined
            }
            isPB={
              bestSingleTime != null &&
              getEffectiveTime(solve) === bestSingleTime &&
              solve.penalty !== "DNF"
            }
            selectMode={selectMode}
            isSelected={selectedIds.has(solve.id)}
          />
        ))
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowConfirm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xs pointer-events-auto p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium">Delete {selectedIds.size} solve{selectedIds.size !== 1 ? "s" : ""}?</h3>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleDeleteConfirmed}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SolveRow({
  solve,
  onClick,
  onShare,
  isPB,
  selectMode = false,
  isSelected = false,
}: {
  solve: Solve
  onClick: () => void
  onShare?: () => void
  isPB: boolean
  selectMode?: boolean
  isSelected?: boolean
}) {
  const effectiveTime = getEffectiveTime(solve)
  const isDNF = solve.penalty === "DNF"
  const isPlus2 = solve.penalty === "+2"
  const hasNotes = !!solve.notes

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center w-full gap-2 px-3 py-1.5 text-left hover:bg-secondary/30 transition-colors min-h-[36px]",
        selectMode && isSelected && "bg-primary/10"
      )}
    >
      {selectMode ? (
        <span className="w-7 shrink-0 flex items-center justify-center">
          {isSelected ? (
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Square className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </span>
      ) : (
        <span className="text-[11px] text-muted-foreground/60 w-7 shrink-0 tabular-nums font-mono text-right">
          {solve.solve_number}.
        </span>
      )}
      <span
        className={cn(
          "font-mono text-sm tabular-nums flex-1",
          isDNF && "text-destructive line-through",
          isPlus2 && "text-yellow-400",
          isPB && !isDNF && !isPlus2 && "text-green-400"
        )}
      >
        {isDNF ? "DNF" : formatTimeMs(effectiveTime)}
        {isPlus2 && <span className="text-[10px] ml-0.5">+</span>}
      </span>
      {hasNotes && !selectMode && (
        <StickyNote className="h-3 w-3 text-muted-foreground/40 shrink-0" />
      )}
      {onShare && !selectMode && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            onShare()
          }}
          className="hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md hover:bg-secondary/60 shrink-0"
        >
          <Share2 className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
    </button>
  )
}

function CompSimSolveList({
  solves,
  onSolveClick,
  onShareSolve,
  bestSingleTime,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: {
  solves: Solve[]
  onSolveClick?: (solve: Solve) => void
  onShareSolve?: (solve: Solve) => void
  bestSingleTime?: number | null
  selectMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}) {
  // Group solves by comp_sim_group
  const groups = new Map<number, Solve[]>()
  for (const solve of solves) {
    const group = solve.comp_sim_group ?? 1
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(solve)
  }

  // Sort groups descending (most recent first)
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => b - a)

  return (
    <>
      {sortedGroups.map(([groupNum, groupSolves]) => {
        // Compute group average (trimmed mean of 5)
        const times = groupSolves.map(getEffectiveTime)
        const dnfCount = times.filter((t) => t === Infinity).length
        let groupAvg: string

        if (groupSolves.length < 5) {
          groupAvg = `${groupSolves.length}/5`
        } else if (dnfCount > 1) {
          groupAvg = "DNF"
        } else {
          const sorted = [...times].sort((a, b) => a - b)
          const trimmed = sorted.slice(1, -1)
          if (trimmed.some((t) => t === Infinity)) {
            groupAvg = "DNF"
          } else {
            const avg = Math.round(
              trimmed.reduce((a, b) => a + b, 0) / trimmed.length
            )
            groupAvg = formatTimeMs(avg)
          }
        }

        return (
          <div key={groupNum}>
            <div className="px-3 py-1 flex items-center justify-between bg-secondary/30">
              <span className="text-[11px] font-medium text-muted-foreground">
                Ao5 #{groupNum}
              </span>
              <span className="text-[11px] font-mono tabular-nums">
                {groupAvg}
              </span>
            </div>
            {[...groupSolves].reverse().map((solve) => (
              <SolveRow
                key={solve.id}
                solve={solve}
                onClick={
                  selectMode && onToggleSelect
                    ? () => onToggleSelect(solve.id)
                    : onSolveClick
                      ? () => onSolveClick(solve)
                      : () => {}
                }
                onShare={
                  selectMode
                    ? undefined
                    : onShareSolve
                      ? () => onShareSolve(solve)
                      : undefined
                }
                isPB={
                  bestSingleTime != null &&
                  getEffectiveTime(solve) === bestSingleTime &&
                  solve.penalty !== "DNF"
                }
                selectMode={selectMode}
                isSelected={selectedIds?.has(solve.id) ?? false}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}
