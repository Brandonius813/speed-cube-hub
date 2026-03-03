"use client"

import { memo, useCallback, useEffect, useRef } from "react"
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

export interface SolveStats {
  best: number | null
  mean: number | null
  milestoneRows: { key: string; cur: number | null; best: number | null }[]
  rolling1: (number | null)[]
  rolling2: (number | null)[]
}

export type SolveListRow = {
  solve: Solve
  solveIndex: number
  displayNumber: number
}

interface SolveListPanelProps {
  rows: SolveListRow[]
  totalCount: number
  rangeStart: number
  rangeEnd: number
  scrollOffset: number
  frozen?: boolean
  stats: SolveStats
  statCols: [string, string]
  selectedId: string | null
  selectedSolve: Solve | null
  onSetSelectedId: (id: string | null) => void
  onSetPenalty: (id: string, p: Penalty) => void
  onDeleteSolve: (id: string) => void
  onUpdateStatCol: (idx: 0 | 1, key: string) => void
  onRangeChange: (next: { start: number; end: number; scrollOffset: number }) => void
}

const ROW_HEIGHT = 28
const OVERSCAN = 14

export const SolveListPanel = memo(function SolveListPanel({
  rows,
  totalCount,
  rangeStart,
  rangeEnd,
  scrollOffset,
  frozen = false,
  stats,
  statCols,
  selectedId,
  selectedSolve,
  onSetSelectedId,
  onSetPenalty,
  onDeleteSolve,
  onUpdateStatCol,
  onRangeChange,
}: SolveListPanelProps) {
  const sp = (e: React.PointerEvent) => e.stopPropagation()
  const listRef = useRef<HTMLDivElement | null>(null)
  const rangeRef = useRef({ start: -1, end: -1 })

  const emitRange = useCallback(() => {
    if (!listRef.current || frozen) return
    const el = listRef.current
    const viewHeight = el.clientHeight
    const firstVisible = Math.floor(el.scrollTop / ROW_HEIGHT)
    const visibleCount = Math.max(1, Math.ceil(viewHeight / ROW_HEIGHT))
    const start = Math.max(0, firstVisible - OVERSCAN)
    const end = Math.min(totalCount, firstVisible + visibleCount + OVERSCAN)
    if (start === rangeRef.current.start && end === rangeRef.current.end) return
    rangeRef.current = { start, end }
    onRangeChange({ start, end, scrollOffset: el.scrollTop })
  }, [frozen, onRangeChange, totalCount])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = scrollOffset
    emitRange()
  }, [emitRange, scrollOffset, totalCount])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => emitRange()
    const onResize = () => emitRange()
    el.addEventListener("scroll", onScroll)
    window.addEventListener("resize", onResize)
    return () => {
      el.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
    }
  }, [emitRange])

  const topSpacer = rangeStart * ROW_HEIGHT
  const bottomSpacer = Math.max(0, totalCount - rangeEnd) * ROW_HEIGHT
  const last = totalCount > 0 ? rows[0]?.solve ?? null : null

  return (
    <div
      className="w-full lg:w-56 xl:w-64 shrink-0 border-t lg:border-t-0 lg:border-r border-border flex flex-col order-last lg:order-first"
      onPointerDown={sp}
    >
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <table className="w-full">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-normal pb-1.5"></th>
              <th className="text-right font-sans text-[10px] uppercase tracking-widest font-normal pb-1.5 pr-2">cur</th>
              <th className="text-right font-sans text-[10px] uppercase tracking-widest font-normal pb-1.5">best</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-sans text-[11px] text-muted-foreground py-0.5 pr-2">single</td>
              <td className="text-right pr-2 font-mono text-[13px] text-foreground font-medium">{last ? fmtSolve(last) : "—"}</td>
              <td className="text-right font-mono text-[13px] text-muted-foreground">{D(stats.best)}</td>
            </tr>
            {stats.milestoneRows.map((row) => (
              <tr key={row.key}>
                <td className="font-sans text-[11px] text-muted-foreground py-0.5 pr-2">{row.key}</td>
                <td className="text-right pr-2 font-mono text-[13px] text-foreground">{D(row.cur)}</td>
                <td className="text-right font-mono text-[13px] text-muted-foreground">{D(row.best)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between border-t border-border mt-2 pt-1.5">
          <span className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
            Count <span className="font-mono normal-case tracking-normal text-[12px] text-foreground">{totalCount}</span>
          </span>
          <span className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
            Mean <span className="font-mono normal-case tracking-normal text-[12px] text-foreground">{D(stats.mean)}</span>
          </span>
        </div>
        {selectedSolve && (
          <div className="mt-2 flex gap-1.5">
            <button
              className={cn(
                "text-[11px] font-sans px-2 py-1 rounded border transition-colors",
                selectedSolve.penalty === "+2"
                  ? "bg-yellow-500 text-black border-yellow-500"
                  : "border-border text-muted-foreground hover:border-yellow-500 hover:text-yellow-400"
              )}
              onClick={() => onSetPenalty(selectedSolve.id, selectedSolve.penalty === "+2" ? null : "+2")}
            >
              +2
            </button>
            <button
              className={cn(
                "text-[11px] font-sans px-2 py-1 rounded border transition-colors",
                selectedSolve.penalty === "DNF"
                  ? "bg-red-500 text-white border-red-500"
                  : "border-border text-muted-foreground hover:border-red-500 hover:text-red-400"
              )}
              onClick={() => onSetPenalty(selectedSolve.id, selectedSolve.penalty === "DNF" ? null : "DNF")}
            >
              DNF
            </button>
            <button
              className="text-[11px] font-sans px-2 py-1 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
              onClick={() => onDeleteSolve(selectedSolve.id)}
            >
              Del
            </button>
            <button
              className="text-[11px] font-sans px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onSetSelectedId(null)}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        <table className="w-full text-[12px] font-mono border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="text-muted-foreground border-b border-border">
              <th className="pr-1.5 py-1.5 w-7 font-normal"></th>
              <th className="text-right pr-1.5 py-1.5 font-sans text-[10px] font-normal uppercase tracking-wider text-muted-foreground">single</th>
              {([0, 1] as const).map((idx) => (
                <th key={idx} className={cn("py-1 font-normal text-right", idx === 0 ? "pr-1.5" : "pr-2")}>
                  <select
                    className="bg-transparent text-[10px] font-sans uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer border-none outline-none appearance-none w-full text-right"
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
            {topSpacer > 0 && (
              <tr>
                <td colSpan={4} style={{ height: `${topSpacer}px` }} />
              </tr>
            )}

            {rows.map((row) => (
              <tr
                key={row.solve.id}
                className={cn(
                  "hover:bg-muted/30 transition-colors cursor-pointer",
                  selectedId === row.solve.id && "bg-muted/40"
                )}
                onClick={() => onSetSelectedId(row.solve.id)}
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                <td className="text-right pr-1.5 py-0.5 text-muted-foreground/50 font-mono text-[11px]">
                  {row.displayNumber}
                </td>
                <td className="text-right pr-1.5 py-0.5 font-mono text-[13px]">
                  {fmtSolve(row.solve)}
                </td>
                <td className="text-right pr-1.5 py-0.5 text-muted-foreground/60 font-mono text-[11px]">
                  {D(stats.rolling1[row.solveIndex] ?? null)}
                </td>
                <td className="text-right pr-2 py-0.5 text-muted-foreground/60 font-mono text-[11px]">
                  {D(stats.rolling2[row.solveIndex] ?? null)}
                </td>
              </tr>
            ))}

            {bottomSpacer > 0 && (
              <tr>
                <td colSpan={4} style={{ height: `${bottomSpacer}px` }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
})

