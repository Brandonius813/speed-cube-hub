import { cn } from "@/lib/utils"
import { StatsPanel } from "@/components/timer/stats-panel"
import { SolveList } from "@/components/timer/solve-list"
import type { SessionStats } from "@/lib/timer/averages"
import type { Solve } from "@/lib/types"

export function TimerSidebar({
  sidebarPosition,
  stats,
  mode,
  solves,
  event,
  statIndicators,
  onPenaltyChange,
  onDelete,
  onSolveClick,
  onShareSolve,
  onStatClick,
}: {
  sidebarPosition: "left" | "right" | "bottom"
  stats: SessionStats
  mode: "normal" | "comp_sim"
  solves: Solve[]
  event: string
  statIndicators?: string
  onPenaltyChange: (solveId: string, penalty: "+2" | "DNF" | null) => void
  onDelete: (solveId: string) => void
  onSolveClick: (solve: Solve) => void
  onShareSolve?: (solve: Solve) => void
  onStatClick?: (statLabel: string, column: "current" | "best") => void
}) {
  const currentCompSimProgress =
    mode === "comp_sim"
      ? { current: (solves.length % 5) + 1, total: 5 }
      : undefined

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
        statIndicators={statIndicators}
        onStatClick={onStatClick}
      />
      <div className="flex-1 border-t border-border/50 overflow-y-auto min-h-0">
        <SolveList
          solves={solves}
          onSolveClick={onSolveClick}
          onShareSolve={onShareSolve}
          mode={mode}
          bestSingleTime={stats.best}
        />
      </div>
    </div>
  )
}
