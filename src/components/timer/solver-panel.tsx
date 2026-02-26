"use client"

import { useMemo, useState } from "react"
import { Copy, Check } from "lucide-react"
import { analyzeEOLine, solveEOLine } from "@/lib/timer/eoline-solver"
import { solve2x2Face } from "@/lib/timer/twox2-face-solver"
import { analyzeRouxFB } from "@/lib/timer/roux-analyzer"
import { analyzePyraminx } from "@/lib/timer/pyraminx-analyzer"
import { cn } from "@/lib/utils"

type SolverPanelProps = {
  scramble: string
  event: string
}

// ── EOLine Analysis (ZZ method) ──────────────────────────────────────

function EOLinePanel({ scramble }: { scramble: string }) {
  const result = useMemo(() => analyzeEOLine(scramble), [scramble])
  const solution = useMemo(() => solveEOLine(scramble), [scramble])
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (solution.moveCount <= 0) return
    await navigator.clipboard.writeText(solution.moves.join(" "))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          ZZ EOLine
        </span>
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
          {result.badEdgeCount} bad
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
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              result.dfSolved ? "bg-green-400" : "bg-muted-foreground/30"
            )}
          />
          <span className={result.dfSolved ? "text-green-400" : "text-muted-foreground"}>
            DF
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              result.dbSolved ? "bg-green-400" : "bg-muted-foreground/30"
            )}
          />
          <span className={result.dbSolved ? "text-green-400" : "text-muted-foreground"}>
            DB
          </span>
        </span>
      </div>

      {solution.moveCount > 0 && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground/60 shrink-0">
            {solution.moveCount}m
          </span>
          <span className="text-xs font-mono truncate flex-1 min-w-0">
            {solution.moves.join(" ")}
          </span>
          <button
            onClick={handleCopy}
            className="p-0.5 rounded hover:bg-secondary/80 transition-colors shrink-0"
            title="Copy solution"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground/50" />
            )}
          </button>
        </div>
      )}
      {solution.moveCount === 0 && (
        <div className="text-[10px] text-green-400 pt-1 border-t border-border/30">
          EOLine already solved!
        </div>
      )}
    </div>
  )
}

// ── Roux First Block Analysis ────────────────────────────────────────

function RouxFBPanel({ scramble }: { scramble: string }) {
  const result = useMemo(() => analyzeRouxFB(scramble), [scramble])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Roux FB
        </span>
        <span
          className={cn(
            "text-xs font-mono font-bold px-1.5 py-0.5 rounded",
            result.solvedCount === result.totalCount
              ? "bg-green-500/20 text-green-400"
              : result.solvedCount >= 3
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-muted-foreground/20 text-muted-foreground"
          )}
        >
          {result.solvedCount}/{result.totalCount}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {result.pieces.map((p) => (
          <span
            key={p.name}
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded",
              p.solved
                ? "bg-green-500/15 text-green-400"
                : "bg-muted-foreground/10 text-muted-foreground"
            )}
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── 2x2 Face Analysis ────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  U: "bg-white", D: "bg-yellow-400", R: "bg-red-500",
  L: "bg-orange-500", F: "bg-green-500", B: "bg-blue-500",
}

function Face2x2Panel({ scramble }: { scramble: string }) {
  const solutions = useMemo(() => solve2x2Face(scramble), [scramble])
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (face: string, moves: string[]) => {
    await navigator.clipboard.writeText(moves.join(" "))
    setCopied(face)
    setTimeout(() => setCopied(null), 2000)
  }

  const bestCount = solutions.length > 0 ? solutions[0].moveCount : 0

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">
        Face Solver
      </span>
      <div className="space-y-0.5">
        {solutions.map((sol) => (
          <div
            key={sol.face}
            className={cn(
              "flex items-center gap-2 px-1.5 py-0.5 rounded text-xs font-mono",
              sol.moveCount === bestCount && "bg-secondary/40"
            )}
          >
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", DOT_COLORS[sol.face])} />
            <span className="text-muted-foreground/70 w-4 text-right shrink-0">
              {sol.moveCount}
            </span>
            <span className="flex-1 min-w-0 truncate">
              {sol.moveCount === 0 ? "solved" : sol.moves.join(" ")}
            </span>
            {sol.moveCount > 0 && (
              <button
                onClick={() => handleCopy(sol.face, sol.moves)}
                className="p-0.5 rounded hover:bg-secondary/80 transition-colors shrink-0"
                title="Copy"
              >
                {copied === sol.face ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground/50" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Pyraminx V Analysis ──────────────────────────────────────────────

function PyraminxPanel({ scramble }: { scramble: string }) {
  const result = useMemo(() => analyzePyraminx(scramble), [scramble])

  return (
    <div className="space-y-2">
      {/* Tips */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Tips
        </span>
        <span className="text-xs font-mono">
          {result.solvedTipCount}/4 solved
        </span>
      </div>
      <div className="flex gap-2">
        {result.tips.map((t) => (
          <span
            key={t.axis}
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded",
              t.solved
                ? "bg-green-500/15 text-green-400"
                : "bg-muted-foreground/10 text-muted-foreground"
            )}
          >
            {t.axis}
          </span>
        ))}
      </div>

      {/* V Analysis */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Best V
        </span>
        <span
          className={cn(
            "text-xs font-mono font-bold px-1.5 py-0.5 rounded",
            result.bestVScore >= 3
              ? "bg-green-500/20 text-green-400"
              : result.bestVScore >= 2
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-muted-foreground/20 text-muted-foreground"
          )}
        >
          {result.bestV} ({result.bestVScore}/4)
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {result.vAnalysis.map((v) => (
          <span
            key={v.axis}
            className={cn(
              "text-xs font-mono px-1.5 py-0.5 rounded",
              v.axis === result.bestV
                ? "bg-primary/15 text-primary"
                : "bg-muted-foreground/10 text-muted-foreground"
            )}
          >
            {v.axis}: {v.score}/4
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────

export function SolverPanel({ scramble, event }: SolverPanelProps) {
  if (!scramble) return null

  if (event === "333" || event === "333oh") {
    return (
      <div className="px-4 pb-2 space-y-3">
        <div className="rounded-lg bg-secondary/30 p-3">
          <EOLinePanel scramble={scramble} />
        </div>
        <div className="rounded-lg bg-secondary/30 p-3">
          <RouxFBPanel scramble={scramble} />
        </div>
      </div>
    )
  }

  if (event === "222") {
    return (
      <div className="px-4 pb-2">
        <div className="rounded-lg bg-secondary/30 p-3">
          <Face2x2Panel scramble={scramble} />
        </div>
      </div>
    )
  }

  if (event === "pyram") {
    return (
      <div className="px-4 pb-2">
        <div className="rounded-lg bg-secondary/30 p-3">
          <PyraminxPanel scramble={scramble} />
        </div>
      </div>
    )
  }

  return null
}
