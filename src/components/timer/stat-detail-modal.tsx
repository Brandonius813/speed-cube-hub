"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check } from "lucide-react"
import { formatTimeMs, getEffectiveTime } from "@/lib/timer/averages"
import { cn } from "@/lib/utils"
import type { Solve } from "@/lib/types"

export type StatDetailInfo = {
  label: string
  column: "current" | "best"
}

type StatDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  info: StatDetailInfo | null
  solves: Solve[]
  onSolveClick: (solve: Solve) => void
}

export function StatDetailModal({
  isOpen,
  onClose,
  info,
  solves,
  onSolveClick,
}: StatDetailModalProps) {
  const [copied, setCopied] = useState(false)

  // Reset copied state when modal opens/closes
  useEffect(() => {
    setCopied(false)
  }, [isOpen, info])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen || !info || solves.length === 0) return null

  const { label, column } = info
  const n = parseWindowSize(label)
  const isMean = label.startsWith("mo")
  const isSingle = label === "single"

  // Get the window of solves for this stat
  const solveWindow = isSingle
    ? getBestSingleWindow(solves)
    : column === "current"
      ? getCurrentWindow(solves, n)
      : isMean
        ? getBestMoNWindow(solves, n)
        : getBestAoNWindow(solves, n)

  if (solveWindow.length === 0) return null

  // Compute the average/mean value and identify trimmed solves
  const times = solveWindow.map(getEffectiveTime)
  let displayValue: string
  let trimmedIndices = new Set<number>()
  let sigma: number | null = null

  if (isSingle) {
    const best = Math.min(...times.filter((t) => t !== Infinity))
    displayValue = best === Infinity ? "DNF" : formatTimeMs(best)
  } else if (isMean) {
    // Mean of N — no trimming
    if (times.some((t) => t === Infinity)) {
      displayValue = "DNF"
    } else {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      displayValue = formatTimeMs(avg)
      sigma = computeStdDev(times)
    }
  } else {
    // Average of N — trim best + worst
    const dnfCount = times.filter((t) => t === Infinity).length
    if (dnfCount > 1) {
      displayValue = "DNF"
    } else {
      const sorted = [...times]
        .map((t, i) => ({ time: t, index: i }))
        .sort((a, b) => a.time - b.time)
      trimmedIndices = new Set([sorted[0].index, sorted[sorted.length - 1].index])
      const trimmedTimes = sorted.slice(1, -1).map((s) => s.time)
      if (trimmedTimes.some((t) => t === Infinity)) {
        displayValue = "DNF"
      } else {
        const avg = Math.round(
          trimmedTimes.reduce((a, b) => a + b, 0) / trimmedTimes.length
        )
        displayValue = formatTimeMs(avg)
        sigma = computeStdDev(trimmedTimes)
      }
    }
  }

  const headerLabel = `${column === "best" ? "Best " : ""}${label}`

  const handleCopy = async () => {
    const text = buildCsTimerText(headerLabel, displayValue, solveWindow, trimmedIndices)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium truncate">{headerLabel}</span>
              <span className="font-mono text-sm font-bold tabular-nums">
                {displayValue}
              </span>
              {sigma !== null && (
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  σ {formatTimeMs(sigma)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-secondary/80 transition-colors"
                title="Copy as text"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-secondary/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Solve list */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {solveWindow.map((solve, idx) => {
              const isTrimmed = trimmedIndices.has(idx)
              const effective = getEffectiveTime(solve)
              const isDNF = solve.penalty === "DNF"
              const isPlus2 = solve.penalty === "+2"
              const timeStr = isDNF ? "DNF" : formatTimeMs(effective)
              const display = isTrimmed ? `(${timeStr})` : timeStr

              return (
                <button
                  key={solve.id}
                  onClick={() => {
                    onClose()
                    onSolveClick(solve)
                  }}
                  className="flex items-center w-full gap-3 px-4 py-2 text-left hover:bg-secondary/30 transition-colors border-b border-border/20 last:border-b-0"
                >
                  <span className="text-[11px] text-muted-foreground/60 w-5 shrink-0 tabular-nums font-mono text-right">
                    {idx + 1}.
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums flex-1",
                      isDNF && "text-destructive",
                      isPlus2 && "text-yellow-400",
                      isTrimmed && "text-muted-foreground/60"
                    )}
                  >
                    {display}
                    {isPlus2 && !isTrimmed && (
                      <span className="text-[10px] ml-0.5">+</span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono truncate max-w-[140px]">
                    {solve.scramble?.slice(0, 30)}
                    {solve.scramble && solve.scramble.length > 30 ? "…" : ""}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Window extraction helpers ───────────────────────────────────────

function parseWindowSize(label: string): number {
  if (label === "single") return 1
  const match = label.match(/\d+/)
  return match ? parseInt(match[0], 10) : 5
}

function getCurrentWindow(solves: Solve[], n: number): Solve[] {
  if (solves.length < n) return []
  return solves.slice(-n)
}

function getBestSingleWindow(solves: Solve[]): Solve[] {
  const nonDnf = solves.filter((s) => s.penalty !== "DNF")
  if (nonDnf.length === 0) return []
  let best = nonDnf[0]
  for (const s of nonDnf) {
    if (getEffectiveTime(s) < getEffectiveTime(best)) best = s
  }
  return [best]
}

function getBestAoNWindow(solves: Solve[], n: number): Solve[] {
  if (solves.length < n) return []
  let bestAvg: number | null = null
  let bestWindow: Solve[] = []

  for (let i = n; i <= solves.length; i++) {
    const w = solves.slice(i - n, i)
    const times = w.map(getEffectiveTime)
    const dnfCount = times.filter((t) => t === Infinity).length
    if (dnfCount > 1) continue

    const sorted = [...times].sort((a, b) => a - b)
    const trimmed = sorted.slice(1, -1)
    if (trimmed.some((t) => t === Infinity)) continue

    const avg = Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
    if (bestAvg === null || avg < bestAvg) {
      bestAvg = avg
      bestWindow = w
    }
  }

  return bestWindow
}

function getBestMoNWindow(solves: Solve[], n: number): Solve[] {
  if (solves.length < n) return []
  let bestAvg: number | null = null
  let bestWindow: Solve[] = []

  for (let i = n; i <= solves.length; i++) {
    const w = solves.slice(i - n, i)
    const times = w.map(getEffectiveTime)
    if (times.some((t) => t === Infinity)) continue

    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    if (bestAvg === null || avg < bestAvg) {
      bestAvg = avg
      bestWindow = w
    }
  }

  return bestWindow
}

// ── Math helpers ────────────────────────────────────────────────────

function computeStdDev(timesMs: number[]): number | null {
  if (timesMs.length < 2) return null
  const mean = timesMs.reduce((a, b) => a + b, 0) / timesMs.length
  const variance =
    timesMs.reduce((acc, t) => acc + (t - mean) ** 2, 0) / (timesMs.length - 1)
  return Math.round(Math.sqrt(variance))
}

// ── Copy to clipboard in csTimer text format ────────────────────────

function buildCsTimerText(
  header: string,
  value: string,
  solves: Solve[],
  trimmedIndices: Set<number>
): string {
  const lines: string[] = [`${header}: ${value}`, ""]

  for (let i = 0; i < solves.length; i++) {
    const solve = solves[i]
    const effective = getEffectiveTime(solve)
    const isDNF = solve.penalty === "DNF"
    const timeStr = isDNF ? "DNF" : formatTimeMs(effective)
    const display = trimmedIndices.has(i) ? `(${timeStr})` : timeStr
    const scramble = solve.scramble ? `   ${solve.scramble}` : ""
    lines.push(`${i + 1}. ${display}${scramble}`)
  }

  return lines.join("\n")
}
