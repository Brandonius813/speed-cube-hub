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

function OrientationChip({
  label,
  face,
  color,
}: {
  label: "Bottom" | "Front"
  face: string
  color: string
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full shrink-0", FACE_DOTS[face])} aria-hidden />
      <span>
        {label}: {color}
      </span>
    </span>
  )
}

export function CrossSolverPanel({ scramble }: CrossSolverPanelProps) {
  const [revealedByFace, setRevealedByFace] = useState<
    Record<string, { scramble: string; count: number }>
  >({})

  const solutions = useMemo(() => solveCross(scramble), [scramble])
  const bestCount = useMemo(
    () =>
      solutions.length > 0
        ? solutions.reduce((best, solution) => Math.min(best, solution.moveCount), Infinity)
        : 0,
    [solutions]
  )

  if (solutions.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground/70 px-1">
        Hold the cube as shown, then reveal one move at a time.
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
              "space-y-1.5 rounded px-2 py-1.5",
              sol.moveCount === bestCount && "bg-secondary/40"
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn("w-2.5 h-2.5 rounded-full shrink-0", FACE_DOTS[sol.face])}
                title={sol.color}
              />
              <span className="text-xs font-medium text-foreground">{sol.color} Cross</span>
              <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {sol.moveCount}
              </span>
              <OrientationChip
                label="Bottom"
                face={sol.bottomFace}
                color={sol.bottomColor}
              />
              <OrientationChip
                label="Front"
                face={sol.frontFace}
                color={sol.frontColor}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="min-w-[7rem] flex-1 break-words text-xs font-mono text-foreground">
                {display}
              </span>
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
                    Next Move
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
          </div>
        )
      })}
    </div>
  )
}
