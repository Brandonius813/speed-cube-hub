"use client"

import { useMemo, useState } from "react"
import { solveCross } from "@/lib/timer/cross-solver"
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
  const [revealedByFace, setRevealedByFace] = useState<
    Record<string, { scramble: string; count: number }>
  >({})

  const solutions = useMemo(() => solveCross(scramble), [scramble])
  const bestCount = solutions.length > 0 ? solutions[0].moveCount : 0

  if (solutions.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground/70 px-1">
        Cross trainer: reveal one move at a time.
      </p>
      {solutions.map((sol) => {
        const faceState = revealedByFace[sol.face]
        const baseCount = faceState?.scramble === scramble ? faceState.count : 0
        const revealed = Math.min(baseCount, sol.moves.length)
        const hidden = Math.max(0, sol.moves.length - revealed)
        const shownMoves = sol.moves.slice(0, revealed)
        const maskedMoves = Array.from({ length: hidden }, () => "•")
        const display = sol.moveCount === 0
          ? "solved"
          : [...shownMoves, ...maskedMoves].join(" ")

        return (
          <div
            key={sol.face}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded text-xs font-mono",
              sol.moveCount === bestCount && "bg-secondary/40"
            )}
          >
            <span
              className={cn("w-2.5 h-2.5 rounded-full shrink-0", FACE_DOTS[sol.face])}
              title={sol.color}
            />
            <span className="text-muted-foreground/70 w-4 text-right shrink-0">
              {sol.moveCount}
            </span>
            <span className="flex-1 min-w-0 truncate">{display}</span>
            {sol.moveCount > 0 && (
              <>
                <button
                  onClick={() =>
                    setRevealedByFace((prev) => ({
                      ...prev,
                      [sol.face]: {
                        scramble,
                        count: Math.min(
                          sol.moves.length,
                          (prev[sol.face]?.scramble === scramble ? prev[sol.face].count : 0) + 1
                        ),
                      },
                    }))
                  }
                  disabled={revealed >= sol.moves.length}
                  className="px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Reveal next move"
                >
                  Reveal
                </button>
                <button
                  onClick={() =>
                    setRevealedByFace((prev) => ({
                      ...prev,
                      [sol.face]: { scramble, count: 0 },
                    }))
                  }
                  disabled={revealed === 0}
                  className="px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Hide all moves"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
