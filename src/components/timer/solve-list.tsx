"use client"

import { StickyNote } from "lucide-react"
import { formatTimeMs, getEffectiveTime } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import type { Solve } from "@/lib/types"

type SolveListProps = {
  solves: Solve[]
  onSolveClick: (solve: Solve) => void
  mode: "normal" | "comp_sim"
  bestSingleTime?: number | null
}

export function SolveList({
  solves,
  onSolveClick,
  mode,
  bestSingleTime,
}: SolveListProps) {
  if (solves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No solves yet. Start solving!
      </div>
    )
  }

  // Reverse for display (most recent first)
  const displaySolves = [...solves].reverse()

  if (mode === "comp_sim") {
    return (
      <CompSimSolveList
        solves={displaySolves}
        onSolveClick={onSolveClick}
        bestSingleTime={bestSingleTime}
      />
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto max-h-full">
      {displaySolves.map((solve) => (
        <SolveRow
          key={solve.id}
          solve={solve}
          onClick={() => onSolveClick(solve)}
          isPB={
            bestSingleTime != null &&
            getEffectiveTime(solve) === bestSingleTime &&
            solve.penalty !== "DNF"
          }
        />
      ))}
    </div>
  )
}

function SolveRow({
  solve,
  onClick,
  isPB,
}: {
  solve: Solve
  onClick: () => void
  isPB: boolean
}) {
  const effectiveTime = getEffectiveTime(solve)
  const isDNF = solve.penalty === "DNF"
  const isPlus2 = solve.penalty === "+2"
  const hasNotes = !!solve.notes

  return (
    <button
      onClick={onClick}
      className="flex items-center w-full gap-2 px-3 py-1.5 text-left hover:bg-secondary/30 transition-colors min-h-[36px]"
    >
      <span className="text-[11px] text-muted-foreground/60 w-7 shrink-0 tabular-nums font-mono text-right">
        {solve.solve_number}.
      </span>
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
      {hasNotes && (
        <StickyNote className="h-3 w-3 text-muted-foreground/40 shrink-0" />
      )}
    </button>
  )
}

function CompSimSolveList({
  solves,
  onSolveClick,
  bestSingleTime,
}: {
  solves: Solve[]
  onSolveClick: (solve: Solve) => void
  bestSingleTime?: number | null
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
    <div className="flex flex-col overflow-y-auto max-h-full">
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
                onClick={() => onSolveClick(solve)}
                isPB={
                  bestSingleTime != null &&
                  getEffectiveTime(solve) === bestSingleTime &&
                  solve.penalty !== "DNF"
                }
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
