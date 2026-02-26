"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { StatsPanel } from "@/components/timer/stats-panel"
import { SolveList } from "@/components/timer/solve-list"
import { SolveDetailModal } from "@/components/timer/solve-detail-modal"
import type { SessionStats } from "@/lib/timer/averages"
import type { Solve } from "@/lib/types"

export function TimerSidebar({
  sidebarPosition,
  stats,
  mode,
  solves,
  event,
  onPenaltyChange,
  onDelete,
  onNotesChange,
}: {
  sidebarPosition: "left" | "right" | "bottom"
  stats: SessionStats
  mode: "normal" | "comp_sim"
  solves: Solve[]
  event: string
  onPenaltyChange: (solveId: string, penalty: "+2" | "DNF" | null) => void
  onDelete: (solveId: string) => void
  onNotesChange?: (solveId: string, notes: string) => void
}) {
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null)

  const currentCompSimProgress =
    mode === "comp_sim"
      ? { current: (solves.length % 5) + 1, total: 5 }
      : undefined

  // Keep the selected solve in sync with the solves array (penalties, etc.)
  const activeSolve = selectedSolve
    ? solves.find((s) => s.id === selectedSolve.id) ?? selectedSolve
    : null

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        sidebarPosition === "bottom"
          ? "border-t border-border/50 max-h-[40vh]"
          : sidebarPosition === "left"
            ? "border-r border-border/50"
            : "border-l border-border/50"
      )}
    >
      <StatsPanel
        stats={stats}
        mode={mode}
        currentCompSimProgress={
          mode === "comp_sim" ? currentCompSimProgress : undefined
        }
        solves={solves}
        event={event}
      />
      <div className="flex-1 border-t border-border/50 overflow-y-auto min-h-0">
        <SolveList
          solves={solves}
          onSolveClick={setSelectedSolve}
          mode={mode}
          bestSingleTime={stats.best}
        />
      </div>

      <SolveDetailModal
        solve={activeSolve}
        isOpen={!!activeSolve}
        onClose={() => setSelectedSolve(null)}
        onPenaltyChange={onPenaltyChange}
        onDelete={onDelete}
        onNotesChange={onNotesChange}
      />
    </div>
  )
}
