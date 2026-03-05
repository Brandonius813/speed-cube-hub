"use client"

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn, formatDuration } from "@/lib/utils"
import { STAT_OPTIONS, type Penalty, type TimerSolve as Solve } from "@/lib/timer/stats"
import type { DividerLabel } from "@/lib/timer/session-dividers"

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

function formatFeedTime(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

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

export type SolveSelectionMetric = "single" | "stat1" | "stat2"

type CurrentSessionLabel = {
  title: string
  date: string | null
}

interface SolveListPanelProps {
  rows: SolveListRow[]
  totalCount: number
  rangeStart: number
  rangeEnd: number
  scrollResetKey: string
  frozen?: boolean
  stats: SolveStats
  statCols: [string, string]
  selectedId: string | null
  selectedMetric: SolveSelectionMetric
  selectedSolve: Solve | null
  savedSolveCount?: number
  groupBoundaries?: Set<number>
  groupDividerLabels?: Map<number, DividerLabel>
  currentSessionLabel?: CurrentSessionLabel | null
  currentSolveCount?: number
  showAllStats?: boolean
  onSetSelectedId: (id: string | null) => void
  onSelectSolveCell: (id: string, metric: SolveSelectionMetric) => void
  onSetPenalty: (id: string, p: Penalty) => void
  onDeleteSolve: (id: string) => void
  onShareSolve?: (solve: Solve) => void
  onUpdateStatCol: (idx: 0 | 1, key: string) => void
  onRangeChange: (next: { start: number; end: number }) => void
}

const ROW_HEIGHT = 30
const DIVIDER_GAP = 24
const OVERSCAN = 14

function countBoundariesAtOrBefore(boundaries: number[], rowIndex: number): number {
  let low = 0
  let high = boundaries.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (boundaries[mid] <= rowIndex) low = mid + 1
    else high = mid
  }
  return low
}

function findRowForOffset(
  offset: number,
  totalRows: number,
  getPrefixHeight: (rowIndex: number) => number
): number {
  if (totalRows <= 0) return 0
  let low = 0
  let high = totalRows
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (getPrefixHeight(mid) <= offset) low = mid + 1
    else high = mid
  }
  return Math.max(0, Math.min(totalRows - 1, low - 1))
}

