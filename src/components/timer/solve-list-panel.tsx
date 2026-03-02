"use client"

import { cn } from "@/lib/utils"
import { STAT_OPTIONS, type Penalty, type TimerSolve as Solve } from "@/lib/timer/stats"

function fmt(ms: number, dec = 2): string {
  const s = ms / 1000
  if (s < 60) return s.toFixed(dec)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(dec).padStart(dec + 3, "0")}`
}

function fmtSolve(s: Solve): string {
  if (s.penalty === "DNF") return "DNF"
  const ms = s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
  return fmt(ms) + (s.penalty === "+2" ? "+" : "")
}

const D = (v: number | null) => (v !== null ? fmt(v) : "—")

interface SolveStats {
  best: number | null
  mean: number | null
  milestoneRows: { key: string; cur: number | null; best: number | null }[]
  rolling1: (number | null)[]
  rolling2: (number | null)[]
}

interface SolveListPanelProps {
  solves: Solve[]
  stats: SolveStats
  statCols: [string, string]
  selectedId: string | null
  onSetSelectedId: (id: string | null) => void
  onSetPenalty: (id: string, p: Penalty) => void
  onDeleteSolve: (id: string) => void
  onUpdateStatCol: (idx: 0 | 1, key: string) => void
}

export function SolveListPanel({
  solves,
  stats,
  statCols,
  selectedId,
  onSetSelectedId,
  onSetPenalty,
  onDeleteSolve,
  onUpdateStatCol,
}: SolveListPanelProps) {
  const last = solves[solves.length - 1]
  const sp = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div
      className="w-full lg:w-56 xl:w-64 shrink-0 border-t lg:border-t-0 lg:border-r border-border flex flex-col order-last lg:order-first"
      onPointerDown={sp}
    >
      {/* Stats table — auto-grows as milestones are reached */}
      <div className="px-3 pt-3 pb-2 border-b border-border text-xs font-mono">
        <table className="w-full">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-normal pb-1"></th>
              <th className="text-right font-normal pb-1 pr-2">cur</th>
              <th className="text-right font-normal pb-1">best</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-muted-foreground py-0.5 pr-2">single</td>
              <td className="text-right pr-2">{last ? fmtSolve(last) : "—"}</td>
              <td className="text-right">{D(stats.best)}</td>
            </tr>
            {stats.milestoneRows.map((row) => (
              <tr key={row.key}>
                <td className="text-muted-foreground py-0.5 pr-2">{row.key}</td>
                <td className="text-right pr-2">{D(row.cur)}</td>
                <td className="text-right">{D(row.best)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between text-muted-foreground border-t border-border mt-2 pt-1.5">
          <span>count: {solves.length}</span>
          <span>mean: {D(stats.mean)}</span>
        </div>
      </div>

      {/* Solve list — 4-column grid: # | single | stat1 | stat2 */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="text-muted-foreground border-b border-border">
              <th className="pr-1.5 py-1.5 w-7 font-normal"></th>
              <th className="text-right pr-1.5 py-1.5 font-normal">single</th>
              {([0, 1] as const).map((idx) => (
                <th key={idx} className={cn("py-1 font-normal text-right", idx === 0 ? "pr-1.5" : "pr-2")}>
                  <select
                    className="bg-transparent text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer border-none outline-none appearance-none w-full text-right"
                    value={statCols[idx]}
                    onChange={(e) => onUpdateStatCol(idx, e.target.value)}
                    title="Click to change"
                  >
                    {STAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...solves].reverse().map((s, i) => {
              const idx = solves.length - 1 - i
              return (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="text-right pr-1.5 py-0.5 text-muted-foreground">
                    {solves.length - i}
                  </td>
                  {selectedId === s.id ? (
                    <>
                      <td className="text-right pr-1 py-0.5">{fmtSolve(s)}</td>
                      <td colSpan={2} className="py-0.5">
                        <div className="flex gap-0.5 justify-end pr-1.5">
                          <button
                            className="px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 shrink-0"
                            onClick={() => onSetPenalty(s.id, s.penalty === "+2" ? null : "+2")}
                          >+2</button>
                          <button
                            className="px-1 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0"
                            onClick={() => onSetPenalty(s.id, s.penalty === "DNF" ? null : "DNF")}
                          >DNF</button>
                          <button
                            className="px-1 py-0.5 rounded bg-destructive/20 text-destructive shrink-0"
                            onClick={() => onDeleteSolve(s.id)}
                          >Del</button>
                          <button
                            className="px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0"
                            onClick={() => onSetSelectedId(null)}
                          >✕</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-right pr-1.5 py-0.5">
                        <button
                          className="hover:text-primary transition-colors w-full text-right"
                          onClick={() => onSetSelectedId(s.id)}
                        >
                          {fmtSolve(s)}
                        </button>
                      </td>
                      <td className="text-right pr-1.5 py-0.5 text-muted-foreground/70">
                        {D(stats.rolling1[idx])}
                      </td>
                      <td className="text-right pr-2 py-0.5 text-muted-foreground/70">
                        {D(stats.rolling2[idx])}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
