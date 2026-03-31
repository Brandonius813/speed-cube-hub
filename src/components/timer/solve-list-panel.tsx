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
  useTransition,
} from "react"
import { updateTimerSessionDuration } from "@/lib/actions/timer"
import type { TimerHistoryStatus } from "@/components/timer/use-timer-event-history"
import { cn, formatDuration, formatDurationInput, parseDuration } from "@/lib/utils"
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
export type SolveListStatMetric = Exclude<SolveSelectionMetric, "single">

export type SolveListPanelHandle = {
  preserveScrollPosition: () => void
}

type CurrentSessionLabel = {
  title: string
  date: string | null
}

interface SolveListPanelProps {
  rows: SolveListRow[]
  loadedCount: number
  totalSolveCount: number
  rangeStart: number
  rangeEnd: number
  scrollResetKey: string
  frozen?: boolean
  stats: SolveStats
  summaryStats: SolveStats
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
  eventDnfCount?: number | null
  unsavedDnfCount?: number
  historyStatus?: TimerHistoryStatus
  historyError?: string | null
  hasOlderSolves?: boolean
  isLoadingOlderSolves?: boolean
  onSetSelectedId: (id: string | null) => void
  onOpenSolveDetail: (id: string) => void
  onOpenStatDetail: (id: string, metric: SolveListStatMetric) => void
  onSelectSolveCell: (id: string, metric: SolveSelectionMetric) => void
  onSetPenalty: (id: string, p: Penalty) => void
  onDeleteSolve: (id: string) => void
  onShareSolve?: (solve: Solve) => void
  onUpdateStatCol: (idx: 0 | 1, key: string) => void
  onRangeChange: (next: { start: number; end: number }) => void
  onUpdateSavedSessionDuration?: (groupId: string, durationMinutes: number) => void
  onLoadOlderSolves?: () => Promise<void> | void
  onRetryHistoryLoad?: () => void
  multiSelectMode?: boolean
  multiSelectCount?: number
  isMultiSelected?: (id: string) => boolean
  isSelectAll?: boolean
  onToggleMultiSelect?: (id: string) => void
  onToggleSelectAll?: () => void
  onEnterMultiSelect?: (initialId?: string) => void
  onExitMultiSelect?: () => void
  onBulkDelete?: () => void
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
  loadedCount,
  totalSolveCount,
  rangeStart,
  rangeEnd,
  scrollResetKey,
  frozen = false,
  stats,
  summaryStats,
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
  currentSolveCount,
  showAllStats = false,
  textSize = "md",
  eventDnfCount = null,
  unsavedDnfCount = 0,
  historyStatus = "ready",
  historyError = null,
  hasOlderSolves = false,
  isLoadingOlderSolves = false,
  onSetSelectedId,
  onOpenSolveDetail,
  onOpenStatDetail,
  onSelectSolveCell,
  onSetPenalty,
  onDeleteSolve,
  onShareSolve,
  onUpdateStatCol,
  onRangeChange,
  onUpdateSavedSessionDuration,
  onLoadOlderSolves,
  onRetryHistoryLoad,
  multiSelectMode = false,
  multiSelectCount = 0,
  isMultiSelected,
  isSelectAll = false,
  onToggleMultiSelect,
  onToggleSelectAll,
  onEnterMultiSelect,
  onExitMultiSelect,
  onBulkDelete,
}, ref) {
  const sp = (e: React.PointerEvent) => e.stopPropagation()
  const listRef = useRef<HTMLDivElement | null>(null)
  const footerSentinelRef = useRef<HTMLDivElement | null>(null)
  const rangeRef = useRef({ start: -1, end: -1 })
  const pendingScrollTopRef = useRef<number | null>(null)
  const pendingAnchorRef = useRef<{ solveId: string; offsetTop: number } | null>(null)
  const olderLoadPromiseRef = useRef<Promise<void> | null>(null)
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
  const statsIncomplete = historyStatus === "loading" || hasOlderSolves
  const getPrefixHeight = useCallback(
    (rowIndex: number) =>
      rowIndex * rowHeight +
      countBoundariesAtOrBefore(sortedBoundaries, rowIndex) * DIVIDER_GAP,
    [rowHeight, sortedBoundaries]
  )
  const totalHeight = useMemo(
    () => getPrefixHeight(loadedCount),
    [getPrefixHeight, loadedCount]
  )

  const emitRange = useCallback(() => {
    if (!listRef.current || frozen) return
    const el = listRef.current
    const viewHeight = el.clientHeight
    const firstVisible = findRowForOffset(
      el.scrollTop,
      loadedCount,
      getPrefixHeight
    )
    const lastVisible = findRowForOffset(
      el.scrollTop + viewHeight,
      loadedCount,
      getPrefixHeight
    )
    const start = Math.max(0, firstVisible - OVERSCAN)
    const end = Math.min(loadedCount, lastVisible + 1 + OVERSCAN)
    if (start === rangeRef.current.start && end === rangeRef.current.end) return
    rangeRef.current = { start, end }
    onRangeChange({ start, end })
  }, [frozen, getPrefixHeight, loadedCount, onRangeChange])

  useImperativeHandle(ref, () => ({
    preserveScrollPosition() {
      pendingScrollTopRef.current = listRef.current?.scrollTop ?? 0
    },
  }), [])

  useEffect(() => {
    rangeRef.current = { start: -1, end: -1 }
    pendingAnchorRef.current = null
    olderLoadPromiseRef.current = null
    if (!listRef.current) return
    listRef.current.scrollTop = 0
    emitRange()
  }, [emitRange, scrollResetKey])

  useEffect(() => {
    emitRange()
  }, [emitRange, loadedCount, totalHeight])

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el || pendingScrollTopRef.current === null) return
    el.scrollTop = pendingScrollTopRef.current
    pendingScrollTopRef.current = null
    emitRange()
  }, [emitRange, loadedCount, rows])

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

  const captureVisibleAnchor = useCallback(() => {
    const container = listRef.current
    if (!container) return null

    const containerTop = container.getBoundingClientRect().top
    const rowElements = Array.from(
      container.querySelectorAll<HTMLElement>("[data-solve-row='true']")
    )

    for (const rowElement of rowElements) {
      const rect = rowElement.getBoundingClientRect()
      if (rect.bottom <= containerTop) continue
      const solveId = rowElement.dataset.solveId
      if (!solveId) continue
      return {
        solveId,
        offsetTop: rect.top - containerTop,
      }
    }

    return null
  }, [])

  const loadOlderWithAnchor = useCallback(() => {
    if (
      frozen ||
      !hasOlderSolves ||
      isLoadingOlderSolves ||
      !onLoadOlderSolves ||
      olderLoadPromiseRef.current
    ) {
      return
    }

    pendingAnchorRef.current = captureVisibleAnchor()
    const loadPromise = Promise.resolve(onLoadOlderSolves())
      .catch(() => {})
      .finally(() => {
        olderLoadPromiseRef.current = null
      })

    olderLoadPromiseRef.current = loadPromise
  }, [
    captureVisibleAnchor,
    frozen,
    hasOlderSolves,
    isLoadingOlderSolves,
    onLoadOlderSolves,
  ])

  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current
    const container = listRef.current
    if (!anchor || !container) return

    const rowElement = container.querySelector<HTMLElement>(
      `[data-solve-id="${anchor.solveId}"]`
    )
    if (!rowElement) return

    const containerTop = container.getBoundingClientRect().top
    const rowTop = rowElement.getBoundingClientRect().top - containerTop
    container.scrollTop += rowTop - anchor.offsetTop
    pendingAnchorRef.current = null
    emitRange()
  }, [emitRange, loadedCount, rows])

  useEffect(() => {
    const container = listRef.current
    const sentinel = footerSentinelRef.current
    if (
      !container ||
      !sentinel ||
      typeof IntersectionObserver === "undefined" ||
      !hasOlderSolves ||
      frozen
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (!firstEntry?.isIntersecting) return
        loadOlderWithAnchor()
      },
      {
        root: container,
        rootMargin: "0px 0px 160px 0px",
        threshold: 0,
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [frozen, hasOlderSolves, loadOlderWithAnchor, rows.length])

  const topSpacer = getPrefixHeight(rangeStart)
  const bottomSpacer = Math.max(0, totalHeight - getPrefixHeight(rangeEnd))
  const last = latestSolve
  const totalDnfCount = eventDnfCount != null ? eventDnfCount + unsavedDnfCount : null
  const validSolveCount = totalDnfCount != null ? totalSolveCount - totalDnfCount : totalSolveCount
  const countDisplay = `${validSolveCount}/${totalSolveCount}`
  const [isEditingSessionDuration, setIsEditingSessionDuration] = useState(false)
  const [sessionDurationInput, setSessionDurationInput] = useState("")
  const [sessionDurationError, setSessionDurationError] = useState<string | null>(null)
  const [isSavingSessionDuration, startSavingSessionDuration] = useTransition()
  const closeSessionStats = useCallback(() => {
    setOpenSessionStats(null)
    setIsEditingSessionDuration(false)
    setSessionDurationInput("")
    setSessionDurationError(null)
  }, [])
  const openStatsForDivider = useCallback(
    (label: DividerLabel | null) => {
      if (!label) return
      setOpenSessionStats(label)
      setIsEditingSessionDuration(false)
      setSessionDurationError(null)
      setSessionDurationInput(
        label.stats.durationMinutes !== null
          ? formatDurationInput(label.stats.durationMinutes)
          : "1"
      )
    },
    []
  )
  const sessionBestByKey = useMemo(
    () => new Map(sessionStats.milestoneRows.map((row) => [row.key, row.best])),
    [sessionStats.milestoneRows]
  )
  const canEditOpenSessionDuration =
    !!openSessionStats?.sessionId && !!openSessionStats?.timerSessionId
  const handleSaveSessionDuration = useCallback(() => {
    if (!openSessionStats?.sessionId) return

    const parsedDurationMinutes = parseDuration(sessionDurationInput)
    if (!parsedDurationMinutes) {
      setSessionDurationError('Invalid duration. Use minutes like "10" or h:mm like "1:30".')
      return
    }

    const groupId = openSessionStats.groupId
    const sessionId = openSessionStats.sessionId
    startSavingSessionDuration(async () => {
      setSessionDurationError(null)
      const result = await updateTimerSessionDuration(sessionId, parsedDurationMinutes)
      if (result.error) {
        setSessionDurationError(result.error)
        return
      }

      onUpdateSavedSessionDuration?.(groupId, parsedDurationMinutes)
      setOpenSessionStats((current) => {
        if (!current || current.groupId !== groupId) return current
        return {
          ...current,
          stats: {
            ...current.stats,
            durationMinutes: parsedDurationMinutes,
          },
        }
      })
      setSessionDurationInput(formatDurationInput(parsedDurationMinutes))
      setIsEditingSessionDuration(false)
    })
  }, [onUpdateSavedSessionDuration, openSessionStats, sessionDurationInput])

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
              <td className={cn("text-right pr-2 font-mono text-foreground", textClasses.summaryValue)}>{D(summaryStats.best)}</td>
              <td className={cn("text-right font-mono text-foreground", textClasses.summaryValue)}>{D(sessionStats.best)}</td>
            </tr>
            {summaryStats.milestoneRows.map((row) => (
              <tr key={row.key}>
                <td className={cn("font-sans text-foreground py-1 pr-2", textClasses.summaryLabel)}>{row.key}</td>
                <td className={cn("text-right pr-2 font-mono text-foreground", textClasses.summaryValue)}>{D(row.cur)}</td>
                <td className={cn("text-right pr-2 font-mono text-foreground", textClasses.summaryValue)}>{D(row.best)}</td>
                <td className={cn("text-right font-mono text-foreground", textClasses.summaryValue)}>{D(sessionBestByKey.get(row.key) ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {statsIncomplete && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-muted-foreground">
            <span className="h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
            <span className="font-sans text-[10px] uppercase tracking-wider">
              Loading all-time stats…
            </span>
          </div>
        )}
        <div className="mt-2.5 border-t border-border pt-2">
          <div className="space-y-1 text-center">
            <div className="whitespace-nowrap">
              <span className={cn("font-sans normal-case tracking-normal text-muted-foreground", textClasses.footerHeader)}>
                count:
              </span>{" "}
              <span className={cn("font-mono text-foreground", textClasses.footerValue)}>
                {countDisplay}
              </span>
            </div>
            <div className="whitespace-nowrap">
              <span className={cn("font-sans normal-case tracking-normal text-muted-foreground", textClasses.footerHeader)}>
                session mean:
              </span>{" "}
              <span className={cn("font-mono text-foreground", textClasses.footerValue)}>
                {D(sessionStats.mean)}
              </span>
            </div>
            <div className="whitespace-nowrap">
              <span className={cn("font-sans normal-case tracking-normal text-muted-foreground", textClasses.footerHeader)}>
                all-time mean:
              </span>{" "}
              <span className={cn("font-mono text-foreground", textClasses.footerValue)}>
                {D(summaryStats.mean)}
              </span>
            </div>
          </div>
        </div>
        {multiSelectMode ? (
          <div className="mt-2.5 flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelectAll}
                onChange={() => onToggleSelectAll?.()}
                className="accent-primary h-3.5 w-3.5"
              />
              <span className={cn(textClasses.actionButton, "font-sans text-muted-foreground")}>All</span>
            </label>
            <span className={cn(textClasses.actionButton, "font-sans text-foreground font-medium")}>
              {multiSelectCount} selected
            </span>
            <button
              className={cn(textClasses.actionButton, "font-sans px-2.5 py-1.5 rounded border border-red-500/60 text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors disabled:opacity-40")}
              onClick={() => onBulkDelete?.()}
              disabled={multiSelectCount === 0}
            >
              Delete
            </button>
            <button
              className={cn(textClasses.actionButton, "font-sans px-2.5 py-1.5 rounded border border-border text-foreground hover:text-foreground transition-colors")}
              onClick={() => onExitMultiSelect?.()}
            >
              Cancel
            </button>
          </div>
        ) : selectedSolve && (
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
            {onEnterMultiSelect && (
              <button
                className={cn(textClasses.actionButton, "font-sans px-2.5 py-1.5 rounded border border-border text-foreground hover:border-primary hover:text-primary transition-colors")}
                onClick={() => onEnterMultiSelect(selectedSolve.id)}
              >
                Select
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
        {loadedCount === 0 ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center px-4 py-8 text-center">
            <div className="max-w-xs space-y-3">
              <p className="text-sm text-muted-foreground">
                {historyStatus === "loading" && "Loading recent solves..."}
                {historyStatus === "empty" && "No solves yet for this event."}
                {historyStatus === "error" &&
                  (historyError ?? "Failed to load recent solves.")}
              </p>
              {historyStatus === "error" && onRetryHistoryLoad && (
                <button
                  type="button"
                  className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs font-sans uppercase tracking-wider text-foreground transition-colors hover:bg-secondary/50"
                  onClick={() => onRetryHistoryLoad()}
                >
                  Retry history load
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full text-[13px] font-mono border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="text-foreground border-b border-border">
                {multiSelectMode && <th className="w-7 py-2"></th>}
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
                  <td colSpan={multiSelectMode ? 5 : 4} style={{ height: `${topSpacer}px` }} />
                </tr>
              )}

              {rows.map((row, windowIdx) => {
                const displayIdx = rangeStart + windowIdx
                const isBoundary = groupBoundaries?.has(displayIdx)
                const dividerLabel = isBoundary
                  ? groupDividerLabels?.get(displayIdx) ?? null
                  : null
                const isSaved = !!row.solve.group
                let statsIdx = -1
                if (showAllStats) {
                  statsIdx = row.solveIndex
                } else if (!isSaved) {
                  statsIdx = savedSolveCount > 0
                    ? row.solveIndex - savedSolveCount
                    : row.solveIndex
                }
                const stat1Value = statsIdx >= 0 ? stats.rolling1[statsIdx] ?? null : null
                const stat2Value = statsIdx >= 0 ? stats.rolling2[statsIdx] ?? null : null

                return (
                  <Fragment key={row.solve.id}>
                    {isBoundary && (
                      <tr aria-hidden="true">
                        <td colSpan={multiSelectMode ? 5 : 4} className="relative p-0" style={{ height: `${DIVIDER_GAP}px` }}>
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
                      data-solve-row="true"
                      data-solve-id={row.solve.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer",
                        selectedId === row.solve.id && !multiSelectMode && "bg-muted/40",
                        multiSelectMode && isMultiSelected?.(row.solve.id) && "bg-primary/10"
                      )}
                      onClick={() => {
                        if (multiSelectMode) {
                          onToggleMultiSelect?.(row.solve.id)
                          return
                        }
                        onSelectSolveCell(row.solve.id, "single")
                        onOpenSolveDetail(row.solve.id)
                      }}
                      style={{ height: `${rowHeight}px` }}
                    >
                      {multiSelectMode && (
                        <td className="w-7 text-center py-0.5">
                          <input
                            type="checkbox"
                            checked={isMultiSelected?.(row.solve.id) ?? false}
                            onChange={() => onToggleMultiSelect?.(row.solve.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="accent-primary h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      )}
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
                          stat1Value !== null && "cursor-pointer hover:text-indigo-200",
                          selectedId === row.solve.id &&
                            selectedMetric === "stat1" &&
                            "text-indigo-300 bg-indigo-500/15"
                        )}
                        onClick={(eventClick) => {
                          if (stat1Value === null) return
                          eventClick.stopPropagation()
                          onSelectSolveCell(row.solve.id, "stat1")
                          onOpenStatDetail(row.solve.id, "stat1")
                        }}
                      >
                        {D(stat1Value)}
                      </td>
                      <td
                        className={cn(
                          "text-right pr-2 py-0.5 text-foreground font-mono transition-colors",
                          textClasses.listStat,
                          stat2Value !== null && "cursor-pointer hover:text-indigo-200",
                          selectedId === row.solve.id &&
                            selectedMetric === "stat2" &&
                            "text-indigo-300 bg-indigo-500/15"
                        )}
                        onClick={(eventClick) => {
                          if (stat2Value === null) return
                          eventClick.stopPropagation()
                          onSelectSolveCell(row.solve.id, "stat2")
                          onOpenStatDetail(row.solve.id, "stat2")
                        }}
                      >
                        {D(stat2Value)}
                      </td>
                    </tr>
                  </Fragment>
                )
              })}

              {bottomSpacer > 0 && (
                <tr>
                  <td colSpan={multiSelectMode ? 5 : 4} style={{ height: `${bottomSpacer}px` }} />
                </tr>
              )}
              <tr aria-hidden="true">
                <td colSpan={multiSelectMode ? 5 : 4} className="px-3 py-1">
                  <div ref={footerSentinelRef} className="h-px w-full" />
                </td>
              </tr>
              {isLoadingOlderSolves && (
                <tr>
                  <td colSpan={multiSelectMode ? 5 : 4} className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2 text-xs font-sans uppercase tracking-wider text-muted-foreground">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border border-primary/30 border-t-primary" />
                      Loading older solves...
                    </div>
                  </td>
                </tr>
              )}
              {historyError && historyStatus === "ready" && !isLoadingOlderSolves && (
                <tr>
                  <td colSpan={multiSelectMode ? 5 : 4} className="px-3 py-3">
                    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-xs text-foreground">
                      <p>{historyError}</p>
                      {hasOlderSolves && onLoadOlderSolves && (
                        <button
                          type="button"
                          className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs font-sans uppercase tracking-wider text-foreground transition-colors hover:bg-secondary/50"
                          onClick={() => loadOlderWithAnchor()}
                        >
                          Retry older solves
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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

            {canEditOpenSessionDuration && (
              <div className="mt-3 rounded-lg border border-border/40 bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Timer Session Duration
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Update the session length without changing solves or stats.
                    </p>
                  </div>
                  {!isEditingSessionDuration && (
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      onClick={() => setIsEditingSessionDuration(true)}
                    >
                      Edit duration
                    </button>
                  )}
                </div>

                {isEditingSessionDuration && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={sessionDurationInput}
                      onChange={(event) => setSessionDurationInput(event.target.value)}
                      inputMode="numeric"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-primary"
                      placeholder='10 or 1:30'
                      aria-label="Edit saved session duration"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use minutes or h:mm.
                    </p>
                    {sessionDurationError && (
                      <p className="text-xs text-destructive">{sessionDurationError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                        onClick={handleSaveSessionDuration}
                        disabled={isSavingSessionDuration}
                      >
                        {isSavingSessionDuration ? "Saving..." : "Save duration"}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => {
                          setIsEditingSessionDuration(false)
                          setSessionDurationError(null)
                          setSessionDurationInput(
                            openSessionStats.stats.durationMinutes !== null
                              ? formatDurationInput(openSessionStats.stats.durationMinutes)
                              : "1"
                          )
                        }}
                        disabled={isSavingSessionDuration}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
