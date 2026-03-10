"use client"

import {
  Fragment,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { cn, formatDuration } from "@/lib/utils"
import { formatTimeMsCentiseconds } from "@/lib/timer/averages"
import { STAT_OPTIONS, type Penalty, type TimerSolve as Solve } from "@/lib/timer/stats"
import type { DividerLabel } from "@/lib/timer/session-dividers"

function fmtSolve(s: Solve): string {
  if (s.penalty === "DNF") return "DNF"
  const ms = s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
  return formatTimeMsCentiseconds(ms) + (s.penalty === "+2" ? "+" : "")
}

const D = (v: number | null) => (v !== null ? formatTimeMsCentiseconds(v) : "—")

function formatFeedTime(seconds: number | null): string {
  if (seconds === null) return "—"
  const formatted = formatTimeMsCentiseconds(seconds * 1000)
  return seconds >= 60 ? formatted : `${formatted}s`
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
export type SolveListTextSize = "md" | "lg" | "xl"

export type SolveListPanelHandle = {
  preserveScrollPosition: () => void
}

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
  sessionStats: SolveStats
  statCols: [string, string]
  latestSolve: Solve | null
  selectedId: string | null
  selectedMetric: SolveSelectionMetric
  selectedSolve: Solve | null
  savedSolveCount?: number
  groupBoundaries?: Set<number>
  groupDividerLabels?: Map<number, DividerLabel>
  currentSessionLabel?: CurrentSessionLabel | null
  currentSolveCount?: number
  showAllStats?: boolean
  textSize?: SolveListTextSize
  onSetSelectedId: (id: string | null) => void
  onOpenSolveDetail: (id: string) => void
  onSelectSolveCell: (id: string, metric: SolveSelectionMetric) => void
  onSetPenalty: (id: string, p: Penalty) => void
  onDeleteSolve: (id: string) => void
  onShareSolve?: (solve: Solve) => void
  onUpdateStatCol: (idx: 0 | 1, key: string) => void
  onRangeChange: (next: { start: number; end: number }) => void
}

const DIVIDER_GAP = 24
const OVERSCAN = 14
const ROW_HEIGHT_BY_SIZE: Record<SolveListTextSize, number> = {
  md: 34,
  lg: 38,
  xl: 42,
}

const PANEL_TEXT_CLASSES: Record<
  SolveListTextSize,
  {
    summaryHeader: string
    summaryLabel: string
    summaryValue: string
    footerHeader: string
    footerValue: string
    listHeader: string
    listIndex: string
    listValue: string
    listStat: string
    actionButton: string
  }
> = {
  md: {
    summaryHeader: "text-[11px] 2xl:text-[12px]",
    summaryLabel: "text-[12px] 2xl:text-[13px]",
    summaryValue: "text-[14px] 2xl:text-[15px]",
    footerHeader: "text-[11px] 2xl:text-[12px]",
    footerValue: "text-[13px] 2xl:text-[14px]",
    listHeader: "text-[11px]",
    listIndex: "text-[12px] 2xl:text-[13px]",
    listValue: "text-[14px] 2xl:text-[15px]",
    listStat: "text-[12px] 2xl:text-[13px]",
    actionButton: "text-[12px]",
  },
  lg: {
    summaryHeader: "text-[12px] 2xl:text-[13px]",
    summaryLabel: "text-[13px] 2xl:text-[14px]",
    summaryValue: "text-[15px] 2xl:text-[16px]",
    footerHeader: "text-[12px] 2xl:text-[13px]",
    footerValue: "text-[14px] 2xl:text-[15px]",
    listHeader: "text-[12px]",
    listIndex: "text-[13px] 2xl:text-[14px]",
    listValue: "text-[15px] 2xl:text-[16px]",
    listStat: "text-[13px] 2xl:text-[14px]",
    actionButton: "text-[13px]",
  },
  xl: {
    summaryHeader: "text-[13px] 2xl:text-[14px]",
    summaryLabel: "text-[14px] 2xl:text-[15px]",
    summaryValue: "text-[16px] 2xl:text-[17px]",
    footerHeader: "text-[13px] 2xl:text-[14px]",
    footerValue: "text-[15px] 2xl:text-[16px]",
    listHeader: "text-[13px]",
    listIndex: "text-[14px] 2xl:text-[15px]",
    listValue: "text-[16px] 2xl:text-[17px]",
    listStat: "text-[14px] 2xl:text-[15px]",
    actionButton: "text-[14px]",
  },
}

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

const SolveListPanelInner = forwardRef<SolveListPanelHandle, SolveListPanelProps>(function SolveListPanel({
  rows,
  totalCount,
  rangeStart,
  rangeEnd,
  scrollResetKey,
  frozen = false,
  stats,
  sessionStats,
  statCols,
  latestSolve,
  selectedId,
  selectedMetric,
  selectedSolve,
  savedSolveCount = 0,
  groupBoundaries,
  groupDividerLabels,
  currentSessionLabel,
  showAllStats = false,
  textSize = "md",
  onSetSelectedId,
  onOpenSolveDetail,
  onSelectSolveCell,
  onSetPenalty,
  onDeleteSolve,
  onShareSolve,
  onUpdateStatCol,
  onRangeChange,
}, ref) {
  const sp = (e: React.PointerEvent) => e.stopPropagation()
  const listRef = useRef<HTMLDivElement | null>(null)
  const rangeRef = useRef({ start: -1, end: -1 })
  const pendingScrollTopRef = useRef<number | null>(null)
  const [openSessionStats, setOpenSessionStats] = useState<DividerLabel | null>(null)
  const sortedBoundaries = useMemo(
    () =>
      groupBoundaries
        ? [...groupBoundaries].sort((a, b) => a - b)
        : [],
    [groupBoundaries]
  )
  const rowHeight = ROW_HEIGHT_BY_SIZE[textSize]
  const textClasses = PANEL_TEXT_CLASSES[textSize]
  const getPrefixHeight = useCallback(
    (rowIndex: number) =>
      rowIndex * rowHeight +
      countBoundariesAtOrBefore(sortedBoundaries, rowIndex) * DIVIDER_GAP,
    [rowHeight, sortedBoundaries]
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

  useImperativeHandle(ref, () => ({
    preserveScrollPosition() {
      pendingScrollTopRef.current = listRef.current?.scrollTop ?? 0
    },
  }), [])

  useEffect(() => {
    rangeRef.current = { start: -1, end: -1 }
    if (!listRef.current) return
    listRef.current.scrollTop = 0
    emitRange()
  }, [emitRange, scrollResetKey])

  useEffect(() => {
    emitRange()
  }, [emitRange, totalCount, totalHeight])

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el || pendingScrollTopRef.current === null) return
    el.scrollTop = pendingScrollTopRef.current
    pendingScrollTopRef.current = null
    emitRange()
  }, [emitRange, rows, totalCount])

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
  const last = latestSolve
  const closeSessionStats = useCallback(() => setOpenSessionStats(null), [])
  const openStatsForDivider = useCallback(
    (label: DividerLabel | null) => {
      if (!label) return
      setOpenSessionStats(label)
    },
    []
  )
  const sessionBestByKey = useMemo(
    () => new Map(sessionStats.milestoneRows.map((row) => [row.key, row.best])),
    [sessionStats.milestoneRows]
  )

  return (
    <div
      className="w-full lg:w-72 xl:w-80 shrink-0 min-h-0 overflow-hidden border-t lg:border-t-0 lg:border-r border-border flex flex-col order-last lg:order-first"
      onPointerDown={sp}
    >
      <div className="px-4 pt-3.5 pb-2.5 border-b border-border">
        <table className="w-full">
          <thead>
            <tr className="text-foreground">
              <th className="text-left font-normal pb-2"></th>
              <th className={cn("text-right font-sans uppercase tracking-widest font-normal pb-2 pr-2", textClasses.summaryHeader)}>current</th>
              <th className={cn("text-right font-sans uppercase tracking-widest font-normal pb-2 pr-2 leading-tight", textClasses.summaryHeader)}>
                <span className="block">all-time</span>
                <span className="block">best</span>
              </th>
              <th className={cn("text-right font-sans uppercase tracking-widest font-normal pb-2 leading-tight", textClasses.summaryHeader)}>
                <span className="block">session</span>
                <span className="block">best</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cn("font-sans text-foreground py-1 pr-2", textClasses.summaryLabel)}>single</td>
              <td className={cn("text-right pr-2 font-mono text-foreground font-medium", textClasses.summaryValue)}>{last ? fmtSolve(last) : "—"}</td>
              <td className={cn("text-right pr-2 font-mono text-foreground", textClasses.summaryValue)}>{D(stats.best)}</td>
              <td className={cn("text-right font-mono text-foreground", textClasses.summaryValue)}>{D(sessionStats.best)}</td>
            </tr>
            {stats.milestoneRows.map((row) => (
              <tr key={row.key}>
                <td className={cn("font-sans text-foreground py-1 pr-2", textClasses.summaryLabel)}>{row.key}</td>
                <td className={cn("text-right pr-2 font-mono text-foreground", textClasses.summaryValue)}>{D(row.cur)}</td>
                <td className={cn("text-right pr-2 font-mono text-foreground", textClasses.summaryValue)}>{D(row.best)}</td>
                <td className={cn("text-right font-mono text-foreground", textClasses.summaryValue)}>{D(sessionBestByKey.get(row.key) ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-border pt-2">
          <span className={cn("font-sans uppercase tracking-wider text-foreground", textClasses.footerHeader)}>
            Count <span className={cn("font-mono normal-case tracking-normal text-foreground", textClasses.footerValue)}>{totalCount}</span>
          </span>
          <span className={cn("font-sans uppercase tracking-wider text-foreground", textClasses.footerHeader)}>
            All-Time Mean <span className={cn("font-mono normal-case tracking-normal text-foreground", textClasses.footerValue)}>{D(stats.mean)}</span>
          </span>
          <span className={cn("font-sans uppercase tracking-wider text-foreground", textClasses.footerHeader)}>
            Session Mean <span className={cn("font-mono normal-case tracking-normal text-foreground", textClasses.footerValue)}>{D(sessionStats.mean)}</span>
          </span>
        </div>
        {selectedSolve && (
          <div className="mt-2.5 flex gap-2">
            <button
              className={cn(
                textClasses.actionButton,
                "font-sans px-2.5 py-1.5 rounded border transition-colors",
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
                textClasses.actionButton,
                "font-sans px-2.5 py-1.5 rounded border transition-colors",
                selectedSolve.penalty === "DNF"
                  ? "bg-red-500 text-white border-red-500"
                  : "border-border text-foreground hover:border-red-500 hover:text-red-400"
              )}
              onClick={() => onSetPenalty(selectedSolve.id, selectedSolve.penalty === "DNF" ? null : "DNF")}
            >
              DNF
            </button>
            <button
              className={cn(textClasses.actionButton, "font-sans px-2.5 py-1.5 rounded border border-border text-foreground hover:border-destructive hover:text-destructive transition-colors")}
              onClick={() => onDeleteSolve(selectedSolve.id)}
            >
              Del
            </button>
            {onShareSolve && (
              <button
                className={cn(textClasses.actionButton, "font-sans px-2.5 py-1.5 rounded border border-border text-foreground hover:border-primary hover:text-primary transition-colors")}
                onClick={() => onShareSolve(selectedSolve)}
              >
                Share
              </button>
            )}
            <button
              className={cn(textClasses.actionButton, "font-sans px-2.5 py-1.5 rounded border border-border text-foreground hover:text-foreground transition-colors")}
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
            <span className="max-w-[14.5rem] truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-[2px] text-[10px] font-sans uppercase tracking-wider text-primary/90">
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
        <table className="w-full text-[13px] font-mono border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="text-foreground border-b border-border">
              <th className={cn("pr-1.5 py-2 w-[4.25rem] font-normal", textClasses.listHeader)}></th>
              <th className={cn("text-right pr-1.5 py-2 font-sans font-normal uppercase tracking-wider text-foreground", textClasses.listHeader)}>single</th>
              {([0, 1] as const).map((idx) => (
                <th key={idx} className={cn("py-1 font-normal text-right", textClasses.listHeader, idx === 0 ? "pr-1.5" : "pr-2")}>
                  <select
                    className={cn("bg-transparent font-sans uppercase tracking-wider text-foreground hover:text-foreground cursor-pointer border-none outline-none appearance-none w-full text-right", textClasses.listHeader)}
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
                            className="absolute top-1/2 left-1 z-20 inline-block -translate-y-1/2 max-w-[11rem] truncate rounded-full border border-primary/50 bg-background px-2 py-[1px] text-[11px] font-sans uppercase tracking-wider text-foreground hover:border-primary/70 hover:bg-primary/10 transition-colors"
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
                    onClick={() => {
                      onSelectSolveCell(row.solve.id, "single")
                      onOpenSolveDetail(row.solve.id)
                    }}
                    style={{ height: `${rowHeight}px` }}
                  >
                    <td className={cn("text-right pr-1.5 py-0.5 text-foreground/90 font-mono", textClasses.listIndex)}>
                      {row.displayNumber}
                    </td>
                    <td
                      className={cn(
                        "text-right pr-1.5 py-0.5 font-mono text-foreground transition-colors",
                        textClasses.listValue,
                        selectedId === row.solve.id &&
                          selectedMetric === "single" &&
                          "text-indigo-300 bg-indigo-500/15"
                      )}
                      onClick={(eventClick) => {
                        eventClick.stopPropagation()
                        onSelectSolveCell(row.solve.id, "single")
                        onOpenSolveDetail(row.solve.id)
                      }}
                    >
                      {fmtSolve(row.solve)}
                    </td>
                    <td
                      className={cn(
                        "text-right pr-1.5 py-0.5 text-foreground font-mono transition-colors",
                        textClasses.listStat,
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
                        "text-right pr-2 py-0.5 text-foreground font-mono transition-colors",
                        textClasses.listStat,
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

SolveListPanelInner.displayName = "SolveListPanel"

export const SolveListPanel = memo(SolveListPanelInner)

SolveListPanel.displayName = "SolveListPanel"
