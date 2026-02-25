"use client"

import { useState } from "react"
import { Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTimeMs, getEffectiveTime } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import type { Solve } from "@/lib/types"

type SolveListProps = {
  solves: Solve[]
  onPenaltyChange: (solveId: string, penalty: "+2" | "DNF" | null) => void
  onDelete: (solveId: string) => void
  mode: "normal" | "comp_sim"
}

export function SolveList({
  solves,
  onPenaltyChange,
  onDelete,
  mode,
}: SolveListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (solves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No solves yet. Start solving!
      </div>
    )
  }

  // Reverse for display (most recent first)
  const displaySolves = [...solves].reverse()

  // Group by comp_sim_group if in comp sim mode
  if (mode === "comp_sim") {
    return (
      <CompSimSolveList
        solves={displaySolves}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        onPenaltyChange={onPenaltyChange}
        onDelete={onDelete}
      />
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border/50 overflow-y-auto max-h-full">
      {displaySolves.map((solve) => (
        <SolveRow
          key={solve.id}
          solve={solve}
          isExpanded={expandedId === solve.id}
          onToggle={() =>
            setExpandedId(expandedId === solve.id ? null : solve.id)
          }
          onPenaltyChange={onPenaltyChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function SolveRow({
  solve,
  isExpanded,
  onToggle,
  onPenaltyChange,
  onDelete,
}: {
  solve: Solve
  isExpanded: boolean
  onToggle: () => void
  onPenaltyChange: (solveId: string, penalty: "+2" | "DNF" | null) => void
  onDelete: (solveId: string) => void
}) {
  const effectiveTime = getEffectiveTime(solve)
  const isDNF = solve.penalty === "DNF"
  const isPlus2 = solve.penalty === "+2"

  return (
    <div className="px-3 py-2">
      <button
        onClick={onToggle}
        className="flex items-center w-full gap-2 text-left min-h-11"
      >
        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums font-mono">
          {solve.solve_number}.
        </span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums flex-1",
            isDNF && "text-destructive",
            isPlus2 && "text-yellow-400"
          )}
        >
          {isDNF ? "DNF" : formatTimeMs(effectiveTime)}
          {isPlus2 && <span className="text-xs ml-0.5">+</span>}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="pl-10 pb-2 space-y-2">
          {/* Scramble */}
          <p className="text-xs text-muted-foreground font-mono break-all leading-relaxed">
            {solve.scramble}
          </p>

          {/* Penalty + Delete controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant={solve.penalty === null ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => onPenaltyChange(solve.id, null)}
            >
              OK
            </Button>
            <Button
              variant={solve.penalty === "+2" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 text-xs px-2",
                solve.penalty === "+2" && "bg-yellow-600 hover:bg-yellow-700"
              )}
              onClick={() =>
                onPenaltyChange(
                  solve.id,
                  solve.penalty === "+2" ? null : "+2"
                )
              }
            >
              +2
            </Button>
            <Button
              variant={solve.penalty === "DNF" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 text-xs px-2",
                solve.penalty === "DNF" &&
                  "bg-destructive hover:bg-destructive/90"
              )}
              onClick={() =>
                onPenaltyChange(
                  solve.id,
                  solve.penalty === "DNF" ? null : "DNF"
                )
              }
            >
              DNF
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-destructive hover:text-destructive"
              onClick={() => onDelete(solve.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CompSimSolveList({
  solves,
  expandedId,
  setExpandedId,
  onPenaltyChange,
  onDelete,
}: {
  solves: Solve[]
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onPenaltyChange: (solveId: string, penalty: "+2" | "DNF" | null) => void
  onDelete: (solveId: string) => void
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
    <div className="flex flex-col divide-y divide-border overflow-y-auto max-h-full">
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
          <div key={groupNum} className="py-1">
            <div className="px-3 py-1.5 flex items-center justify-between bg-secondary/30">
              <span className="text-xs font-medium text-muted-foreground">
                Ao5 #{groupNum}
              </span>
              <span className="text-xs font-mono tabular-nums">
                {groupAvg}
              </span>
            </div>
            {/* Show solves within group in original order */}
            {[...groupSolves].reverse().map((solve) => (
              <SolveRow
                key={solve.id}
                solve={solve}
                isExpanded={expandedId === solve.id}
                onToggle={() =>
                  setExpandedId(expandedId === solve.id ? null : solve.id)
                }
                onPenaltyChange={onPenaltyChange}
                onDelete={onDelete}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
