"use client"

import { useMemo } from "react"
import { analyzeEOLine } from "@/lib/timer/eoline-solver"
import { cn } from "@/lib/utils"

type SolverPanelProps = {
  scramble: string
  event: string
}

/** EOLine analysis for ZZ solvers */
function EOLinePanel({ scramble }: { scramble: string }) {
  const result = useMemo(() => analyzeEOLine(scramble), [scramble])

  return (
    <div className="rounded-lg bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">ZZ EOLine Analysis</span>
        <span
          className={cn(
            "text-xs font-mono font-bold px-1.5 py-0.5 rounded",
            result.badEdgeCount === 0
              ? "bg-green-500/20 text-green-400"
              : result.badEdgeCount <= 4
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
          )}
        >
          {result.badEdgeCount} bad edge{result.badEdgeCount !== 1 ? "s" : ""}
        </span>
      </div>

      {result.badEdgeCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.badEdgeLabels.map((label) => (
            <span
              key={label}
              className="text-[10px] font-mono bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 text-xs">
        <span className={cn("flex items-center gap-1", result.dfSolved ? "text-green-400" : "text-muted-foreground")}>
          <span className={cn("w-2 h-2 rounded-full", result.dfSolved ? "bg-green-400" : "bg-muted-foreground/30")} />
          DF {result.dfSolved ? "solved" : "unsolved"}
        </span>
        <span className={cn("flex items-center gap-1", result.dbSolved ? "text-green-400" : "text-muted-foreground")}>
          <span className={cn("w-2 h-2 rounded-full", result.dbSolved ? "bg-green-400" : "bg-muted-foreground/30")} />
          DB {result.dbSolved ? "solved" : "unsolved"}
        </span>
      </div>
    </div>
  )
}

/** Scramble analysis panel — shows relevant solver info based on event */
export function SolverPanel({ scramble, event }: SolverPanelProps) {
  if (event === "333" || event === "333oh") {
    return (
      <div className="px-4 pb-2">
        <EOLinePanel scramble={scramble} />
      </div>
    )
  }

  // Future: 2x2 face analysis, pyraminx V, skewb face, Roux S1
  return null
}
