"use client"

import { useMemo, useState } from "react"
import { Copy, Check } from "lucide-react"
import { solveCross, type CrossSolution } from "@/lib/timer/cross-solver"
import { cn } from "@/lib/utils"

type CrossSolverPanelProps = {
  scramble: string
}

const FACE_DOTS: Record<string, string> = {
  U: "bg-white",
  D: "bg-yellow-400",
  R: "bg-red-500",
  L: "bg-orange-500",
  F: "bg-green-500",
  B: "bg-blue-500",
}

export function CrossSolverPanel({ scramble }: CrossSolverPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const solutions = useMemo(() => solveCross(scramble), [scramble])

  const bestCount = solutions.length > 0 ? solutions[0].moveCount : 0

  const handleCopy = async (sol: CrossSolution) => {
    const text = `${sol.color} cross (${sol.moveCount} moves): ${sol.moves.join(" ")}`
    await navigator.clipboard.writeText(text)
    setCopied(sol.face)
    setTimeout(() => setCopied(null), 2000)
  }

  if (solutions.length === 0) return null

  return (
    <div className="space-y-0.5">
      {solutions.map((sol) => (
        <div
          key={sol.face}
          className={cn(
            "flex items-center gap-2 px-2 py-1 rounded text-xs font-mono",
            sol.moveCount === bestCount && "bg-secondary/40"
          )}
        >
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              FACE_DOTS[sol.face]
            )}
            title={sol.color}
          />
          <span className="text-muted-foreground/70 w-4 text-right shrink-0">
            {sol.moveCount}
          </span>
          <span className="flex-1 min-w-0 truncate">
            {sol.moveCount === 0 ? "solved" : sol.moves.join(" ")}
          </span>
          <button
            onClick={() => handleCopy(sol)}
            className="p-0.5 rounded hover:bg-secondary/80 transition-colors shrink-0"
            title="Copy"
          >
            {copied === sol.face ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground/50" />
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