export const SolveListPanel = memo(function SolveListPanel({
  rows,
  totalCount,
  rangeStart,
  rangeEnd,
  scrollResetKey,
  frozen = false,
  stats,
  statCols,
  selectedId,
  selectedMetric,
  selectedSolve,
  savedSolveCount = 0,
  groupBoundaries,
  groupDividerLabels,
  currentSessionLabel,
  currentSolveCount,
  showAllStats = false,
  onSetSelectedId,
  onSelectSolveCell,
  onSetPenalty,
  onDeleteSolve,
  onShareSolve,
  onUpdateStatCol,
  onRangeChange,
}: SolveListPanelProps) {
  const sp = (e: React.PointerEvent) => e.stopPropagation()
  const listRef = useRef<HTMLDivElement | null>(null)
  const rangeRef = useRef({ start: -1, end: -1 })
  const [openSessionStats, setOpenSessionStats] = useState<DividerLabel | null>(null)
  const sortedBoundaries = useMemo(
    () =>
      groupBoundaries
        ? [...groupBoundaries].sort((a, b) => a - b)
        : [],
    [groupBoundaries]
  )
  const getPrefixHeight = useCallback(
    (rowIndex: number) =>
      rowIndex * ROW_HEIGHT +
      countBoundariesAtOrBefore(sortedBoundaries, rowIndex) * DIVIDER_GAP,
    [sortedBoundaries]
  )
  const totalHeight = useMemo(
    () => getPrefixHeight(totalCount),
    [getPrefixHeight, totalCount]
  )

  const emitRange = useCallback(() => {
    if (!listRef.current || frozen) return
    const el = listRef.current
    const viewHeight = el.clientHeight
    const firstVisible = findRowForOffset(
      el.scrollTop,
      totalCount,
      getPrefixHeight
    )
    const lastVisible = findRowForOffset(
      el.scrollTop + viewHeight,
      totalCount,
      getPrefixHeight
    )
    const start = Math.max(0, firstVisible - OVERSCAN)
    const end = Math.min(totalCount, lastVisible + 1 + OVERSCAN)
    if (start === rangeRef.current.start && end === rangeRef.current.end) return
    rangeRef.current = { start, end }
    onRangeChange({ start, end })
  }, [frozen, getPrefixHeight, onRangeChange, totalCount])

  useEffect(() => {
    rangeRef.current = { start: -1, end: -1 }
    if (!listRef.current) return
    listRef.current.scrollTop = 0
    emitRange()
  }, [emitRange, scrollResetKey])

  useEffect(() => {
    emitRange()
  }, [emitRange, totalCount, totalHeight])

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

  const topSpacer = getPrefixHeight(rangeStart)
  const bottomSpacer = Math.max(0, totalHeight - getPrefixHeight(rangeEnd))
  const last = totalCount > 0 ? rows[0]?.solve ?? null : null
  const closeSessionStats = useCallback(() => setOpenSessionStats(null), [])
  const openStatsForDivider = useCallback(
    (label: DividerLabel | null) => {
      if (!label) return
      setOpenSessionStats(label)
    },
    []
  )

  return (
    <div
      className="w-full lg:w-56 xl:w-64 shrink-0 min-h-0 overflow-hidden border-t lg:border-t-0 lg:border-r border-border flex flex-col order-last lg:order-first"
      onPointerDown={sp}
    >
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <table className="w-full">
          <thead>
            <tr className="text-foreground">
              <th className="text-left font-normal pb-1.5"></th>
              <th className="text-right font-sans text-[10px] uppercase tracking-widest font-normal pb-1.5 pr-2">cur</th>
              <th className="text-right font-sans text-[10px] uppercase tracking-widest font-normal pb-1.5">best</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-sans text-[11px] text-foreground py-0.5 pr-2">single</td>
              <td className="text-right pr-2 font-mono text-[13px] text-foreground font-medium">{last ? fmtSolve(last) : "—"}</td>
              <td className="text-right font-mono text-[13px] text-foreground">{D(stats.best)}</td>
            </tr>
            {stats.milestoneRows.map((row) => (
              <tr key={row.key}>
                <td className="font-sans text-[11px] text-foreground py-0.5 pr-2">{row.key}</td>
                <td className="text-right pr-2 font-mono text-[13px] text-foreground">{D(row.cur)}</td>
                <td className="text-right font-mono text-[13px] text-foreground">{D(row.best)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between border-t border-border mt-2 pt-1.5">
          <span className="font-sans text-[10px] uppercase tracking-wider text-foreground">
            Count <span className="font-mono normal-case tracking-normal text-[12px] text-foreground">{currentSolveCount ?? totalCount}</span>
            {savedSolveCount > 0 && (
              <span className="font-mono normal-case tracking-normal text-[10px] text-foreground/80 ml-1">/{totalCount}</span>
            )}
          </span>
          <span className="font-sans text-[10px] uppercase tracking-wider text-foreground">
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
                  : "border-border text-foreground hover:border-yellow-500 hover:text-yellow-400"
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
                  : "border-border text-foreground hover:border-red-500 hover:text-red-400"
              )}
              onClick={() => onSetPenalty(selectedSolve.id, selectedSolve.penalty === "DNF" ? null : "DNF")}
            >
              DNF
            </button>
            <button
              className="text-[11px] font-sans px-2 py-1 rounded border border-border text-foreground hover:border-destructive hover:text-destructive transition-colors"
              onClick={() => onDeleteSolve(selectedSolve.id)}
            >
              Del
            </button>
            {onShareSolve && (
              <button
                className="text-[11px] font-sans px-2 py-1 rounded border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
                onClick={() => onShareSolve(selectedSolve)}
              >
                Share
              </button>
            )}
            <button
              className="text-[11px] font-sans px-2 py-1 rounded border border-border text-foreground hover:text-foreground transition-colors"
              onClick={() => onSetSelectedId(null)}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {currentSessionLabel && (
        <div className="px-2 py-1 border-b border-border bg-background">
          <div className="flex items-center gap-1.5">
            <div className="h-px flex-1 bg-primary/25" />
            <span className="max-w-[13.5rem] truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-[2px] text-[9px] font-sans uppercase tracking-wider text-primary/90">
              {currentSessionLabel.title}
              {currentSessionLabel.date ? ` · ${currentSessionLabel.date}` : ""}
            </span>
            <div className="h-px flex-1 bg-primary/25" />
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ overflowAnchor: "none" }}
      >
        <table className="w-full text-[12px] font-mono border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="text-foreground border-b border-border">
              <th className="pr-1.5 py-1.5 w-[4.25rem] font-normal"></th>
              <th className="text-right pr-1.5 py-1.5 font-sans text-[10px] font-normal uppercase tracking-wider text-foreground">single</th>
              {([0, 1] as const).map((idx) => (
                <th key={idx} className={cn("py-1 font-normal text-right", idx === 0 ? "pr-1.5" : "pr-2")}>
                  <select
                    className="bg-transparent text-[10px] font-sans uppercase tracking-wider text-foreground hover:text-foreground cursor-pointer border-none outline-none appearance-none w-full text-right"
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

            {rows.map((row, windowIdx) => {
              const displayIdx = rangeStart + windowIdx
              const isBoundary = groupBoundaries?.has(displayIdx)
              const dividerLabel = isBoundary
                ? groupDividerLabels?.get(displayIdx) ?? null
                : null
              const isSaved = !!row.solve.group
              // Map to stats index:
              // - fallback mode: stats run over all solves
              // - normal mode: stats run on current (ungrouped) solves only
              let statsIdx = -1
              if (showAllStats) {
                statsIdx = row.solveIndex
              } else if (!isSaved) {
                statsIdx = savedSolveCount > 0
                  ? row.solveIndex - savedSolveCount
                  : row.solveIndex
              }

              return (
                <Fragment key={row.solve.id}>
                  {isBoundary && (
                    <tr aria-hidden="true">
                      <td colSpan={4} className="relative p-0" style={{ height: `${DIVIDER_GAP}px` }}>
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-primary/20" />
                        {dividerLabel && (
                          <button
                            type="button"
                            className="absolute top-1/2 left-1 z-20 inline-block -translate-y-1/2 max-w-[10.5rem] truncate rounded-full border border-primary/50 bg-background px-2 py-[1px] text-[10px] font-sans uppercase tracking-wider text-foreground hover:border-primary/70 hover:bg-primary/10 transition-colors"
                            title={`${dividerLabel.title}${dividerLabel.date ? ` · ${dividerLabel.date}` : ""}`}
                            onClick={(eventClick) => {
                              eventClick.stopPropagation()
                              openStatsForDivider(dividerLabel)
                            }}
                          >
                            {dividerLabel.title}
                            {dividerLabel.date ? ` · ${dividerLabel.date}` : ""}
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={cn(
                      "hover:bg-muted/30 transition-colors cursor-pointer",
                      selectedId === row.solve.id && "bg-muted/40"
                    )}
                    onClick={() => onSelectSolveCell(row.solve.id, "single")}
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    <td className="text-right pr-1.5 py-0.5 text-foreground/90 font-mono text-[11px]">
                      {row.displayNumber}
                    </td>
                    <td
                      className={cn(
                        "text-right pr-1.5 py-0.5 font-mono text-[13px] text-foreground transition-colors",
                        selectedId === row.solve.id &&
                          selectedMetric === "single" &&
                          "text-indigo-300 bg-indigo-500/15"
                      )}
                      onClick={(eventClick) => {
                        eventClick.stopPropagation()
                        onSelectSolveCell(row.solve.id, "single")
                      }}
                    >
                      {fmtSolve(row.solve)}
                    </td>
                    <td
                      className={cn(
                        "text-right pr-1.5 py-0.5 text-foreground font-mono text-[11px] transition-colors",
                        selectedId === row.solve.id &&
                          selectedMetric === "stat1" &&
                          "text-indigo-300 bg-indigo-500/15"
                      )}
                      onClick={(eventClick) => {
                        eventClick.stopPropagation()
                        onSelectSolveCell(row.solve.id, "stat1")
                      }}
                    >
                      {statsIdx >= 0 ? D(stats.rolling1[statsIdx] ?? null) : "—"}
                    </td>
                    <td
                      className={cn(
                        "text-right pr-2 py-0.5 text-foreground font-mono text-[11px] transition-colors",
                        selectedId === row.solve.id &&
                          selectedMetric === "stat2" &&
                          "text-indigo-300 bg-indigo-500/15"
                      )}
                      onClick={(eventClick) => {
                        eventClick.stopPropagation()
                        onSelectSolveCell(row.solve.id, "stat2")
                      }}
                    >
                      {statsIdx >= 0 ? D(stats.rolling2[statsIdx] ?? null) : "—"}
                    </td>
                  </tr>
                </Fragment>
              )
            })}

            {bottomSpacer > 0 && (
              <tr>
                <td colSpan={4} style={{ height: `${bottomSpacer}px` }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openSessionStats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeSessionStats}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-2xl"
            onClick={(eventClick) => eventClick.stopPropagation()}
          >
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Session Stats</p>
              <p className="font-sans text-sm text-foreground">
                {openSessionStats.title}
                {openSessionStats.date ? ` · ${openSessionStats.date}` : ""}
              </p>
              {openSessionStats.practiceType && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {openSessionStats.practiceType}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-muted/20 p-3">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Solves</p>
                <p className="font-mono text-base text-foreground">{openSessionStats.stats.solveCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Duration</p>
                <p className="font-mono text-base text-foreground">
                  {openSessionStats.stats.durationMinutes !== null
                    ? formatDuration(openSessionStats.stats.durationMinutes)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Best</p>
                <p className="font-mono text-base text-foreground">
                  {formatFeedTime(openSessionStats.stats.bestSeconds)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Avg</p>
                <p className="font-mono text-base text-foreground">
                  {formatFeedTime(openSessionStats.stats.avgSeconds)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">DNF</p>
                <p className="font-mono text-base text-foreground">{openSessionStats.stats.dnfCount}</p>
              </div>
            </div>

            <button
              type="button"
              className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={closeSessionStats}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
