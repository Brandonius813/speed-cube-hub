"use client"

import dynamic from "next/dynamic"
import { startTransition, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, Info, Settings } from "lucide-react"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { type InspectionVoiceGender, useInspection } from "@/lib/timer/inspection"
import { cn } from "@/lib/utils"
import {
  formatTimeMsCentiseconds,
} from "@/lib/timer/averages"
import { roundTelemetryMs } from "@/lib/timer/timing-core"
import {
  getTimerReadoutColor,
  parseTimerTextSize,
  TIMER_READOUT_SIZE_CLASSES,
  TIMER_READOUT_TEXT_SIZE_KEY,
  TimerReadout,
  type SharedTimerLastSolve,
  type TimerTextSize,
  type TimerUpdateMode,
} from "@/components/timer/shared-timer-surface"
import {
  type Penalty,
  type TimerSolve as Solve,
  computeStat,
  computeAllMilestonesSliding,
  buildRollingArraySliding,
} from "@/lib/timer/stats"
import {
  SolveListPanel,
  type SolveListPanelHandle,
  type SolveListRow,
  type SolveSelectionMetric,
  type SolveListStatMetric,
  type SolveStats,
} from "@/components/timer/solve-list-panel"
import {
  useBluetoothTimer,
  type BtTimerCallbacks,
} from "@/components/timer/use-bluetooth-timer"
import { useScreenWakeLock } from "@/components/timer/use-screen-wake-lock"
import { isBleSupported } from "@/lib/timer/bluetooth"
import {
  type ShortcutMap,
  loadShortcutMap,
  saveShortcutMap,
  matchShortcut,
} from "@/lib/timer/keyboard-shortcuts"
import ShortcutSettings from "@/components/timer/shortcut-settings"
import type { CompSimBtHandle } from "@/components/timer/comp-sim-overlay"
import {
  createTimerEngine,
  type TimerEvent,
  type TimerPhase,
} from "@/lib/timer/engine"
import { createSolveStore } from "@/lib/timer/solve-store"
import { parseTime } from "@/lib/timer/parse-time"
import { getCachedStats, setCachedStats } from "@/lib/timer/stats-cache"
import { emitTimerTelemetry } from "@/lib/timer/telemetry"
import { syncSolvesFromDb } from "@/lib/timer/cross-device-sync"
import {
  getEventAnalytics,
  getTimerSolveListSummary,
  getEventSolveById,
  getSolveDetailWindow,
  listRecentEventSolves,
  type SolveWindowCursor,
} from "@/lib/actions/timer-analytics"
import {
  deleteSolve as deleteSolveAction,
  deleteSolves as deleteSolvesAction,
  getSolveCountByEvent,
  updateSolve as updateSolveAction,
} from "@/lib/actions/timer"
import {
  computeSessionDividers,
  formatSessionDividerDate,
  type SessionGroupMeta,
} from "@/lib/timer/session-dividers"
import {
  useTimerEventHistory,
} from "@/components/timer/use-timer-event-history"
import { getEventLabel, getPracticeTypesForEvent } from "@/lib/constants"
import { PracticeModeSelector } from "@/components/timer/practice-mode-selector"
import {
  PANE_REGISTRY,
  PANE_TOOL_OPTIONS,
} from "@/components/timer/panes/pane-registry"
import { useTimerPaneLayout } from "@/components/timer/panes/use-timer-pane-layout"
import { DesktopPaneWorkspace } from "@/components/timer/panes/desktop-pane-workspace"
import { MobilePaneDrawer } from "@/components/timer/panes/mobile-pane-drawer"
import {
  type DesktopPaneSlot,
  type PaneToolId,
  type TimerPaneTextSize,
} from "@/components/timer/panes/types"
import { getLastSinglePbCandidate } from "@/lib/timer/pb-share"
import type {
  StatsSummary,
  StatsWorkerRequest,
  StatsWorkerResponse,
} from "@/lib/timer/stats-worker-types"
import { getProfile } from "@/lib/actions/profiles"
import { getSessionDividerGroupsByTimerSession } from "@/lib/actions/timer"
import { ONBOARDING_TOURS, parseOnboardingTour } from "@/lib/onboarding"
import type { ShareCardData } from "@/components/share/share-card"
import type {
  TimerMilestoneKey,
  Solve as StoredSolve,
  TimerEventAnalytics,
  TimerSavedSessionSummary,
  TimerSolveListSummary,
} from "@/lib/types"
import {
  DEFAULT_COMP_SIM_ROUND_CONFIG,
  normalizeCompSimConfig,
  type CompSimRoundConfig,
} from "@/lib/timer/comp-sim-round"
import { useSolveClock } from "@/components/timer/use-solve-clock"
import { useAutoSession } from "@/components/timer/use-auto-session"
import { useMultiSelect } from "@/components/timer/use-multi-select"
import {
  solvesToCSV,
  solvesToJSON,
  solvesToCsTimerTxt,
  statsToClipboard,
  downloadFile,
} from "@/lib/timer/export"

const EndSessionModal = dynamic(
  () =>
    import("@/components/timer/end-session-modal").then(
      (module) => module.EndSessionModal
    ),
  { loading: () => null }
)

const CompSimOverlay = dynamic(
  () =>
    import("@/components/timer/comp-sim-overlay").then(
      (module) => module.CompSimOverlay
    ),
  { loading: () => null }
)

const CompSimEntryDialog = dynamic(
  () =>
    import("@/components/timer/comp-sim-entry-dialog").then(
      (module) => module.CompSimEntryDialog
    ),
  { loading: () => null }
)

const SolveDetailModal = dynamic(
  () =>
    import("@/components/timer/solve-detail-modal").then(
      (module) => module.SolveDetailModal
    ),
  { loading: () => null }
)

const StatDetailModal = dynamic(
  () =>
    import("@/components/timer/stat-detail-modal").then(
      (module) => module.StatDetailModal
    ),
  { loading: () => null }
)

const ShareModal = dynamic(
  () =>
    import("@/components/share/share-modal").then(
      (module) => module.ShareModal
    ),
  { loading: () => null }
)

const PbPhotoModeOverlay = dynamic(
  () =>
    import("@/components/timer/pb-photo-mode-overlay").then(
      (module) => module.PbPhotoModeOverlay
    ),
  { loading: () => null }
)

const HOLD_MS_OPTIONS = [0, 100, 200, 300, 550] as const
type HoldMs = (typeof HOLD_MS_OPTIONS)[number]
const DEFAULT_HOLD_MS: HoldMs = 550
const HOLD_MS_KEY = "timer-hold-ms"
const MILESTONES = [5, 12, 25, 50, 100, 200, 500, 1000]
const SCRAMBLE_TIMEOUT_MS = 2000
const SCRAMBLE_MAX_RETRIES = 3
const INITIAL_SOLVE_WINDOW = 120
const SETTINGS_MENU_VIEWPORT_MARGIN_PX = 12
const SETTINGS_MENU_MIN_HEIGHT_PX = 180
const TIMER_V2_ENGINE_ENABLED = process.env.NEXT_PUBLIC_TIMER_V2_ENGINE !== "false"
const SESSION_START_KEY = "timer-session-start"
const SESSION_START_SOLVE_INDEX_KEY = "timer-session-start-solve-index"
const SESSION_PAUSED_MS_KEY = "timer-session-paused-ms"
const SESSION_PAUSED_KEY = "timer-session-paused"
const SESSION_PAUSED_AT_KEY = "timer-session-paused-at"
const SESSION_PAUSED_SOLVE_MSG = "Session is paused. Resume it to solve."
const SESSION_PAUSED_ENTRY_MSG = "Session is paused. Resume it to enter a time."
const COMP_SIM_CONFIG_KEY = "timer-comp-sim-config"
const LEGACY_TIMER_TEXT_SIZE_KEY = "timer-text-size"
const TIMER_SCRAMBLE_TEXT_SIZE_KEY = "timer-scramble-text-size"
const TIMER_PANE_TIME_TEXT_SIZE_KEY = "timer-pane-time-text-size"
type CompSimEntryGuard =
  | "empty_session"
  | "session_unsaved"

const TIMER_UPDATE_MODE_OPTIONS: Array<{
  value: TimerUpdateMode
  label: string
}> = [
  { value: "realtime", label: "Real-time" },
  { value: "seconds", label: "Seconds" },
  { value: "solving", label: "None" },
]

const TIMER_TEXT_SIZE_OPTIONS: Array<{ value: TimerTextSize; label: string }> = [
  { value: "md", label: "Default" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "XL" },
]

const TYPING_INPUT_SIZE_CLASSES: Record<TimerTextSize, string> = {
  md: "text-[clamp(4.5rem,18vw,12rem)]",
  lg: "text-[clamp(5rem,20vw,13rem)]",
  xl: "text-[clamp(5.5rem,22vw,14rem)]",
}

const SCRAMBLE_TEXT_SIZE_CLASSES: Record<TimerTextSize, string> = {
  md: "text-lg sm:text-xl 2xl:text-[1.45rem]",
  lg: "text-xl sm:text-2xl 2xl:text-[1.65rem]",
  xl: "text-[1.4rem] sm:text-[1.75rem] 2xl:text-[1.9rem]",
}

function getStatWindowSize(statKey: string): number | null {
  const match = statKey.match(/\d+/)
  if (!match) return null
  const value = parseInt(match[0], 10)
  return Number.isFinite(value) && value > 0 ? value : null
}

const INLINE_SLOT_OPTIONS: Array<{ slot: DesktopPaneSlot; label: string }> = [
  { slot: "bottom_left", label: "Left" },
  { slot: "bottom_middle", label: "Middle" },
  { slot: "bottom_right", label: "Right" },
  { slot: "top_right", label: "Top" },
]

const EVENTS = [
  { id: "333", name: "3x3" },
  { id: "222", name: "2x2" },
  { id: "444", name: "4x4" },
  { id: "555", name: "5x5" },
  { id: "666", name: "6x6" },
  { id: "777", name: "7x7" },
  { id: "333bf", name: "3BLD" },
  { id: "333oh", name: "3OH" },
  { id: "pyram", name: "Pyram" },
  { id: "skewb", name: "Skewb" },
  { id: "clock", name: "Clock" },
  { id: "minx", name: "Megaminx" },
  { id: "sq1", name: "SQ-1" },
]

type ScrambleWorkerRequest = {
  requestId: number
  eventId: string
}

type ScrambleWorkerResponse = {
  requestId: number
  eventId: string
  scramble: string | null
  error?: string
  warning?: string
}

type PendingScrambleRequest = {
  requestId: number
  eventId: string
  kind: "current" | "prefetch"
  attempt: number
  timeoutId: number
}

type SavedSessionPayload = {
  title: string
  durationMinutes: number
  practiceType: string
  sessionId: string
  timerSessionId: string
  numDnf: number
  avgSeconds: number | null
  bestSeconds: number | null
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement ||
    target.isContentEditable
  )
}

function loadSessionGroups(eventId: string): SessionGroupMeta[] {
  try {
    return JSON.parse(localStorage.getItem(`timer-session-groups-${eventId}`) ?? "[]")
  } catch {
    return []
  }
}

function saveSessionGroups(eventId: string, groups: SessionGroupMeta[]) {
  try {
    localStorage.setItem(`timer-session-groups-${eventId}`, JSON.stringify(groups))
  } catch {}
}

function getTrailingUnsavedSolves(solves: Solve[]): Solve[] {
  let start = solves.length
  while (start > 0 && !solves[start - 1].group) {
    start -= 1
  }
  return solves.slice(start)
}

function dateGroupFromSolvedAt(solvedAt: string | undefined): string | null {
  if (!solvedAt) return null
  const day = solvedAt.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return `date:${day}`
}

function getSavedSolveWindowCursor(solves: Solve[]): SolveWindowCursor | null {
  const firstSavedSolve = solves.find((solve) => !!solve.group)
  if (!firstSavedSolve) return null
  return {
    solvedAt: firstSavedSolve.solved_at ?? firstSavedSolve.created_at ?? new Date().toISOString(),
    id: firstSavedSolve.id,
  }
}


function needsHistoricGroupBackfill(solves: Solve[]): boolean {
  if (solves.length === 0) return false

  // If everything is grouped into a single bucket, it's likely legacy-collapsed
  // history from import/sync and we should audit against DB grouping.
  const grouped = solves.filter((solve) => !!solve.group)
  if (grouped.length === solves.length && solves.length >= 200) {
    const uniqueGroups = new Set(grouped.map((solve) => solve.group))
    if (uniqueGroups.size <= 1) return true
  }

  // Find the start of the trailing ungrouped suffix (expected current unsaved block).
  let suffixStart = solves.length
  for (let i = solves.length - 1; i >= 0; i--) {
    if (!solves[i].group) continue
    suffixStart = i + 1
    break
  }

  // If everything is ungrouped, we definitely need a one-time backfill.
  if (suffixStart === solves.length) return true

  // If ungrouped solves exist before the trailing suffix, old history is missing groups.
  for (let i = 0; i < suffixStart; i++) {
    if (!solves[i].group) return true
  }

  // Large trailing ungrouped blocks are usually imported history, not an
  // in-progress unsaved session. Trigger one-time DB backfill for those.
  const trailingUngroupedCount = solves.length - suffixStart
  if (grouped.length > 0 && trailingUngroupedCount >= 50) return true

  return false
}

function backfillGroupsFromMetadata(
  solves: Solve[],
  groups: SessionGroupMeta[]
): { solves: Solve[]; changed: boolean } {
  if (solves.length === 0 || groups.length === 0) {
    return { solves, changed: false }
  }
  if (solves.some((solve) => !!solve.group)) {
    return { solves, changed: false }
  }

  const sortedGroups = groups
    .filter((group) => Number.isFinite(group.solveCount) && group.solveCount > 0)
    .sort((a, b) => a.savedAt - b.savedAt)

  if (sortedGroups.length === 0) {
    return { solves, changed: false }
  }

  const patched = [...solves]
  let changed = false
  let cursor = 0

  for (const group of sortedGroups) {
    const count = Math.max(0, Math.floor(group.solveCount))
    for (let i = 0; i < count && cursor < patched.length; i++, cursor++) {
      if (patched[cursor].group === group.id) continue
      patched[cursor] = { ...patched[cursor], group: group.id }
      changed = true
    }
    if (cursor >= patched.length) break
  }

  return { solves: patched, changed }
}

function getEffectiveSolveMs(solve: Solve): number | null {
  if (solve.penalty === "DNF") return null
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

function toTimerSolve(solve: StoredSolve | Solve): Solve {
  if ("group" in solve) {
    return solve as Solve
  }

  const timerSessionId =
    "timer_session_id" in solve && typeof solve.timer_session_id === "string"
      ? solve.timer_session_id
      : null
  const solveSessionId =
    "solve_session_id" in solve && typeof solve.solve_session_id === "string"
      ? solve.solve_session_id
      : null

  return {
    id: solve.id,
    time_ms: solve.time_ms,
    penalty: solve.penalty,
    scramble: solve.scramble,
    notes: solve.notes ?? null,
    phases: solve.phases ?? null,
    solve_number: solve.solve_number,
    solved_at: solve.solved_at,
    created_at: solve.created_at,
    group: timerSessionId ?? solveSessionId ?? dateGroupFromSolvedAt(solve.solved_at),
  }
}

function computeStatsSync(solves: Solve[], statCols: [string, string]): SolveStats {
  const valid = solves
    .filter((s) => s.penalty !== "DNF")
    .map((s) => (s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms))
  const mean = valid.length
    ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    : null

  // Use O(n log k) sliding window instead of O(n²) brute force
  const milestoneRows = computeAllMilestonesSliding(solves, MILESTONES)
  const rolling1 = buildRollingArraySliding(solves, statCols[0])
  const rolling2 = buildRollingArraySliding(solves, statCols[1])

  return {
    best: valid.length ? Math.min(...valid) : null,
    mean,
    milestoneRows,
    rolling1,
    rolling2,
  }
}

function summaryToStats(summary: StatsSummary): SolveStats {
  return {
    best: summary.best,
    mean: summary.mean,
    milestoneRows: summary.milestoneRows,
    rolling1: summary.rolling1,
    rolling2: summary.rolling2,
  }
}

function secondsToMs(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.round(value * 1000)
}

function buildSavedSessionSummaryStats(summary: TimerSavedSessionSummary | null): SolveStats | null {
  if (!summary) return null
  return {
    best: secondsToMs(summary.best_single_seconds),
    mean: secondsToMs(summary.mean_seconds),
    milestoneRows: MILESTONES.map((size) => {
      const key = `ao${size}` as TimerMilestoneKey
      const value = summary[`best_ao${size}` as keyof TimerSavedSessionSummary]
      return {
        key,
        cur: null,
        best: secondsToMs(typeof value === "number" ? value : null),
      }
    }).filter((row) => row.best !== null),
    rolling1: [],
    rolling2: [],
  }
}

function mergeExactSummaryStats(params: {
  fallback: SolveStats
  exactSummary: TimerSolveListSummary | null
  preferVisibleCurrent: boolean
}): SolveStats {
  const { fallback, exactSummary, preferVisibleCurrent } = params
  const exactEventSummary = exactSummary?.eventSummary ?? null
  const exactRows = exactSummary?.milestoneRows ?? []
  const visibleRowMap = new Map(fallback.milestoneRows.map((row) => [row.key, row]))
  const exactRowMap = new Map(exactRows.map((row) => [row.key, row]))

  const milestoneRows = MILESTONES.map((size) => {
    const key = `ao${size}` as TimerMilestoneKey
    const visibleRow = visibleRowMap.get(key) ?? null
    const exactRow = exactRowMap.get(key) ?? null
    return {
      key,
      cur: preferVisibleCurrent ? (visibleRow?.cur ?? exactRow?.cur ?? null) : (exactRow?.cur ?? visibleRow?.cur ?? null),
      best: exactRow?.best ?? visibleRow?.best ?? null,
    }
  }).filter((row) => row.cur !== null || row.best !== null)

  return {
    best: exactEventSummary?.best_single_ms ?? fallback.best,
    mean: exactEventSummary?.mean_ms ?? fallback.mean,
    milestoneRows,
    rolling1: fallback.rolling1,
    rolling2: fallback.rolling2,
  }
}

function toChartSolve(solve: Solve, eventId: string, solveNumber: number): StoredSolve {
  const timestamp = solve.solved_at ?? new Date(1704067200000 + solveNumber * 1000).toISOString()
  return {
    id: solve.id,
    timer_session_id: "local-session",
    user_id: "local-user",
    solve_number: solve.solve_number ?? solveNumber,
    time_ms: solve.time_ms,
    penalty: solve.penalty,
    scramble: solve.scramble,
    event: eventId,
    comp_sim_group: null,
    notes: solve.notes ?? null,
    phases: solve.phases ?? null,
    solve_session_id: null,
    solved_at: timestamp,
    created_at: solve.created_at ?? timestamp,
  }
}

type TimerViewer = {
  displayName: string
  handle: string | null
}

type StatDetailState = {
  label: string
  solves: Solve[]
}

type TimerContentProps = {
  viewer?: TimerViewer
}

export function TimerContent({ viewer }: TimerContentProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [event, setEvent] = useState(() => {
    try {
      return localStorage.getItem("timer-event") ?? "333"
    } catch {
      return "333"
    }
  })
  const [scramble, setScramble] = useState("Generating scramble...")
  const [scrambleError, setScrambleError] = useState<string | null>(null)
  const [solves, setSolves] = useState<Solve[]>([])
  const [inspOn, setInspOn] = useState(() => {
    try {
      return localStorage.getItem("timer-insp-on") === "true"
    } catch {
      return false
    }
  })
  const [inspVoiceOn, setInspVoiceOn] = useState(() => {
    try {
      const raw = localStorage.getItem("timer-insp-voice-on")
      if (raw === null) return true
      return raw === "true"
    } catch {
      return true
    }
  })
  const [inspVoiceGender, setInspVoiceGender] = useState<InspectionVoiceGender>(() => {
    try {
      const raw = localStorage.getItem("timer-insp-voice-gender")
      return raw === "male" || raw === "female" ? raw : "female"
    } catch {
      return "female"
    }
  })
  const [typing, setTyping] = useState(() => {
    try {
      return localStorage.getItem("timer-typing") === "true"
    } catch {
      return false
    }
  })
  const [timerUpdateMode, setTimerUpdateMode] = useState<TimerUpdateMode>(() => {
    try {
      const raw = localStorage.getItem("timer-update-mode")
      if (raw === "realtime" || raw === "seconds" || raw === "solving") {
        return raw
      }
    } catch {}
    return "realtime"
  })
  const [scrambleTextSize, setScrambleTextSize] = useState<TimerTextSize>(() => {
    try {
      return (
        parseTimerTextSize(localStorage.getItem(TIMER_SCRAMBLE_TEXT_SIZE_KEY)) ??
        parseTimerTextSize(localStorage.getItem(LEGACY_TIMER_TEXT_SIZE_KEY)) ??
        "lg"
      )
    } catch {
      return "lg"
    }
  })
  const [timerReadoutTextSize, setTimerReadoutTextSize] = useState<TimerTextSize>(() => {
    try {
      return (
        parseTimerTextSize(localStorage.getItem(TIMER_READOUT_TEXT_SIZE_KEY)) ??
        parseTimerTextSize(localStorage.getItem(LEGACY_TIMER_TEXT_SIZE_KEY)) ??
        "lg"
      )
    } catch {
      return "lg"
    }
  })
  const [paneTimeTextSize, setPaneTimeTextSize] = useState<TimerPaneTextSize>(() => {
    try {
      return (
        parseTimerTextSize(localStorage.getItem(TIMER_PANE_TIME_TEXT_SIZE_KEY)) ??
        parseTimerTextSize(localStorage.getItem(TIMER_READOUT_TEXT_SIZE_KEY)) ??
        parseTimerTextSize(localStorage.getItem(LEGACY_TIMER_TEXT_SIZE_KEY)) ??
        "lg"
      )
    } catch {
      return "lg"
    }
  })
  const [holdMs, setHoldMs] = useState<HoldMs>(() => {
    try {
      const raw = Number(localStorage.getItem(HOLD_MS_KEY))
      return (HOLD_MS_OPTIONS as readonly number[]).includes(raw)
        ? (raw as HoldMs)
        : DEFAULT_HOLD_MS
    } catch {
      return DEFAULT_HOLD_MS
    }
  })
  const [autoSessionEnabled, setAutoSessionEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem("timer-auto-session")
      return raw === null ? true : raw === "true"
    } catch {
      return true
    }
  })
  const [autoStopEnabled, setAutoStopEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem("timer-auto-stop")
      return raw === null ? true : raw === "true"
    } catch {
      return true
    }
  })
  const [idleTimeoutMin, setIdleTimeoutMin] = useState(() => {
    try {
      const raw = Number(localStorage.getItem("timer-idle-timeout-min"))
      return [5, 10, 15, 30].includes(raw) ? raw : 10
    } catch {
      return 10
    }
  })
  const [typeVal, setTypeVal] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<SolveSelectionMetric>("single")
  const [detailSolveId, setDetailSolveId] = useState<string | null>(null)
  const [statDetail, setStatDetail] = useState<StatDetailState | null>(null)
  const [scrambleCopied, setScrambleCopied] = useState(false)
  const [scrambleCanGoPrev, setScrambleCanGoPrev] = useState(false)
  const [practiceType, setPracticeType] = useState(() => {
    try {
      return localStorage.getItem("timer-practice-type") ?? "Solves"
    } catch {
      return "Solves"
    }
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsMenuMaxHeight, setSettingsMenuMaxHeight] = useState<number | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement | null>(null)
  const [statCols, setStatCols] = useState<[string, string]>(() => {
    try {
      const s = localStorage.getItem("timer-stat-rows")
      if (s) return JSON.parse(s)
    } catch {}
    return ["ao5", "ao12"]
  })
  const {
    layout: paneLayout,
    panes,
    paneByTool,
    addPane,
    removePane,
    setPaneSlot,
    changePaneTool,
    updatePaneOptions,
    setAutoHideDuringSolve,
    setDesktopPaneSize,
    moveMobilePane,
    setMobilePaneHeight,
  } = useTimerPaneLayout("main")
  const timerTopAreaRef = useRef<HTMLDivElement | null>(null)
  const solveListPanelRef = useRef<SolveListPanelHandle | null>(null)
  const sessionSolveStartIndexRef = useRef<number>((() => {
    try {
      const raw = Number(localStorage.getItem(SESSION_START_SOLVE_INDEX_KEY) ?? 0)
      return Number.isFinite(raw) && raw >= 0 ? raw : 0
    } catch {
      return 0
    }
  })())
  const [desktopPaneTopOffsetPx, setDesktopPaneTopOffsetPx] = useState(112)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_START_KEY)
      if (!raw) return null
      const parsed = Number(raw)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    } catch {
      return null
    }
  })
  const [sessionPaused, setSessionPaused] = useState(() => {
    if (sessionStartTime === null) return false
    try {
      return localStorage.getItem(SESSION_PAUSED_KEY) === "true"
    } catch {
      return false
    }
  })
  const [sessionElapsed, setSessionElapsed] = useState(() => {
    if (sessionStartTime === null) return 0
    try {
      const pausedMsRaw = Number(localStorage.getItem(SESSION_PAUSED_MS_KEY) ?? 0)
      const pausedMs = Number.isFinite(pausedMsRaw) && pausedMsRaw >= 0 ? pausedMsRaw : 0
      const paused = localStorage.getItem(SESSION_PAUSED_KEY) === "true"
      const pausedAtRaw = Number(localStorage.getItem(SESSION_PAUSED_AT_KEY) ?? 0)
      const pausedAt =
        paused && Number.isFinite(pausedAtRaw) && pausedAtRaw > 0 ? pausedAtRaw : null
      const inFlightPauseMs = pausedAt ? Date.now() - pausedAt : 0
      return Math.max(
        0,
        Math.floor((Date.now() - sessionStartTime - pausedMs - inFlightPauseMs) / 1000)
      )
    } catch {
      return 0
    }
  })
  const [showEndModal, setShowEndModal] = useState(false)
  const [pendingEventSwitch, setPendingEventSwitch] = useState<string | null>(null)
  const [pendingPracticeTypeSwitch, setPendingPracticeTypeSwitch] = useState<string | null>(null)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [pbPhotoOpen, setPbPhotoOpen] = useState(false)
  const [detailSolveOverride, setDetailSolveOverride] = useState<Solve | null>(null)
  const [allTimeAnalytics, setAllTimeAnalytics] = useState<TimerEventAnalytics | null>(null)
  const [allTimeAnalyticsEvent, setAllTimeAnalyticsEvent] = useState<string | null>(null)
  const [solveListSummary, setSolveListSummary] = useState<TimerSolveListSummary | null>(null)
  const [solveListSummaryEvent, setSolveListSummaryEvent] = useState<string | null>(null)
  const [solveListSummaryError, setSolveListSummaryError] = useState<string | null>(null)
  const [stats, setStats] = useState<SolveStats>(() => computeStatsSync([], ["ao5", "ao12"]))
  const [sessionGroups, setSessionGroups] = useState<SessionGroupMeta[]>([])
  const [historyRetrySeed, setHistoryRetrySeed] = useState(0)
  const [mobilePaneOpenRequestKey, setMobilePaneOpenRequestKey] = useState(0)
  const [solveRange, setSolveRange] = useState({
    start: 0,
    end: INITIAL_SOLVE_WINDOW,
  })
  const [pausedAttemptMessage, setPausedAttemptMessage] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [showBtReconnect, setShowBtReconnect] = useState(() => {
    try {
      return isBleSupported() && localStorage.getItem("timer-last-input-bt") === "true"
    } catch {
      return false
    }
  })
  const [shareCardData, setShareCardData] = useState<ShareCardData | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [compSimEntryGuard, setCompSimEntryGuard] = useState<CompSimEntryGuard | null>(null)
  const [compSimBusy, setCompSimBusy] = useState(false)
  const [pendingStoppedSolve, setPendingStoppedSolve] =
    useState<SharedTimerLastSolve>(null)
  const [compSimConfig, setCompSimConfig] = useState<CompSimRoundConfig>(() => {
    try {
      const raw = localStorage.getItem(COMP_SIM_CONFIG_KEY)
      if (!raw) return DEFAULT_COMP_SIM_ROUND_CONFIG
      return normalizeCompSimConfig(JSON.parse(raw) as Partial<CompSimRoundConfig>)
    } catch {
      return DEFAULT_COMP_SIM_ROUND_CONFIG
    }
  })
  const [syncingFromCloud, setSyncingFromCloud] = useState(false)
  const [compSimStartSignal, setCompSimStartSignal] = useState(0)
  const [compSimAutoStartRequested, setCompSimAutoStartRequested] = useState(false)
  const [shareAuthor, setShareAuthor] = useState({
    userName: "You",
    handle: "you",
    avatarUrl: null as string | null,
  })
  const {
    historyStatus,
    historyError,
    savedSolveCursor,
    reset: resetEventHistory,
    startBootstrap: startHistoryBootstrap,
    markReady: markHistoryReady,
    markEmpty: markHistoryEmpty,
    markError: markHistoryError,
    syncTotalSavedCount,
    incrementTotalSavedCount,
    decrementTotalSavedCount,
    setCursor: setHistoryCursor,
  } = useTimerEventHistory()
  const activeTour = parseOnboardingTour(searchParams.get("tour"))
  const timerTour =
    activeTour === "timer-basics"
      ? activeTour
      : activeTour === "comp-sim" && practiceType === "Comp Sim"
        ? activeTour
        : null
  const handledCompSimTourRef = useRef(false)

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const prevRootOverflowY = root.style.overflowY
    const prevBodyOverflowY = body.style.overflowY
    const prevScrollRestoration = window.history.scrollRestoration

    const resetPageScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
      root.scrollTop = 0
      body.scrollTop = 0
    }

    const syncTimerViewport = () => {
      const navbar = document.querySelector("header")
      const navbarHeight = navbar instanceof HTMLElement ? navbar.offsetHeight : 0
      root.style.setProperty("--timer-navbar-height", `${navbarHeight}px`)
    }

    window.history.scrollRestoration = "manual"
    resetPageScroll()
    const rafId = window.requestAnimationFrame(resetPageScroll)
    const timeoutId = window.setTimeout(resetPageScroll, 0)
    syncTimerViewport()
    root.style.overflowY = "hidden"
    body.style.overflowY = "hidden"
    window.addEventListener("resize", syncTimerViewport)

    return () => {
      window.removeEventListener("resize", syncTimerViewport)
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      root.style.overflowY = prevRootOverflowY
      body.style.overflowY = prevBodyOverflowY
      window.history.scrollRestoration = prevScrollRestoration
      root.style.removeProperty("--timer-navbar-height")
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(COMP_SIM_CONFIG_KEY, JSON.stringify(compSimConfig))
    } catch {}
  }, [compSimConfig])

  useEffect(() => {
    const node = timerTopAreaRef.current
    if (!node) return

    const measure = () => {
      const { bottom } = node.getBoundingClientRect()
      setDesktopPaneTopOffsetPx(bottom + 8)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    window.addEventListener("resize", measure)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [practiceType, scrambleError, scramble])

  useEffect(() => {
    let cancelled = false
    void getProfile()
      .then(({ profile }) => {
        if (cancelled || !profile) return
        setShareAuthor({
          userName: profile.display_name || "You",
          handle: profile.handle || "you",
          avatarUrl: profile.avatar_url ?? null,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setSolveListSummaryError(null)

    // Phase 1: Show cached data instantly (stale-while-revalidate)
    void Promise.all([
      getCachedStats<TimerEventAnalytics>(`analytics:${event}`),
      getCachedStats<TimerSolveListSummary>(`solveListSummary:${event}`),
    ]).then(([cachedAnalytics, cachedSummary]) => {
      if (cancelled) return
      if (cachedAnalytics) {
        setAllTimeAnalytics(cachedAnalytics)
        setAllTimeAnalyticsEvent(event)
      }
      if (cachedSummary) {
        setSolveListSummary(cachedSummary)
        setSolveListSummaryEvent(event)
      }
    })

    // Phase 2: Fetch fresh data from server in background
    void Promise.all([getEventAnalytics(event), getTimerSolveListSummary(event)])
      .then(([analyticsResult, solveListSummaryResult]) => {
        if (cancelled) return
        setAllTimeAnalytics(analyticsResult.data)
        setAllTimeAnalyticsEvent(event)
        setSolveListSummary(solveListSummaryResult.data)
        setSolveListSummaryEvent(event)
        setSolveListSummaryError(solveListSummaryResult.error ?? null)
        // Write fresh results to cache
        if (analyticsResult.data) {
          void setCachedStats(`analytics:${event}`, analyticsResult.data)
        }
        if (solveListSummaryResult.data) {
          void setCachedStats(`solveListSummary:${event}`, solveListSummaryResult.data)
        }
      })
      .catch(() => {
        if (cancelled) return
        // Only show error if we had no cached data
        if (!allTimeAnalytics) setAllTimeAnalytics(null)
        setAllTimeAnalyticsEvent(event)
        if (!solveListSummary) setSolveListSummary(null)
        setSolveListSummaryEvent(event)
        setSolveListSummaryError("Failed to load exact timer summary.")
      })
    return () => {
      cancelled = true
    }
  }, [event])

  const engineRef = useRef(createTimerEngine({ phase: "idle", scrambleReady: false }))
  const [engineSnapshot, setEngineSnapshot] = useState(() => engineRef.current.getSnapshot())
  const phase = engineSnapshot.phase

  const solveStoreRef = useRef(createSolveStore())
  const statsWorkerRef = useRef<Worker | null>(null)
  const scrambleWorkerRef = useRef<Worker | null>(null)
  const btCallbacksRef = useRef<BtTimerCallbacks>({
    onHandsOn: () => {},
    onGetSet: () => {},
    onHandsOff: () => {},
    onRunning: () => {},
    onStopped: () => {},
    onIdle: () => {},
    onDisconnect: () => {},
  })

  const { btStatus, connect: btConnect, disconnect: btDisconnect } =
    useBluetoothTimer(btCallbacksRef.current)

  const phaseRef = useRef<TimerPhase>("idle")
  const heldRef = useRef(false)
  const holdTimeoutRef = useRef<number | null>(null)
  const holdMsRef = useRef<HoldMs>(holdMs)
  const scrambleRef = useRef("")
  const eventRef = useRef("333")
  const inspOnRef = useRef(false)
  const inspRef = useRef<ReturnType<typeof useInspection> | null>(null)
  const inspHoldRef = useRef(false)
  const tapToInspectRef = useRef(false)
  const inspectionPenaltyRef = useRef<"+2" | "DNF" | null>(null)
  const btConnectedRef = useRef(false)
  const practiceTypeRef = useRef(practiceType)
  const compSimBusyRef = useRef(false)
  const compSimBtRef = useRef<CompSimBtHandle | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsOpenRef = useRef(false)
  const shareModalOpenRef = useRef(false)
  const scrambleHistoryRef = useRef<string[]>([])
  const scrambleIdxRef = useRef(0)
  const nextScrambleRef = useRef<string | null>(null)
  const scrambleRequestSeqRef = useRef(0)
  const pendingScrambleRef = useRef<Map<number, PendingScrambleRequest>>(new Map())
  const scrambleReadyRef = useRef(false)
  const sessionPausedMsRef = useRef<number>(
    (() => {
      try {
        const parsed = Number(localStorage.getItem(SESSION_PAUSED_MS_KEY) ?? 0)
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
      } catch {
        return 0
      }
    })()
  )
  const pausedAtRef = useRef<number | null>(
    (() => {
      if (!sessionPaused) return null
      try {
        const raw = localStorage.getItem(SESSION_PAUSED_AT_KEY)
        if (!raw) return null
        const parsed = Number(raw)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null
      } catch {
        return null
      }
    })()
  )
  const sessionPausedRef = useRef(false)
  const pausedAttemptTimeoutRef = useRef<number | null>(null)
  const suppressUiResetRef = useRef<number | null>(null)
  const solvesRef = useRef<Solve[]>([])
  const statColsRef = useRef<[string, string]>(statCols)
  const btSolveFinalizedRef = useRef(false)
  const lastBtIdleResetRef = useRef(0)
  const shortcutSolveRef = useRef<Solve | null>(null)
  const [shortcutMap, setShortcutMap] = useState<ShortcutMap>(() => loadShortcutMap())
  const shortcutMapRef = useRef(shortcutMap)

  const refreshAllTimeAnalytics = useCallback((eventId: string) => {
    void Promise.all([
      getEventAnalytics(eventId),
      getTimerSolveListSummary(eventId, { forceRefresh: true }),
    ])
      .then(([analyticsResult, solveListSummaryResult]) => {
        if (eventRef.current !== eventId) return
        setAllTimeAnalytics(analyticsResult.data)
        setAllTimeAnalyticsEvent(eventId)
        setSolveListSummary(solveListSummaryResult.data)
        setSolveListSummaryEvent(eventId)
        setSolveListSummaryError(solveListSummaryResult.error ?? null)
        // Update cache with fresh data
        if (analyticsResult.data) {
          void setCachedStats(`analytics:${eventId}`, analyticsResult.data)
        }
        if (solveListSummaryResult.data) {
          void setCachedStats(`solveListSummary:${eventId}`, solveListSummaryResult.data)
        }
      })
      .catch(() => {})
  }, [])

  const retryEventHistoryLoad = useCallback(() => {
    setHistoryRetrySeed((previous) => previous + 1)
  }, [])

  const loadLocalSolveWindow = useCallback(async (eventId: string): Promise<Solve[]> => {
    const allSolves = await solveStoreRef.current.loadSession(eventId)
    return allSolves as Solve[]
  }, [])

  const hydrateDividerMetadata = useCallback(async (
    eventId: string,
    nextSolves: Solve[]
  ): Promise<SessionGroupMeta[] | null> => {
    const groupedIds = Array.from(
      new Set(
        nextSolves
          .map((solve) => solve.group)
          .filter(
            (groupId): groupId is string =>
              typeof groupId === "string" &&
              groupId.length > 0 &&
              !groupId.startsWith("date:")
          )
      )
    )

    if (groupedIds.length === 0) return null

    const existingGroups = loadSessionGroups(eventId)
    const existingById = new Map(existingGroups.map((group) => [group.id, group]))
    const refreshIds = groupedIds.filter((groupId) => {
      const existing = existingById.get(groupId)
      if (!existing) return true
      return (
        !existing.sessionId ||
        !existing.timerSessionId ||
        typeof existing.durationMinutes !== "number" ||
        !existing.practiceType ||
        existing.title.trim().toLowerCase() === "saved session"
      )
    })
    if (refreshIds.length === 0) return null

    const { data, error } = await getSessionDividerGroupsByTimerSession(eventId, refreshIds)
    if (error || data.length === 0) return null

    let changed = false
    for (const group of data) {
      const existing = existingById.get(group.id)
      if (!existing) {
        existingById.set(group.id, group)
        changed = true
        continue
      }
      const mergedGroup = { ...existing, ...group }
      if (
        existing.title !== mergedGroup.title ||
        existing.savedAt !== mergedGroup.savedAt ||
        existing.solveCount !== mergedGroup.solveCount ||
        existing.sessionId !== mergedGroup.sessionId ||
        existing.timerSessionId !== mergedGroup.timerSessionId ||
        existing.durationMinutes !== mergedGroup.durationMinutes ||
        existing.numDnf !== mergedGroup.numDnf ||
        existing.avgSeconds !== mergedGroup.avgSeconds ||
        existing.bestSeconds !== mergedGroup.bestSeconds ||
        existing.practiceType !== mergedGroup.practiceType
      ) {
        existingById.set(group.id, mergedGroup)
        changed = true
      }
    }

    if (!changed) return null

    const merged = Array.from(existingById.values()).sort((a, b) => a.savedAt - b.savedAt)
    saveSessionGroups(eventId, merged)
    return merged
  }, [])

  const updateSavedSessionGroupDuration = useCallback((groupId: string, durationMinutes: number) => {
    setSessionGroups((previous) => {
      const nextGroups = previous.map((group) =>
        group.id === groupId ? { ...group, durationMinutes } : group
      )
      saveSessionGroups(eventRef.current, nextGroups)
      return nextGroups
    })
  }, [])

  const insp = useInspection({
    voice: inspVoiceOn,
    voiceGender: inspVoiceGender,
  })

  const dispatchEngine = useCallback((eventMessage: TimerEvent) => {
    engineRef.current.dispatch(eventMessage)
  }, [])
  const solveClock = useSolveClock({
    enabled: practiceType !== "Comp Sim",
    onStall: (deltaMs) => {
      emitTimerTelemetry("timer_stall_detected", { deltaMs })
      if (TIMER_V2_ENGINE_ENABLED) {
        engineRef.current.dispatch({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: true })
      }
    },
    onInputDelay: (delayMs) => {
      emitTimerTelemetry("timer_input_delay_ms", { delayMs, scope: "main_timer" })
    },
  })

  const updateSettingsMenuMaxHeight = useCallback(() => {
    if (typeof window === "undefined") return
    const rect = settingsRef.current?.getBoundingClientRect()
    if (!rect) return
    const nextMaxHeight = Math.floor(
      window.innerHeight - rect.bottom - SETTINGS_MENU_VIEWPORT_MARGIN_PX
    )
    setSettingsMenuMaxHeight(Math.max(SETTINGS_MENU_MIN_HEIGHT_PX, nextMaxHeight))
  }, [])

  phaseRef.current = phase
  scrambleRef.current = scramble
  eventRef.current = event
  inspOnRef.current = inspOn
  holdMsRef.current = holdMs
  inspRef.current = insp
  sessionPausedRef.current = sessionPaused
  practiceTypeRef.current = practiceType
  compSimBusyRef.current = compSimBusy
  scrambleReadyRef.current = engineSnapshot.scrambleReady
  solvesRef.current = solves
  statColsRef.current = statCols
  shortcutMapRef.current = shortcutMap
  settingsOpenRef.current = settingsOpen
  shareModalOpenRef.current = shareModalOpen

  // Compute saved vs current session solve counts for display + stats
  const unsavedSolves = useMemo(() => getTrailingUnsavedSolves(solves), [solves])
  const loadedSavedSolveCount = solves.length - unsavedSolves.length
  const totalSolveCount = solves.length
  const hasActiveSession =
    sessionStartTime !== null && Number.isFinite(sessionStartTime) && sessionStartTime > 0
  const getCurrentSessionSolves = useCallback((allSolves: Solve[]) => {
    const unsaved = getTrailingUnsavedSolves(allSolves)
    if (!hasActiveSession) return unsaved
    const startIndex = Math.min(sessionSolveStartIndexRef.current, unsaved.length)
    return unsaved.slice(startIndex)
  }, [hasActiveSession])
  const currentSessionSolves = useMemo(
    () => getCurrentSessionSolves(solves),
    [getCurrentSessionSolves, solves]
  )
  const currentSolveCount = currentSessionSolves.length
  // Worker stats already cover all loaded solves (including history), so use them directly.
  const showAllStatsInList = loadedSavedSolveCount > 0
  const visibleListStats = stats
  const panelSavedSolveCount = showAllStatsInList ? 0 : loadedSavedSolveCount

  function clearTour() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tour")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const groupDividers = useMemo(
    () => computeSessionDividers(solves, sessionGroups),
    [sessionGroups, solves]
  )

  const currentSessionLabel = useMemo(() => {
    if (currentSolveCount <= 0) return null
    const dateSource = hasActiveSession ? new Date(sessionStartTime) : new Date()
    return {
      title: "Current Session",
      date: formatSessionDividerDate(dateSource),
    }
  }, [currentSolveCount, hasActiveSession, sessionStartTime])

  const activeSessionStartMs = hasActiveSession ? sessionStartTime : null

  const setIdle = useCallback(() => {
    dispatchEngine({ type: "RESET_IDLE" })
  }, [dispatchEngine])

  const goToScramble = useCallback((idx: number) => {
    scrambleIdxRef.current = idx
    const value = scrambleHistoryRef.current[idx]
    if (value) setScramble(value)
    setScrambleCanGoPrev(idx > 0)
  }, [])

  const resetScrambleHistory = useCallback((value: string) => {
    scrambleHistoryRef.current = [value]
    scrambleIdxRef.current = 0
    setScramble(value)
    setScrambleCanGoPrev(false)
  }, [])

  const clearPendingScrambleRequests = useCallback(() => {
    for (const pending of pendingScrambleRef.current.values()) {
      clearTimeout(pending.timeoutId)
    }
    pendingScrambleRef.current.clear()
  }, [])

  const hasPendingScrambleKind = useCallback(
    (kind: "current" | "prefetch", eventId: string) => {
      for (const pending of pendingScrambleRef.current.values()) {
        if (pending.kind === kind && pending.eventId === eventId) return true
      }
      return false
    },
    []
  )

  const requestScramble = useCallback(
    (kind: "current" | "prefetch", eventId = eventRef.current, attempt = 1) => {
      const worker = scrambleWorkerRef.current
      if (!worker) {
        if (kind === "current") {
          dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
          setScramble("Scramble worker unavailable")
          setScrambleError("Scramble worker unavailable in this browser tab")
          emitTimerTelemetry("timer_error", { scope: "scramble-worker-init" })
        }
        return
      }

      const requestId = ++scrambleRequestSeqRef.current
      const timeoutId = window.setTimeout(() => {
        const pending = pendingScrambleRef.current.get(requestId)
        if (!pending) return
        pendingScrambleRef.current.delete(requestId)
        emitTimerTelemetry("scramble_worker_timeout", {
          eventId: pending.eventId,
          kind: pending.kind,
          attempt: pending.attempt,
        })
        if (pending.attempt < SCRAMBLE_MAX_RETRIES) {
          requestScramble(pending.kind, pending.eventId, pending.attempt + 1)
          return
        }
        if (pending.kind === "current" && pending.eventId === eventRef.current) {
          dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
          setScrambleError("Scramble generation timed out. Retrying in background.")
        }
      }, SCRAMBLE_TIMEOUT_MS)

      const pending: PendingScrambleRequest = {
        requestId,
        eventId,
        kind,
        attempt,
        timeoutId,
      }
      pendingScrambleRef.current.set(requestId, pending)
      const message: ScrambleWorkerRequest = { requestId, eventId }
      worker.postMessage(message)
    },
    [dispatchEngine]
  )

  const solveRows = useMemo((): SolveListRow[] => {
    const rows: SolveListRow[] = []
    for (
      let displayIndex = solveRange.start;
      displayIndex < solveRange.end && displayIndex < solves.length;
      displayIndex++
    ) {
      const solveIndex = solves.length - 1 - displayIndex
      if (solveIndex < 0) break
      rows.push({
        solve: solves[solveIndex],
        solveIndex,
        displayNumber: totalSolveCount - displayIndex,
      })
    }
    return rows
  }, [solveRange.end, solveRange.start, solves, totalSolveCount])

  const initStats = useCallback(
    (sessionId: string, seedSolves: Solve[]) => {
      if (!statsWorkerRef.current) {
        setStats(computeStatsSync(seedSolves, statColsRef.current))
        return
      }
      const message: StatsWorkerRequest = {
        type: "init",
        sessionId,
        solves: seedSolves,
        statCols: statColsRef.current,
        milestones: MILESTONES,
      }
      statsWorkerRef.current.postMessage(message)
    },
    []
  )

  const appendStats = useCallback((sessionId: string, solve: Solve) => {
    if (!statsWorkerRef.current) {
      setStats(computeStatsSync([...solvesRef.current, solve], statColsRef.current))
      return
    }
    const message: StatsWorkerRequest = { type: "append", sessionId, solve }
    statsWorkerRef.current.postMessage(message)
  }, [])

  const updateStatsForPenalty = useCallback(
    (sessionId: string, id: string, penalty: Penalty) => {
      if (!statsWorkerRef.current) {
        const next = solvesRef.current.map((solve) =>
          solve.id === id ? { ...solve, penalty } : solve
        )
        setStats(computeStatsSync(next, statColsRef.current))
        return
      }
      const message: StatsWorkerRequest = {
        type: "update",
        sessionId,
        id,
        penalty,
      }
      statsWorkerRef.current.postMessage(message)
    },
    []
  )

  const deleteStatsSolve = useCallback((sessionId: string, id: string) => {
    if (!statsWorkerRef.current) {
      const next = solvesRef.current.filter((solve) => solve.id !== id)
      setStats(computeStatsSync(next, statColsRef.current))
      return
    }
    const message: StatsWorkerRequest = { type: "delete", sessionId, id }
    statsWorkerRef.current.postMessage(message)
  }, [])

  const recomputeStats = useCallback(
    (sessionId: string, seedSolves?: Solve[]) => {
      if (!statsWorkerRef.current) {
        setStats(computeStatsSync(seedSolves ?? solvesRef.current, statColsRef.current))
        return
      }
      const message: StatsWorkerRequest = {
        type: "recompute",
        sessionId,
        solves: seedSolves,
        statCols: statColsRef.current,
        milestones: MILESTONES,
      }
      statsWorkerRef.current.postMessage(message)
    },
    []
  )

  const consumeNextScramble = useCallback(() => {
    const eventId = eventRef.current
    const currentValue =
      scrambleHistoryRef.current[scrambleIdxRef.current] ?? scrambleRef.current

    if (nextScrambleRef.current) {
      const next = nextScrambleRef.current
      nextScrambleRef.current = null
      scrambleHistoryRef.current = [currentValue, next]
      goToScramble(1)
      dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: true })
      if (!hasPendingScrambleKind("prefetch", eventId)) {
        requestScramble("prefetch", eventId, 1)
      }
      return
    }

    scrambleHistoryRef.current = [currentValue, "Generating scramble..."]
    goToScramble(1)
    dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
    if (!hasPendingScrambleKind("current", eventId)) {
      requestScramble("current", eventId, 1)
    }
  }, [dispatchEngine, goToScramble, hasPendingScrambleKind, requestScramble])

  const migrateLegacySolves = useCallback(async (sessionId: string) => {
    if (typeof window === "undefined") return
    const migratedKey = "timer-solves-migrated-v2"
    if (localStorage.getItem(migratedKey) === "true") return

    const raw = localStorage.getItem("timer-solves")
    if (!raw) {
      localStorage.setItem(migratedKey, "true")
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      localStorage.removeItem("timer-solves")
      localStorage.setItem(migratedKey, "true")
      return
    }

    const legacy = Array.isArray(parsed)
      ? parsed
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null
            const candidate = entry as Partial<Solve>
            if (typeof candidate.id !== "string") return null
            if (typeof candidate.time_ms !== "number") return null
            if (typeof candidate.scramble !== "string") return null
            const penalty: Penalty =
              candidate.penalty === "+2" || candidate.penalty === "DNF"
                ? candidate.penalty
                : null
            return {
              id: candidate.id,
              time_ms: Math.max(0, Math.round(candidate.time_ms)),
              penalty,
              scramble: candidate.scramble,
            } satisfies Solve
          })
          .filter((solve): solve is Solve => solve !== null)
      : []

    const existing = await solveStoreRef.current.count(sessionId)
    if (existing === 0 && legacy.length > 0) {
      await solveStoreRef.current.replaceSession(sessionId, legacy)
    }

    localStorage.removeItem("timer-solves")
    localStorage.setItem(migratedKey, "true")
  }, [])

  useEffect(() => {
    return engineRef.current.subscribe(setEngineSnapshot)
  }, [])

  useEffect(() => {
    solveStoreRef.current.onFallback = (reason) => {
      setStorageWarning("Solves are stored in memory only — they'll be lost if you refresh the page.")
      emitTimerTelemetry("timer_error", { scope: "solve_store_fallback", reason })
    }
  }, [])

  useEffect(() => {
    if (!TIMER_V2_ENGINE_ENABLED) return
    try {
      const worker = new Worker(
        new URL("../../lib/timer/stats-worker.ts", import.meta.url)
      )
      worker.onmessage = (eventMessage: MessageEvent<StatsWorkerResponse>) => {
        const message = eventMessage.data
        if (message.type === "error") {
          emitTimerTelemetry("timer_error", {
            scope: "stats_worker",
            message: message.message,
          })
          return
        }
        if (message.sessionId !== eventRef.current) return
        setStats(summaryToStats(message.summary))
        if (message.latencyMs > 16) {
          emitTimerTelemetry("stats_worker_latency_ms", {
            latencyMs: message.latencyMs,
            solveCount: solvesRef.current.length,
            sessionId: message.sessionId,
          })
        }
      }
      worker.onerror = (errorEvent) => {
        errorEvent.preventDefault()
        emitTimerTelemetry("timer_error", {
          scope: "stats_worker_crash",
          message: errorEvent.message,
        })
        worker.terminate()
        statsWorkerRef.current = null
        setStats(computeStatsSync(solvesRef.current, statColsRef.current))
      }
      statsWorkerRef.current = worker
      initStats(eventRef.current, solvesRef.current)
    } catch {
      statsWorkerRef.current = null
    }
    return () => {
      statsWorkerRef.current?.terminate()
      statsWorkerRef.current = null
    }
  }, [initStats])

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL("../../lib/timer/scramble-worker.ts", import.meta.url)
      )
      worker.onmessage = (eventMessage: MessageEvent<ScrambleWorkerResponse>) => {
        const message = eventMessage.data
        const pending = pendingScrambleRef.current.get(message.requestId)
        if (!pending) return
        pendingScrambleRef.current.delete(message.requestId)
        clearTimeout(pending.timeoutId)

        if (pending.eventId !== eventRef.current) return
        if (message.eventId !== pending.eventId) return

        if (!message.scramble) {
          if (pending.attempt < SCRAMBLE_MAX_RETRIES) {
            requestScramble(pending.kind, pending.eventId, pending.attempt + 1)
            return
          }
          if (pending.kind === "current") {
            dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
            setScrambleError("Failed to generate scramble. Please wait and retry.")
          }
          emitTimerTelemetry("timer_error", {
            scope: "scramble_worker",
            eventId: pending.eventId,
            kind: pending.kind,
            message: message.error ?? "null scramble",
          })
          return
        }

        if (pending.kind === "current") {
          setScrambleError(message.warning ?? null)
          if (message.warning) {
            emitTimerTelemetry("timer_error", {
              scope: "scramble_worker_fallback",
              eventId: pending.eventId,
              kind: pending.kind,
              message: message.warning,
            })
          }
          resetScrambleHistory(message.scramble)
          dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: true })
          if (!hasPendingScrambleKind("prefetch", pending.eventId)) {
            requestScramble("prefetch", pending.eventId, 1)
          }
          return
        }

        if (message.warning) {
          emitTimerTelemetry("timer_error", {
            scope: "scramble_worker_fallback",
            eventId: pending.eventId,
            kind: pending.kind,
            message: message.warning,
          })
        }
        nextScrambleRef.current = message.scramble
      }
      worker.onerror = (errorEvent) => {
        errorEvent.preventDefault()
        emitTimerTelemetry("timer_error", {
          scope: "scramble_worker_crash",
          message: errorEvent.message,
        })
        worker.terminate()
        scrambleWorkerRef.current = null
        setScrambleError("Scramble worker crashed. Attempting restart...")
        setTimeout(() => {
          try {
            const newWorker = new Worker(
              new URL("../../lib/timer/scramble-worker.ts", import.meta.url)
            )
            newWorker.onmessage = worker.onmessage
            newWorker.onerror = worker.onerror
            scrambleWorkerRef.current = newWorker
            requestScramble("current", eventRef.current, 1)
            setScrambleError(null)
          } catch {
            setScrambleError("Scramble generation unavailable. Please refresh the page.")
          }
        }, 500)
      }
      scrambleWorkerRef.current = worker
    } catch {
      scrambleWorkerRef.current = null
      dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
      setScramble("Scramble worker unavailable")
      setScrambleError("Failed to start scramble worker")
    }
    return () => {
      clearPendingScrambleRequests()
      scrambleWorkerRef.current?.terminate()
      scrambleWorkerRef.current = null
    }
  }, [
    clearPendingScrambleRequests,
    dispatchEngine,
    hasPendingScrambleKind,
    requestScramble,
    resetScrambleHistory,
  ])

  useEffect(() => {
    let cancelled = false
    const groups = loadSessionGroups(event)
    setSessionGroups(groups)
    resetEventHistory()
    startHistoryBootstrap()
    setDetailSolveOverride(null)
    ;(async () => {
      await migrateLegacySolves(event)
      const loadedWindow = await loadLocalSolveWindow(event)
      const loadedRaw = loadedWindow
      let loaded = loadedRaw

      const metadataBackfill = backfillGroupsFromMetadata(loadedRaw, groups)
      if (metadataBackfill.changed) {
        loaded = metadataBackfill.solves
        void solveStoreRef.current
          .replaceSession(event, loaded)
          .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_replace_backfill" }))
      }

      if (cancelled) return

      const finalizeVisibleWindow = (nextSolves: Solve[]) => {
        setSolves(nextSolves)
        setSelectedId(null)
        setDetailSolveId(null)
        setSolveRange((prev) => ({
          ...prev,
          start: 0,
          end: Math.max(INITIAL_SOLVE_WINDOW, prev.end),
        }))
        initStats(event, nextSolves)
        void hydrateDividerMetadata(event, nextSolves).then((mergedGroups) => {
          if (cancelled || !mergedGroups || eventRef.current !== event) return
          setSessionGroups(mergedGroups)
        })
      }

      const loadedSavedCount = Math.max(
        0,
        loaded.length - getTrailingUnsavedSolves(loaded).length
      )

      if (loaded.length > 0) {
        finalizeVisibleWindow(loaded)
        markHistoryReady({
          totalSavedCount: loadedSavedCount,
          cursor: getSavedSolveWindowCursor(loaded),
        })

        void getSolveCountByEvent(event).then((countResult) => {
          if (cancelled || countResult.error) return
          syncTotalSavedCount(countResult.count)
        })
      } else {
        // Fetch ALL solves from server (paginated in batches of 2000)
        const allBootSolves: Solve[] = []
        let bootOffset = 0
        const BOOT_PAGE = 1000
        let bootError: string | undefined
        while (true) {
          const page = await listRecentEventSolves({
            event,
            limit: BOOT_PAGE,
            offset: bootOffset,
          })
          if (page.error) { bootError = page.error; break }
          if (page.solves.length === 0) break
          allBootSolves.push(...page.solves.map(toTimerSolve))
          if (page.solves.length < BOOT_PAGE) break
          bootOffset += BOOT_PAGE
        }

        // listRecentEventSolves already returns oldest-first (it reverses
        // internally). The display formula (`solves.length - 1 - displayIndex`)
        // expects oldest-first so no further reordering is needed.

        if (cancelled) return

        if (bootError) {
          setSolves([])
          setSelectedId(null)
          setDetailSolveId(null)
          initStats(event, [])
          markHistoryError(bootError)
          return
        }

        if (allBootSolves.length === 0) {
          setSolves([])
          setSelectedId(null)
          setDetailSolveId(null)
          initStats(event, [])
          markHistoryEmpty()
          return
        }

        await solveStoreRef.current
          .replaceSession(event, allBootSolves)
          .catch(() =>
            emitTimerTelemetry("timer_error", { scope: "solve_store_replace_bootstrap" })
          )

        if (cancelled) return

        finalizeVisibleWindow(allBootSolves)
        markHistoryReady({
          totalSavedCount: allBootSolves.length,
          cursor: getSavedSolveWindowCursor(allBootSolves),
        })
        loaded = allBootSolves
      }

      // Background cross-device sync: if DB has more solves than local,
      // pull them in. This is a one-time cost per device per event.
      const shouldBackfillGroups = needsHistoricGroupBackfill(loaded)

      setSyncingFromCloud(true)
      syncSolvesFromDb(event, solveStoreRef.current, {
        forceGroupBackfill: shouldBackfillGroups,
        localSolves: loaded,
      }).then(
        (synced) => {
          if (cancelled || !synced) return
          setSolves(synced)
          setHistoryCursor(getSavedSolveWindowCursor(synced))
          initStats(event, synced)
          void hydrateDividerMetadata(event, synced).then((mergedGroups) => {
            if (cancelled || !mergedGroups || eventRef.current !== event) return
            setSessionGroups(mergedGroups)
          })
        }
      ).finally(() => {
        if (!cancelled) setSyncingFromCloud(false)
      })
    })()
    return () => {
      cancelled = true
    }
  }, [
    event,
    getCurrentSessionSolves,
    hydrateDividerMetadata,
    historyRetrySeed,
    initStats,
    loadLocalSolveWindow,
    markHistoryEmpty,
    markHistoryError,
    markHistoryReady,
    migrateLegacySolves,
    resetEventHistory,
    setHistoryCursor,
    startHistoryBootstrap,
    syncTotalSavedCount,
  ])

  useEffect(() => {
    clearPendingScrambleRequests()
    nextScrambleRef.current = null
    scrambleHistoryRef.current = []
    scrambleIdxRef.current = 0
    setScramble("Generating scramble...")
    setScrambleCanGoPrev(false)
    setScrambleError(null)
    dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
    requestScramble("current", event, 1)
  }, [clearPendingScrambleRequests, dispatchEngine, event, requestScramble])

  useEffect(() => {
    recomputeStats(event)
  }, [event, recomputeStats, statCols])

  useEffect(() => {
    setSolveRange((previous) => {
      if (solves.length === 0) {
        if (previous.start === 0 && previous.end === 0) return previous
        return { start: 0, end: 0 }
      }
      const maxStart = Math.max(0, solves.length - 1)
      const nextStart = Math.min(previous.start, maxStart)
      const nextEnd = Math.max(nextStart + 1, Math.min(previous.end, solves.length))
      if (nextStart === previous.start && nextEnd === previous.end) {
        return previous
      }
      return { start: nextStart, end: nextEnd }
    })
  }, [solves.length])

  useEffect(() => {
    try {
      if (hasActiveSession) {
        localStorage.setItem(SESSION_START_KEY, String(sessionStartTime))
        localStorage.setItem(
          SESSION_START_SOLVE_INDEX_KEY,
          String(sessionSolveStartIndexRef.current)
        )
      } else {
        localStorage.removeItem(SESSION_START_KEY)
        localStorage.removeItem(SESSION_START_SOLVE_INDEX_KEY)
        localStorage.removeItem(SESSION_PAUSED_MS_KEY)
        localStorage.removeItem(SESSION_PAUSED_KEY)
        localStorage.removeItem(SESSION_PAUSED_AT_KEY)
      }
    } catch {}
  }, [hasActiveSession, sessionStartTime])

  useEffect(() => {
    if (!hasActiveSession || !sessionPaused || pausedAtRef.current !== null) return
    const pausedAt = Date.now()
    pausedAtRef.current = pausedAt
    try {
      localStorage.setItem(SESSION_PAUSED_AT_KEY, String(pausedAt))
    } catch {}
  }, [hasActiveSession, sessionPaused])

  useEffect(() => {
    if (!hasActiveSession || sessionPaused) return
    const interval = setInterval(() => {
      setSessionElapsed(
        Math.floor(
          (Date.now() - sessionStartTime - sessionPausedMsRef.current) / 1000
        )
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [hasActiveSession, sessionPaused, sessionStartTime])

  useEffect(() => {
    if (!TIMER_V2_ENGINE_ENABLED) return
    if (typeof PerformanceObserver === "undefined") return
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration <= 50) continue
        if (phaseRef.current !== "running") continue
        emitTimerTelemetry("longtask_while_running", {
          durationMs: Math.round(entry.duration * 100) / 100,
        })
        dispatchEngine({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: true })
        if (suppressUiResetRef.current) {
          clearTimeout(suppressUiResetRef.current)
        }
        suppressUiResetRef.current = window.setTimeout(() => {
          dispatchEngine({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: false })
          suppressUiResetRef.current = null
        }, 1500)
      }
    })
    try {
      observer.observe({ entryTypes: ["longtask"] })
    } catch {
      return undefined
    }
    return () => {
      observer.disconnect()
      if (suppressUiResetRef.current) {
        clearTimeout(suppressUiResetRef.current)
        suppressUiResetRef.current = null
      }
    }
  }, [dispatchEngine])

  useEffect(() => {
    if (phase === "running") return
    if (!engineSnapshot.suppressOptionalUi) return
    dispatchEngine({ type: "SET_SUPPRESS_OPTIONAL_UI", suppress: false })
  }, [dispatchEngine, engineSnapshot.suppressOptionalUi, phase])

  useEffect(() => {
    if (insp.state === "done" && (phaseRef.current === "inspecting" || inspHoldRef.current)) {
      inspHoldRef.current = false
      inspectionPenaltyRef.current = null
      setPendingStoppedSolve({ timeMs: 0, penalty: "DNF" })
      solveClock.finalizeExternalSolve(0)
      dispatchEngine({ type: "INSPECTION_DONE" })
      queueSolveCommit(0, "DNF")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insp.state])

  useEffect(() => {
    if (!inspOn && phaseRef.current === "inspecting") {
      inspRef.current?.cancelInspection()
      setIdle()
    }
  }, [inspOn, setIdle])

  useEffect(() => {
    if (!settingsOpen) return
    const handler = (eventMouse: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(eventMouse.target as Node)
      ) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [settingsOpen])

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [exportOpen])

  useEffect(() => {
    if (!settingsOpen) {
      setSettingsMenuMaxHeight(null)
      return
    }

    updateSettingsMenuMaxHeight()

    const handleViewportChange = () => updateSettingsMenuMaxHeight()
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("orientationchange", handleViewportChange)
    window.visualViewport?.addEventListener("resize", handleViewportChange)
    window.visualViewport?.addEventListener("scroll", handleViewportChange)

    return () => {
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("orientationchange", handleViewportChange)
      window.visualViewport?.removeEventListener("resize", handleViewportChange)
      window.visualViewport?.removeEventListener("scroll", handleViewportChange)
    }
  }, [settingsOpen, updateSettingsMenuMaxHeight])

  useEffect(() => {
    const dn = (eventKey: KeyboardEvent) => {
      if (practiceTypeRef.current === "Comp Sim") return
      if (btConnectedRef.current) return
      if (isInteractiveTarget(eventKey.target)) return
      if (settingsOpenRef.current || shareModalOpenRef.current) return
      if (eventKey.code === "Space") {
        eventKey.preventDefault()
        if (eventKey.repeat) return
        if (typing) {
          // In typing mode, spacebar only works for inspection
          if (!inspOnRef.current) return
          const p = phaseRef.current
          if (p === "idle" || p === "stopped") {
            // Start inspection
            if (!scrambleReadyRef.current) return
            tapToInspectRef.current = true
            heldRef.current = true
            dispatchEngine({ type: "HOLD_READY" })
          } else if (p === "inspecting") {
            // Finish inspection → store penalty, go to stopped for time entry
            const pen = inspRef.current?.finishInspection(eventKey.timeStamp) ?? null
            if (pen === "DNF") {
              inspectionPenaltyRef.current = null
              setPendingStoppedSolve({ timeMs: 0, penalty: "DNF" })
              solveClock.finalizeExternalSolve(0)
              dispatchEngine({ type: "INSPECTION_DONE" })
              queueSolveCommit(0, "DNF")
            } else {
              inspectionPenaltyRef.current = pen
              dispatchEngine({ type: "INSPECTION_DONE" })
            }
          }
          return
        }
        handlePress(eventKey.timeStamp)
        return
      }
      if (typing) return

      const idleLikePhase = phaseRef.current === "idle" || phaseRef.current === "stopped"
      const shortcutSolve = shortcutSolveRef.current
      const action = idleLikePhase ? matchShortcut(eventKey, shortcutMapRef.current) : null

      if (action) {
        eventKey.preventDefault()
        switch (action) {
          case "toggle-plus2":
            if (shortcutSolve) setPenalty(shortcutSolve.id, shortcutSolve.penalty === "+2" ? null : "+2")
            return
          case "toggle-dnf":
            if (shortcutSolve) setPenalty(shortcutSolve.id, shortcutSolve.penalty === "DNF" ? null : "DNF")
            return
          case "next-scramble":
            nextScramble()
            return
          case "delete-last-solve":
            if (shortcutSolve) deleteSolve(shortcutSolve.id)
            return
        }
      }

      if (!typing && phaseRef.current === "running") stopTimer(eventKey.timeStamp)
    }

    const up = (eventKey: KeyboardEvent) => {
      if (practiceTypeRef.current === "Comp Sim") return
      if (btConnectedRef.current) return
      if (eventKey.code !== "Space") return
      if (typing && !inspOnRef.current) return
      eventKey.preventDefault()
      if (typing) {
        // In typing mode, release triggers inspection start via tapToInspect
        if (tapToInspectRef.current) {
          tapToInspectRef.current = false
          dispatchEngine({ type: "START_INSPECTION" })
          inspRef.current?.startInspection(eventKey.timeStamp)
        }
        heldRef.current = false
        return
      }
      heldRef.current = false
      releaseHold(eventKey.timeStamp)
    }
    window.addEventListener("keydown", dn)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", dn)
      window.removeEventListener("keyup", up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing])

  useEffect(() => {
    dispatchEngine({ type: "BT_CONNECTED", connected: btStatus === "connected" })
    btConnectedRef.current = btStatus === "connected"
    if (btStatus === "connected") {
      try { localStorage.setItem("timer-last-input-bt", "true") } catch {}
      setShowBtReconnect(false)
    }
  }, [btStatus, dispatchEngine])

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current)
      }
      if (pausedAttemptTimeoutRef.current !== null) {
        clearTimeout(pausedAttemptTimeoutRef.current)
      }
      clearPendingScrambleRequests()
    }
  }, [clearPendingScrambleRequests])

  function fmtSession(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  function showPausedAttemptPopup(message: string) {
    setPausedAttemptMessage(message)
    if (pausedAttemptTimeoutRef.current !== null) {
      clearTimeout(pausedAttemptTimeoutRef.current)
    }
    pausedAttemptTimeoutRef.current = window.setTimeout(() => {
      setPausedAttemptMessage(null)
      pausedAttemptTimeoutRef.current = null
    }, 1300)
  }

  function startSession(opts?: { includePriorSolves?: number }) {
    if (practiceTypeRef.current === "Comp Sim") return
    const unsavedSolveCount = getTrailingUnsavedSolves(solvesRef.current).length
    const startIndex = Math.max(0, unsavedSolveCount - (opts?.includePriorSolves ?? 0))
    sessionSolveStartIndexRef.current = startIndex
    // Backdate session start to include the triggering solve's duration
    let backdateMs = 0
    if (opts?.includePriorSolves && unsavedSolveCount > 0) {
      const unsaved = getTrailingUnsavedSolves(solvesRef.current)
      const triggeringSolve = unsaved[unsaved.length - 1]
      if (triggeringSolve) {
        backdateMs = triggeringSolve.time_ms + (triggeringSolve.penalty === "+2" ? 2000 : 0)
      }
    }
    setSessionStartTime(Date.now() - backdateMs)
    setSessionElapsed(Math.floor(backdateMs / 1000))
    setSessionPaused(false)
    setSessionSaved(false)
    sessionPausedMsRef.current = 0
    pausedAtRef.current = null
    try {
      localStorage.setItem(SESSION_START_SOLVE_INDEX_KEY, String(startIndex))
      localStorage.removeItem(SESSION_PAUSED_MS_KEY)
      localStorage.removeItem(SESSION_PAUSED_KEY)
      localStorage.removeItem(SESSION_PAUSED_AT_KEY)
    } catch {}
  }

  function pauseSession() {
    const pausedAt = Date.now()
    pausedAtRef.current = pausedAt
    setSessionPaused(true)
    try {
      localStorage.setItem(SESSION_PAUSED_MS_KEY, String(sessionPausedMsRef.current))
      localStorage.setItem(SESSION_PAUSED_KEY, "true")
      localStorage.setItem(SESSION_PAUSED_AT_KEY, String(pausedAt))
    } catch {}
  }

  function resumeSession() {
    if (pausedAtRef.current !== null) {
      sessionPausedMsRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
      try {
        localStorage.setItem(SESSION_PAUSED_MS_KEY, String(sessionPausedMsRef.current))
      } catch {}
    }
    setSessionPaused(false)
    try {
      localStorage.removeItem(SESSION_PAUSED_KEY)
      localStorage.removeItem(SESSION_PAUSED_AT_KEY)
    } catch {}
  }

  function cancelSession() {
    sessionSolveStartIndexRef.current = 0
    setSessionStartTime(null)
    setSessionElapsed(0)
    setSessionPaused(false)
    sessionPausedMsRef.current = 0
    pausedAtRef.current = null
    try {
      localStorage.removeItem(SESSION_START_KEY)
      localStorage.removeItem(SESSION_START_SOLVE_INDEX_KEY)
      localStorage.removeItem(SESSION_PAUSED_MS_KEY)
      localStorage.removeItem(SESSION_PAUSED_KEY)
      localStorage.removeItem(SESSION_PAUSED_AT_KEY)
    } catch {}
  }

  function endSession() {
    const currentCount = getCurrentSessionSolves(solvesRef.current).length
    if (currentCount === 0) {
      cancelSession()
      return
    }
    if (sessionPaused && pausedAtRef.current !== null) {
      sessionPausedMsRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
      try {
        localStorage.setItem(SESSION_PAUSED_MS_KEY, String(sessionPausedMsRef.current))
        localStorage.removeItem(SESSION_PAUSED_AT_KEY)
      } catch {}
    }
    setShowEndModal(true)
  }

  function discardSessionSolves() {
    const sessionEventId = eventRef.current
    const queuedEventSwitch = pendingEventSwitch
    const queuedPracticeTypeSwitch = pendingPracticeTypeSwitch
    const allSolves = solvesRef.current
    const sessionSolves = getCurrentSessionSolves(allSolves)
    const sessionSolveIds = new Set(sessionSolves.map((solve) => solve.id))
    const retainedSolves = allSolves.filter(
      (solve) => solve.group || !sessionSolveIds.has(solve.id)
    )

    setShowEndModal(false)
    setSolves(retainedSolves)
    setSelectedId(null)
    setDetailSolveId(null)
    setIdle()
    initStats(sessionEventId, [])
    cancelSession()

    if (retainedSolves.length !== allSolves.length) {
      void solveStoreRef.current
        .replaceSession(sessionEventId, retainedSolves)
        .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_replace_discard" }))
    }

    if (queuedEventSwitch && queuedEventSwitch !== sessionEventId) {
      applyEventChange(queuedEventSwitch)
    }
    setPendingEventSwitch(null)
    if (queuedPracticeTypeSwitch && queuedPracticeTypeSwitch !== practiceTypeRef.current) {
      changePracticeType(queuedPracticeTypeSwitch)
    }
    setPendingPracticeTypeSwitch(null)
  }

  function handleSessionSaved(session: SavedSessionPayload) {
    setShowEndModal(false)
    const groupId = session.timerSessionId
    const allSolves = solvesRef.current
    const sessionSolves = getCurrentSessionSolves(allSolves)
    const queuedEventSwitch = pendingEventSwitch
    const queuedPracticeTypeSwitch = pendingPracticeTypeSwitch
    const currentCount = sessionSolves.length
    const sessionSolveIds = new Set(sessionSolves.map((solve) => solve.id))
    const nextSolves = allSolves.map((solve) =>
      sessionSolveIds.has(solve.id) ? { ...solve, group: groupId } : solve
    )

    // Tag only the solves added during the active session.
    setSolves(nextSolves)
    incrementTotalSavedCount(currentCount)
    setHistoryCursor(getSavedSolveWindowCursor(nextSolves))
    void solveStoreRef.current
      .replaceSession(eventRef.current, nextSolves)
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_replace_save" }))

    // Store group metadata for display
    const groups = loadSessionGroups(eventRef.current)
    const nextGroups = [
      ...groups.filter((group) => group.id !== groupId),
      {
        id: groupId,
        sessionId: session.sessionId,
        timerSessionId: session.timerSessionId,
        title: session.title,
        savedAt: Date.now(),
        solveCount: currentCount,
        durationMinutes: session.durationMinutes,
        numDnf: session.numDnf,
        avgSeconds: session.avgSeconds,
        bestSeconds: session.bestSeconds,
        practiceType: session.practiceType,
      },
    ].sort((a, b) => a.savedAt - b.savedAt)
    saveSessionGroups(eventRef.current, nextGroups)
    setSessionGroups(nextGroups)

    setSelectedId(null)
    setDetailSolveId(null)
    setIdle()
    initStats(eventRef.current, [])
    setSessionStartTime(null)
    setSessionElapsed(0)
    setSessionPaused(false)
    setSessionSaved(true)
    sessionPausedMsRef.current = 0
    pausedAtRef.current = null
    setTimeout(() => setSessionSaved(false), 3000)
    try {
      localStorage.removeItem(SESSION_PAUSED_MS_KEY)
      localStorage.removeItem(SESSION_PAUSED_KEY)
      localStorage.removeItem(SESSION_PAUSED_AT_KEY)
    } catch {}

    if (queuedEventSwitch && queuedEventSwitch !== eventRef.current) {
      applyEventChange(queuedEventSwitch)
    }
    setPendingEventSwitch(null)
    if (queuedPracticeTypeSwitch && queuedPracticeTypeSwitch !== practiceTypeRef.current) {
      changePracticeType(queuedPracticeTypeSwitch)
    }
    setPendingPracticeTypeSwitch(null)
    sessionSolveStartIndexRef.current = 0
    refreshAllTimeAnalytics(eventRef.current)
  }

  function queueSolveCommit(time_ms: number, penalty: Penalty) {
    const commitStartedAt = performance.now()
    startTransition(() => {
      addSolve(time_ms, penalty, commitStartedAt)
    })
  }

  function startTimer(inputTimestamp?: number) {
    if (practiceTypeRef.current === "Comp Sim") return
    solveClock.clearFrozenElapsed()
    setPendingStoppedSolve(null)
    solveClock.startSolve(inputTimestamp)
    dispatchEngine({ type: "START_RUNNING" })
  }

  function stopTimer(inputTimestamp?: number) {
    if (practiceTypeRef.current === "Comp Sim") return
    const beforeStopDisplayMs = solveClock.displayElapsedMs
    const penalty = inspectionPenaltyRef.current
    inspectionPenaltyRef.current = null
    const ms = solveClock.stopSolve(inputTimestamp)
    if (beforeStopDisplayMs !== 0 && beforeStopDisplayMs !== ms) {
      emitTimerTelemetry("timer_display_mismatch_ms", {
        scope: "main_timer",
        mismatchMs: roundTelemetryMs(ms - beforeStopDisplayMs),
      })
    }
    setPendingStoppedSolve({ timeMs: ms, penalty })
    dispatchEngine({ type: "STOP_SOLVE" })
    queueSolveCommit(ms, penalty)
  }

  function startHold() {
    if (practiceTypeRef.current === "Comp Sim") return
    heldRef.current = true
    const duration = holdMsRef.current
    dispatchEngine({ type: "START_HOLD" })
    if (duration === 0) {
      dispatchEngine({ type: "HOLD_READY" })
    } else {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = window.setTimeout(() => {
        if (phaseRef.current === "holding" && heldRef.current) {
          dispatchEngine({ type: "HOLD_READY" })
        }
      }, duration)
    }
  }

  function releaseHold(inputTimestamp?: number) {
    if (practiceTypeRef.current === "Comp Sim") return
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }

    if (tapToInspectRef.current) {
      tapToInspectRef.current = false
      dispatchEngine({ type: "START_INSPECTION" })
      inspRef.current?.startInspection(inputTimestamp)
      return
    }

    if (inspHoldRef.current) {
      inspHoldRef.current = false
      if (phaseRef.current === "ready") {
        const pen = inspRef.current?.finishInspection(inputTimestamp) ?? null
        emitTimerTelemetry("timer_inspection_penalty_eval", {
          penalty: pen,
          scope: "main_timer",
        })
        if (pen === "DNF") {
          inspectionPenaltyRef.current = null
          setPendingStoppedSolve({ timeMs: 0, penalty: "DNF" })
          solveClock.finalizeExternalSolve(0)
          dispatchEngine({ type: "INSPECTION_DONE" })
          queueSolveCommit(0, "DNF")
        } else {
          inspectionPenaltyRef.current = pen
          startTimer(inputTimestamp)
        }
      } else {
        dispatchEngine({ type: "CANCEL_HOLD", backTo: "inspecting" })
      }
      return
    }

    if (phaseRef.current === "holding") {
      dispatchEngine({ type: "CANCEL_HOLD", backTo: "idle" })
      return
    }

    if (phaseRef.current !== "ready") return
    startTimer(inputTimestamp)
  }

  function handlePress(inputTimestamp?: number) {
    if (practiceTypeRef.current === "Comp Sim") return
    const currentPhase = phaseRef.current
    if (sessionPausedRef.current && currentPhase !== "running") {
      showPausedAttemptPopup(SESSION_PAUSED_SOLVE_MSG)
      return
    }
    if (currentPhase === "running") {
      stopTimer(inputTimestamp)
      return
    }

    if (currentPhase === "inspecting") {
      inspHoldRef.current = true
      tapToInspectRef.current = false
      startHold()
      return
    }

    if (currentPhase === "idle" || currentPhase === "stopped") {
      if (!scrambleReadyRef.current) return
      inspHoldRef.current = false
      if (inspOnRef.current) {
        tapToInspectRef.current = true
        heldRef.current = true
        dispatchEngine({ type: "HOLD_READY" })
      } else {
        tapToInspectRef.current = false
        startHold()
      }
    }
  }

  function addSolve(
    time_ms: number,
    penalty: Penalty,
    commitStartedAt = performance.now()
  ) {
    if (practiceTypeRef.current === "Comp Sim") return
    if (sessionPausedRef.current) {
      showPausedAttemptPopup(SESSION_PAUSED_ENTRY_MSG)
      return
    }
    setPendingStoppedSolve(null)
    const solvedAt = new Date().toISOString()
    const solve: Solve = {
      id: crypto.randomUUID(),
      time_ms,
      penalty,
      scramble: scrambleRef.current,
      notes: null,
      solved_at: solvedAt,
      created_at: solvedAt,
    }
    setSolves((previous) => [...previous, solve])
    void solveStoreRef.current
      .appendSolve(eventRef.current, solve)
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_append" }))
    appendStats(eventRef.current, solve)
    setSelectedId(null)
    consumeNextScramble()
    emitTimerTelemetry("timer_solve_commit_ms", {
      scope: "main_timer",
      durationMs: roundTelemetryMs(performance.now() - commitStartedAt),
    })
  }

  function setPenalty(id: string, penalty: Penalty) {
    const targetSolve =
      solvesRef.current.find((solve) => solve.id === id) ??
      (detailSolveOverride?.id === id ? detailSolveOverride : null)
    setSolves((previous) =>
      previous.map((solve) => (solve.id === id ? { ...solve, penalty } : solve))
    )
    if (detailSolveOverride?.id === id) {
      setDetailSolveOverride({ ...detailSolveOverride, penalty })
    }
    void solveStoreRef.current
      .updateSolve(id, { penalty })
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_update" }))
    updateStatsForPenalty(eventRef.current, id, penalty)
    if (targetSolve?.group) {
      void updateSolveAction(id, { penalty }).then((result) => {
        if (result.error) {
          emitTimerTelemetry("timer_error", {
            scope: "solve_update_server_penalty",
            message: result.error,
          })
          return
        }
        refreshAllTimeAnalytics(eventRef.current)
      })
    }
  }

  function deleteSolve(id: string): boolean {
    const confirmed = window.confirm("Are you sure you want to delete this solve?")
    if (!confirmed) return false

    const solveSnapshot =
      solvesRef.current.find((solve) => solve.id === id) ??
      (detailSolveOverride?.id === id ? detailSolveOverride : null)
    const nextSolves = solvesRef.current.filter((solve) => solve.id !== id)

    solveListPanelRef.current?.preserveScrollPosition()
    setSolves(nextSolves)
    setHistoryCursor(getSavedSolveWindowCursor(nextSolves))
    if (solveSnapshot?.group) {
      decrementTotalSavedCount(1)
    }
    void solveStoreRef.current
      .deleteSolve(id)
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_delete" }))
    void deleteSolveAction(
      id,
      solveSnapshot
        ? {
            event: eventRef.current,
            time_ms: solveSnapshot.time_ms,
            penalty: solveSnapshot.penalty,
            scramble: solveSnapshot.scramble,
          }
        : undefined
    ).then((result) => {
      if (result.error) {
        emitTimerTelemetry("timer_error", {
          scope: "solve_delete_server",
          message: result.error,
        })
        return
      }
      refreshAllTimeAnalytics(eventRef.current)
    })
    deleteStatsSolve(eventRef.current, id)
    setSelectedId(null)
    setDetailSolveId(null)
    if (detailSolveOverride?.id === id) {
      setDetailSolveOverride(null)
    }
    return true
  }

  function applyPracticeTypeChange(type: string) {
    setPracticeType(type)
    try {
      localStorage.setItem("timer-practice-type", type)
    } catch {}
  }

  function updateCompSimConfig(nextConfig: CompSimRoundConfig) {
    setCompSimConfig(normalizeCompSimConfig(nextConfig))
  }

  function triggerCompSimStart() {
    setCompSimStartSignal((value) => value + 1)
  }

  function enterCompSim(
    options: { cancelEmptySession?: boolean; autoStart?: boolean } = {}
  ) {
    if (options.cancelEmptySession && hasActiveSession) {
      cancelSession()
    }
    setCompSimEntryGuard(null)
    setPendingPracticeTypeSwitch(null)
    applyPracticeTypeChange("Comp Sim")
    if (options.autoStart || compSimAutoStartRequested) {
      triggerCompSimStart()
    }
    setCompSimAutoStartRequested(false)
  }

  function changePracticeType(type: string, options: { autoStart?: boolean } = {}) {
    if (type === practiceTypeRef.current) return

    const switchingToCompSim = type === "Comp Sim"
    if (practiceTypeRef.current === "Comp Sim" && !switchingToCompSim) {
      if (compSimBusyRef.current) {
        window.alert("Finish or exit the current Competition Simulator before switching practice modes.")
        return
      }
      setCompSimAutoStartRequested(false)
      applyPracticeTypeChange(type)
      return
    }

    if (!switchingToCompSim) {
      setCompSimAutoStartRequested(false)
      applyPracticeTypeChange(type)
      return
    }

    setCompSimAutoStartRequested((current) =>
      options.autoStart === undefined ? current : !!options.autoStart
    )

    if (
      phaseRef.current === "running" ||
      phaseRef.current === "inspecting" ||
      phaseRef.current === "holding" ||
      phaseRef.current === "ready"
    ) {
      window.alert("Finish the current solve before switching to Competition Simulator.")
      return
    }

    const unsavedSolveCount = getCurrentSessionSolves(solvesRef.current).length
    if (hasActiveSession && unsavedSolveCount > 0) {
      setCompSimEntryGuard("session_unsaved")
      return
    }

    if (hasActiveSession) {
      setCompSimEntryGuard("empty_session")
      return
    }

    enterCompSim({ autoStart: options.autoStart })
  }

  const syncCompSimTourMode = useEffectEvent(() => {
    if (practiceTypeRef.current !== "Comp Sim") {
      changePracticeType("Comp Sim")
    }
  })

  useEffect(() => {
    if (activeTour !== "comp-sim") {
      handledCompSimTourRef.current = false
      return
    }

    if (handledCompSimTourRef.current) return
    handledCompSimTourRef.current = true
    syncCompSimTourMode()
  }, [activeTour])

  function handleCompSimExit() {
    setCompSimEntryGuard(null)
    setPendingPracticeTypeSwitch(null)
    setCompSimAutoStartRequested(false)
    applyPracticeTypeChange("Solves")
  }

  function applyEventChange(newEvent: string) {
    insp.cancelInspection()
    setSelectedId(null)
    setDetailSolveId(null)
    setEvent(newEvent)
    setIdle()
    setShowEndModal(false)
    try {
      localStorage.setItem("timer-event", newEvent)
    } catch {}
    // Reset practice type if current one isn't available for the new event
    const available = getPracticeTypesForEvent(newEvent)
    if (!available.includes(practiceType)) {
      changePracticeType("Solves")
    }
  }

  function changeEvent(newEvent: string) {
    if (newEvent === eventRef.current) return

    if (practiceTypeRef.current === "Comp Sim" && compSimBusyRef.current) {
      window.alert("Finish or exit the current Competition Simulator before switching puzzles.")
      return
    }

    if (
      phaseRef.current === "running" ||
      phaseRef.current === "inspecting" ||
      phaseRef.current === "holding" ||
      phaseRef.current === "ready"
    ) {
      window.alert("Finish the current solve before switching puzzles.")
      return
    }

    if (hasActiveSession) {
      const unsavedSolveCount = getCurrentSessionSolves(solvesRef.current).length
      if (unsavedSolveCount > 0) {
        const currentEventName =
          EVENTS.find((entry) => entry.id === eventRef.current)?.name ?? eventRef.current
        const nextEventName = EVENTS.find((entry) => entry.id === newEvent)?.name ?? newEvent
        const shouldEndSession = window.confirm(
          `You have an active ${currentEventName} session with ${unsavedSolveCount} unsaved solve${
            unsavedSolveCount === 1 ? "" : "s"
          }. End this session before switching to ${nextEventName}?`
        )
        if (shouldEndSession) {
          setPendingEventSwitch(newEvent)
          endSession()
        }
        return
      }

      const shouldCancelEmptySession = window.confirm(
        "You have an active session with no solves. Cancel it and switch puzzles?"
      )
      if (!shouldCancelEmptySession) return
      cancelSession()
    }

    setPendingEventSwitch(null)
    applyEventChange(newEvent)
  }

  function updateStatCol(idx: 0 | 1, key: string) {
    setStatCols((previous) => {
      const next: [string, string] = [previous[0], previous[1]]
      next[idx] = key
      try {
        localStorage.setItem("timer-stat-rows", JSON.stringify(next))
      } catch {}
      return next
    })
    recomputeStats(eventRef.current)
  }

  function nextScramble() {
    const history = scrambleHistoryRef.current
    const idx = scrambleIdxRef.current

    if (idx < history.length - 1) {
      goToScramble(idx + 1)
      return
    }

    if (nextScrambleRef.current) {
      const next = nextScrambleRef.current
      nextScrambleRef.current = null
      const currentValue = history[idx] ?? scrambleRef.current
      scrambleHistoryRef.current = [currentValue, next]
      goToScramble(1)
      dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: true })
      if (!hasPendingScrambleKind("prefetch", eventRef.current)) {
        requestScramble("prefetch", eventRef.current, 1)
      }
      return
    }

    const currentValue = history[idx] ?? scrambleRef.current
    scrambleHistoryRef.current = [currentValue, "Generating scramble..."]
    goToScramble(1)
    dispatchEngine({ type: "SET_SCRAMBLE_READY", ready: false })
    if (!hasPendingScrambleKind("current", eventRef.current)) {
      requestScramble("current", eventRef.current, 1)
    }
  }

  function prevScramble() {
    if (scrambleIdxRef.current > 0) {
      goToScramble(scrambleIdxRef.current - 1)
    }
  }

  btCallbacksRef.current = {
    onHandsOn: () => {
      if (practiceTypeRef.current === "Comp Sim") {
        const handle = compSimBtRef.current
        if (!handle) return
        // Hands on pad during comp sim → press (starts hold for inspection/solve)
        const csPhase = handle.phase
        if (csPhase === "ready" || csPhase === "inspecting" || csPhase === "solving") {
          handle.handleBtPress()
        }
        return
      }
      if (sessionPausedRef.current) return
      dispatchEngine({ type: "BT_HANDS_ON" })
    },
    onGetSet: () => {
      if (practiceTypeRef.current === "Comp Sim") {
        // GAN armed — no additional action needed, hold is time-based
        return
      }
      if (sessionPausedRef.current) return
      if (phaseRef.current !== "inspecting") {
        inspRef.current?.cancelInspection()
      }
      dispatchEngine({ type: "BT_GET_SET" })
    },
    onHandsOff: () => {
      if (practiceTypeRef.current === "Comp Sim") {
        const handle = compSimBtRef.current
        if (!handle) return
        // Hands off pad → release (starts timer or inspection)
        handle.handleBtRelease()
        return
      }
      if (sessionPausedRef.current) return
      if (phaseRef.current !== "inspecting") {
        inspRef.current?.cancelInspection()
      }
      dispatchEngine({ type: "BT_HANDS_OFF" })
    },
    onRunning: () => {
      if (practiceTypeRef.current === "Comp Sim") {
        const handle = compSimBtRef.current
        if (!handle) return
        handle.handleBtRunning()
        return
      }
      if (sessionPausedRef.current) {
        showPausedAttemptPopup(SESSION_PAUSED_SOLVE_MSG)
        return
      }
      inspRef.current?.cancelInspection()
      btSolveFinalizedRef.current = false
      if (engineRef.current.getSnapshot().phase !== "running") {
        solveClock.clearFrozenElapsed()
        setPendingStoppedSolve(null)
        solveClock.startSolve()
      }
      dispatchEngine({ type: "BT_RUNNING" })
    },
    onStopped: (time_ms: number | null) => {
      if (practiceTypeRef.current === "Comp Sim") {
        const handle = compSimBtRef.current
        if (!handle) return
        const solveMs =
          typeof time_ms === "number" && Number.isFinite(time_ms) && time_ms > 0
            ? time_ms
            : 0
        if (solveMs > 0) {
          handle.handleBtSolveComplete(solveMs)
        }
        return
      }
      if (sessionPausedRef.current) {
        showPausedAttemptPopup(SESSION_PAUSED_ENTRY_MSG)
        return
      }
      const phaseNow = engineRef.current.getSnapshot().phase
      const canFinalize = phaseNow === "running" || phaseNow === "stopped"
      if (!canFinalize || btSolveFinalizedRef.current) return
      btSolveFinalizedRef.current = true
      dispatchEngine({ type: "BT_STOPPED" })
      const solveMs =
        typeof time_ms === "number" && Number.isFinite(time_ms) && time_ms > 0
          ? solveClock.finalizeExternalSolve(time_ms)
          : solveClock.stopSolve()
      setPendingStoppedSolve({ timeMs: solveMs, penalty: null })
      queueSolveCommit(solveMs, null)
    },
    onIdle: () => {
      if (practiceTypeRef.current === "Comp Sim") {
        const handle = compSimBtRef.current
        if (!handle) return
        handle.handleBtIdle()
        return
      }
      if (sessionPausedRef.current) return
      const phaseNow = engineRef.current.getSnapshot().phase
      // If already inspecting, don't cancel+restart — let the countdown continue
      if (phaseNow === "inspecting") {
        inspRef.current?.cancelInspection()
        dispatchEngine({ type: "BT_IDLE" })
        return
      }
      inspRef.current?.cancelInspection()
      if (phaseNow === "running" && !btSolveFinalizedRef.current) {
        // Fallback for firmware variants that jump straight to IDLE on stop.
        btSolveFinalizedRef.current = true
        dispatchEngine({ type: "BT_STOPPED" })
        const fallbackMs = solveClock.stopSolve()
        setPendingStoppedSolve({ timeMs: fallbackMs, penalty: null })
        queueSolveCommit(fallbackMs, null)
        return
      }
      const shouldStartInspection =
        inspOnRef.current &&
        phaseNow !== "stopped" &&
        phaseNow !== "running"
      if (shouldStartInspection) {
        if (Date.now() - lastBtIdleResetRef.current < 500) {
          dispatchEngine({ type: "BT_IDLE" })
          return
        }
        dispatchEngine({ type: "START_INSPECTION" })
        inspRef.current?.startInspection()
      } else {
        dispatchEngine({ type: "BT_IDLE" })
        lastBtIdleResetRef.current = Date.now()
      }
    },
    onDisconnect: () => {
      inspRef.current?.cancelInspection()
      dispatchEngine({ type: "BT_DISCONNECT" })
    },
  }

  const selectedSolve = useMemo(
    () => solves.find((solve) => solve.id === selectedId) ?? null,
    [selectedId, solves]
  )
  const detailSolve = useMemo(() => {
    if (!detailSolveId) return null
    return (
      solves.find((solve) => solve.id === detailSolveId) ??
      (detailSolveOverride?.id === detailSolveId ? detailSolveOverride : null)
    )
  }, [detailSolveId, detailSolveOverride, solves])
  const detailSolveNumber = useMemo(() => {
    if (!detailSolve) return null
    const index = solves.findIndex((solve) => solve.id === detailSolve.id)
    if (index >= 0) {
      return totalSolveCount - solves.length + index + 1
    }
    return detailSolve.solve_number ?? null
  }, [detailSolve, solves, totalSolveCount])

  const handleSelectSolveCell = useCallback(
    (id: string, metric: SolveSelectionMetric) => {
      setSelectedId(id)
      setSelectedMetric(metric)
    },
    []
  )
  const handleOpenSolveDetail = useCallback((id: string) => {
    setStatDetail(null)
    setSelectedId(id)
    setSelectedMetric("single")
    setDetailSolveId(id)
  }, [])
  const handleOpenStatDetail = useCallback(
    (id: string, metric: SolveListStatMetric) => {
      const statKey = metric === "stat1" ? statCols[0] : statCols[1]
      const windowSize = getStatWindowSize(statKey)
      if (!windowSize) return

      setDetailSolveId(null)
      setSelectedId(id)
      setSelectedMetric(metric)

      const targetSolve = solvesRef.current.find((solve) => solve.id === id) ?? null
      if (targetSolve?.group) {
        void getSolveDetailWindow({ solveId: id, statKey }).then((result) => {
          if (result.error || result.solves.length !== windowSize) return
          setStatDetail({
            label: statKey,
            solves: result.solves.map(toTimerSolve),
          })
        })
        return
      }

      const solveIndex = currentSessionSolves.findIndex((solve) => solve.id === id)
      if (solveIndex < 0 || solveIndex + 1 < windowSize) return

      const solveWindow = currentSessionSolves.slice(
        solveIndex + 1 - windowSize,
        solveIndex + 1
      )
      if (solveWindow.length !== windowSize) return

      setStatDetail({
        label: statKey,
        solves: solveWindow,
      })
    },
    [currentSessionSolves, statCols]
  )

  useEffect(() => {
    if (detailSolveId && !detailSolve) {
      let cancelled = false
      void getEventSolveById(detailSolveId).then((result) => {
        if (cancelled) return
        if (result.error || !result.solve) {
          setDetailSolveId(null)
          setDetailSolveOverride(null)
          return
        }
        setDetailSolveOverride(toTimerSolve(result.solve))
      })
      return () => {
        cancelled = true
      }
    }
    setDetailSolveOverride(null)
    return
  }, [detailSolve, detailSolveId])
  const scopedAllTimeAnalytics = allTimeAnalyticsEvent === event ? allTimeAnalytics : null
  const scopedSolveListSummary = solveListSummaryEvent === event ? solveListSummary : null
  const eventDnfCount = scopedSolveListSummary?.eventSummary?.dnf_count ?? null
  const unsavedDnfCount = useMemo(
    () => unsavedSolves.filter((s) => s.penalty === "DNF").length,
    [unsavedSolves]
  )
  const allTimeBestSingleMs = scopedAllTimeAnalytics?.summary?.best_single_ms ?? null
  const isSolvePersonalBest = useCallback((solve: Solve | null) => {
    if (!solve) return false
    const selectedTime = getEffectiveSolveMs(solve)
    if (selectedTime === null) return false
    if (allTimeBestSingleMs !== null) {
      return selectedTime === allTimeBestSingleMs
    }
    const bestTime = solves.reduce<number | null>((best, entry) => {
      const current = getEffectiveSolveMs(entry)
      if (current === null) return best
      if (best === null || current < best) return current
      return best
    }, null)
    return bestTime !== null && selectedTime === bestTime
  }, [allTimeBestSingleMs, solves])

  const handleShareSolve = useCallback((solve: Solve) => {
    const solveIndex = solves.findIndex((entry) => entry.id === solve.id)
    const solveNumber = solveIndex >= 0
      ? totalSolveCount - solves.length + solveIndex + 1
      : solve.solve_number ?? totalSolveCount

    setShareCardData({
      variant: "solve",
      event,
      timeMs: solve.time_ms,
      penalty: solve.penalty,
      scramble: solve.scramble,
      solveNumber: Math.max(1, solveNumber),
      solvedAt: solve.solved_at ?? solve.created_at ?? new Date().toISOString(),
      userName: shareAuthor.userName,
      handle: shareAuthor.handle,
      avatarUrl: shareAuthor.avatarUrl,
      isPB: isSolvePersonalBest(solve),
    })
    setShareModalOpen(true)
  }, [
    event,
    isSolvePersonalBest,
    shareAuthor.avatarUrl,
    shareAuthor.handle,
    shareAuthor.userName,
    solves,
    totalSolveCount,
  ])
  const handleSolveNotesChange = useCallback(async (solveId: string, notes: string) => {
    const nextNotes = notes.trim() || null
    const targetSolve =
      solvesRef.current.find((solve) => solve.id === solveId) ??
      (detailSolveOverride?.id === solveId ? detailSolveOverride : null)

    setSolves((previous) =>
      previous.map((solve) =>
        solve.id === solveId ? { ...solve, notes: nextNotes } : solve
      )
    )
    if (detailSolveOverride?.id === solveId) {
      setDetailSolveOverride({ ...detailSolveOverride, notes: nextNotes })
    }

    await solveStoreRef.current
      .updateSolve(solveId, { notes: nextNotes })
      .catch(() => emitTimerTelemetry("timer_error", { scope: "solve_store_update_notes" }))

    if (targetSolve?.group) {
      void updateSolveAction(solveId, { notes: nextNotes }).then((result) => {
        if (result.error) {
          emitTimerTelemetry("timer_error", {
            scope: "solve_update_server_notes",
            message: result.error,
          })
        }
      })
    }
  }, [detailSolveOverride])

  const mostRecentSavedSessionSolves = useMemo(() => {
    const groupedSolves = solves.filter((solve) => !!solve.group)
    if (groupedSolves.length === 0) return []

    const groupedIds = new Set(
      groupedSolves
        .map((solve) => solve.group)
        .filter((groupId): groupId is string => typeof groupId === "string")
    )

    const mostRecentMeta = [...sessionGroups]
      .filter((group) => groupedIds.has(group.id))
      .sort((a, b) => b.savedAt - a.savedAt)[0]

    let mostRecentGroupId = mostRecentMeta?.id ?? null
    if (!mostRecentGroupId) {
      for (let i = solves.length - 1; i >= 0; i--) {
        const groupId = solves[i].group
        if (!groupId) continue
        mostRecentGroupId = groupId
        break
      }
    }

    if (!mostRecentGroupId) return []
    return solves.filter((solve) => solve.group === mostRecentGroupId)
  }, [sessionGroups, solves])
  const savedSessionSummaryStats = useMemo(
    () => buildSavedSessionSummaryStats(scopedSolveListSummary?.latestSavedSessionSummary ?? null),
    [scopedSolveListSummary]
  )
  const headerSummaryStats = visibleListStats
  const sessionStatsForPanel = useMemo(
    () =>
      hasActiveSession || currentSessionSolves.length > 0
        ? computeStatsSync(currentSessionSolves, statCols)
        : savedSessionSummaryStats ?? computeStatsSync(mostRecentSavedSessionSolves, statCols),
    [
      currentSessionSolves,
      hasActiveSession,
      mostRecentSavedSessionSolves,
      statCols,
      savedSessionSummaryStats,
    ]
  )
  const sessionSolveCountForPanel =
    hasActiveSession || currentSessionSolves.length > 0
      ? currentSolveCount
      : scopedSolveListSummary?.latestSavedSessionSummary?.solve_count ?? mostRecentSavedSessionSolves.length

  const sessionChartSolves = useMemo(() => {
    const source =
      currentSessionSolves.length > 0 || hasActiveSession
        ? currentSessionSolves
        : mostRecentSavedSessionSolves
    return source.map((solve, index) => toChartSolve(solve, event, index + 1))
  }, [currentSessionSolves, event, hasActiveSession, mostRecentSavedSessionSolves])

  const allChartCacheRef = useRef<{ event: string; length: number; result: StoredSolve[] }>({
    event: "", length: 0, result: [],
  })
  const allChartSolves = useMemo(() => {
    const cache = allChartCacheRef.current
    if (cache.event === event && solves.length >= cache.length && cache.length > 0) {
      const newItems = solves.slice(cache.length).map((solve, i) =>
        toChartSolve(solve, event, cache.length + i + 1)
      )
      const result = newItems.length > 0 ? [...cache.result, ...newItems] : cache.result
      allChartCacheRef.current = { event, length: solves.length, result }
      return result
    }
    const result = solves.map((solve, index) => toChartSolve(solve, event, index + 1))
    allChartCacheRef.current = { event, length: solves.length, result }
    return result
  }, [event, solves])
  const allTimeDistributionBuckets = useMemo(() => {
    const total = scopedAllTimeAnalytics?.summary?.solve_count ?? 0
    if (!scopedAllTimeAnalytics?.distribution.length) return []
    let cumulative = 0
    return scopedAllTimeAnalytics.distribution.map((bucket) => {
      cumulative += bucket.solve_count
      return {
        tickLabel: `${Math.round(bucket.range_start_ms / 1000)}s`,
        tooltipLabel:
          bucket.range_start_ms === bucket.range_end_ms
            ? `${(bucket.range_start_ms / 1000).toFixed(2)}s`
            : `${(bucket.range_start_ms / 1000).toFixed(2)}-${(bucket.range_end_ms / 1000).toFixed(2)}s`,
        count: bucket.solve_count,
        cumulative,
        percent: total > 0 ? (bucket.solve_count / total) * 100 : 0,
      }
    })
  }, [scopedAllTimeAnalytics])
  const allTimeTrendPoints = useMemo(
    () =>
      scopedAllTimeAnalytics?.trend.map((point) => ({
        label: point.label,
        time: point.best_single_ms,
        line1: point.mean_ms,
        line2: point.best_single_ms,
      })) ?? [],
    [scopedAllTimeAnalytics]
  )

  const canShowCrossTrainer =
    (event === "333" || event === "333oh") &&
    scramble.length > 0 &&
    !scramble.startsWith("Preparing") &&
    !scramble.startsWith("Scramble worker unavailable")

  const inInspHold =
    (phase === "holding" || phase === "ready") && inspHoldRef.current
  const timingActive = phase === "running" || phase === "inspecting" || inInspHold
  const wakeLockEnabled =
    practiceType !== "Comp Sim" &&
    (btStatus === "connected" ||
      phase === "running" ||
      phase === "inspecting" ||
      inInspHold)

  useScreenWakeLock({
    enabled: wakeLockEnabled,
    context: "main_timer",
  })

  const {
    idleWarningSecondsLeft,
    dismissIdleWarning,
    autoStopReason,
    clearAutoStopReason,
  } = useAutoSession({
    autoStartEnabled: autoSessionEnabled,
    autoStopEnabled,
    idleTimeoutMin,
    hasActiveSession,
    sessionPaused,
    solveCount: currentSolveCount,
    timingActive,
    practiceType,
    onStartSession: startSession,
    onEndSession: endSession,
  })

  const paneContext = useMemo(
    () => ({
      event,
      phase,
      scramble,
      canShowCrossTrainer,
      chartSolvesSession: sessionChartSolves,
      chartSolvesAll: allChartSolves,
      chartDistributionAll: allTimeDistributionBuckets,
      chartTrendAll: allTimeTrendPoints,
      statCols,
    }),
    [
      allChartSolves,
      allTimeDistributionBuckets,
      allTimeTrendPoints,
      canShowCrossTrainer,
      event,
      phase,
      scramble,
      sessionChartSolves,
      statCols,
    ]
  )

  const timeColor = getTimerReadoutColor({
    phase,
    inInspectionHold: inInspHold,
    inspectionSecondsLeft: insp.secondsLeft,
    btArmed: engineSnapshot.btArmed,
    btHandsOnMat: engineSnapshot.btHandsOnMat,
  })

  const parsedTypeTime = useMemo(() => parseTime(typeVal), [typeVal])
  const last = solves[solves.length - 1]
  const lastDisplaySolve: SharedTimerLastSolve =
    pendingStoppedSolve ??
    (last
      ? { timeMs: last.time_ms, penalty: last.penalty }
      : null)
  shortcutSolveRef.current = detailSolve ?? selectedSolve ?? last ?? null
  const lastSinglePb = useMemo(() => {
    if (!last) return null
    const lastEffective = getEffectiveSolveMs(last)
    if (lastEffective === null) return null
    if (allTimeBestSingleMs !== null) {
      if (lastEffective !== allTimeBestSingleMs) return null
      return {
        solveId: last.id,
        effectiveMs: lastEffective,
        formattedTime: formatTimeMsCentiseconds(lastEffective),
        scramble: last.scramble,
      }
    }
    return getLastSinglePbCandidate(solves)
  }, [allTimeBestSingleMs, last, solves])
  const scrambleNavBtn =
    "text-[11px] font-sans tracking-wide px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
  const sp = (eventPointer: React.PointerEvent) => eventPointer.stopPropagation()
  const canSharePb =
    phase === "stopped" &&
    !!last &&
    !!lastSinglePb &&
    lastSinglePb.solveId === last.id

  useEffect(() => {
    if (!pbPhotoOpen) return
    if (!canSharePb) {
      setPbPhotoOpen(false)
    }
  }, [canSharePb, pbPhotoOpen])

  const handleRangeChange = useCallback(
    (next: { start: number; end: number }) => {
      if (phaseRef.current === "running" || engineRef.current.getSnapshot().suppressOptionalUi) {
        return
      }
      setSolveRange((previous) => {
        if (previous.start === next.start && previous.end === next.end) {
          return previous
        }
        return next
      })
    },
    []
  )

  // ── Multi-select & Bulk Delete ──────────────────────────────────────
  const multiSelect = useMultiSelect(solves.length)

  const handleBulkDelete = useCallback(async () => {
    const count = multiSelect.selectedCount
    if (count === 0) return
    const confirmed = window.confirm(
      `Are you sure you want to delete ${count} solve${count === 1 ? "" : "s"}? This cannot be undone.`
    )
    if (!confirmed) return

    let idsToDelete: string[]
    if (multiSelect.isSelectAll) {
      const allSolves = await solveStoreRef.current.loadSession(event)
      idsToDelete = allSolves
        .filter((s) => !multiSelect.excludedIds.has(s.id))
        .map((s) => s.id)
    } else {
      idsToDelete = Array.from(multiSelect.selectedIds)
    }
    if (idsToDelete.length === 0) return

    const idSet = new Set(idsToDelete)
    const savedDeleteCount = solvesRef.current.filter(
      (s) => s.group && idSet.has(s.id)
    ).length

    await solveStoreRef.current.deleteSolves(idsToDelete)

    const nextSolves = solvesRef.current.filter((s) => !idSet.has(s.id))
    solveListPanelRef.current?.preserveScrollPosition()
    setSolves(nextSolves)
    setHistoryCursor(getSavedSolveWindowCursor(nextSolves))
    if (savedDeleteCount > 0) decrementTotalSavedCount(savedDeleteCount)
    recomputeStats(event, nextSolves)
    setSelectedId(null)
    multiSelect.exit()

    void deleteSolvesAction(idsToDelete).then((result) => {
      if (!result.error) refreshAllTimeAnalytics(eventRef.current)
    })
  }, [multiSelect, event, recomputeStats, refreshAllTimeAnalytics, decrementTotalSavedCount])

  // ── Export Handler ─────────────────────────────────────────────────
  const handleExport = useCallback(async (format: "csv" | "json" | "txt" | "clipboard") => {
    const allSolves = await solveStoreRef.current.loadSession(event)
    const exportSolves = allSolves as unknown as import("@/lib/types").Solve[]
    const eventLabel = event.replace(/[^a-zA-Z0-9]/g, "_")
    const timestamp = new Date().toISOString().slice(0, 10)
    switch (format) {
      case "csv": {
        const content = solvesToCSV(exportSolves, event)
        downloadFile(content, `${eventLabel}_${timestamp}.csv`, "text/csv")
        break
      }
      case "json": {
        const content = solvesToJSON(exportSolves, event)
        downloadFile(content, `${eventLabel}_${timestamp}.json`, "application/json")
        break
      }
      case "txt": {
        const content = solvesToCsTimerTxt(exportSolves, event)
        downloadFile(content, `${eventLabel}_${timestamp}.txt`, "text/plain")
        break
      }
      case "clipboard": {
        const content = statsToClipboard(exportSolves, event)
        await navigator.clipboard.writeText(content)
        break
      }
    }
  }, [event])

  const compSimEntryDialogConfig = (() => {
    switch (compSimEntryGuard) {
      case "session_unsaved":
        return {
          title: "Finish the current practice session first",
          description:
            "Competition Simulator auto-saves its own rounds. End or save the current practice session before switching so both timer flows do not run at the same time.",
          actions: [
            {
              label: "End/Save Current Session First",
              tone: "primary" as const,
              onSelect: () => {
                setCompSimEntryGuard(null)
                setPendingPracticeTypeSwitch("Comp Sim")
                endSession()
              },
            },
            {
              label: "Go Back",
              onSelect: () => {
                setCompSimAutoStartRequested(false)
                setCompSimEntryGuard(null)
              },
            },
          ],
        }
      case "empty_session":
        return {
          title: "Cancel the empty practice session?",
          description:
            "That start button is only for grouping normal solves into a saved practice session. Competition Simulator saves its own rounds separately.",
          actions: [
            {
              label: "Cancel Empty Session and Start Comp Sim",
              tone: "primary" as const,
              onSelect: () => enterCompSim({ cancelEmptySession: true }),
            },
            {
              label: "Go Back",
              onSelect: () => {
                setCompSimAutoStartRequested(false)
                setCompSimEntryGuard(null)
              },
            },
          ],
        }
      default:
        return null
    }
  })()

  return (
    <div className="flex h-[calc(100dvh-var(--timer-navbar-height,0px))] min-h-0 flex-col overflow-hidden bg-background select-none">
      {storageWarning && (
        <div className="bg-yellow-900/60 border-b border-yellow-700/50 px-4 py-2 text-center text-xs text-yellow-200">
          {storageWarning}
        </div>
      )}
      {showBtReconnect && btStatus === "disconnected" && (
        <div className="bg-blue-900/60 border-b border-blue-700/50 px-4 py-2 flex items-center justify-center gap-3 text-xs text-blue-200">
          <span>Your last session used a GAN timer.</span>
          <button
            onClick={() => { btConnect(); setShowBtReconnect(false) }}
            className="font-semibold text-blue-100 underline underline-offset-2"
          >
            Reconnect
          </button>
          <button
            onClick={() => {
              setShowBtReconnect(false)
              try { localStorage.removeItem("timer-last-input-bt") } catch {}
            }}
            className="text-blue-400 hover:text-blue-200"
          >
            Dismiss
          </button>
        </div>
      )}
      <div ref={timerTopAreaRef}>
        <div
          className="relative flex items-center gap-3 px-4 py-3 border-b border-border lg:gap-0 lg:px-0 lg:py-0"
          onPointerDown={sp}
        >
          <div className="flex shrink-0 items-center gap-3 lg:w-72 xl:w-80 lg:border-r border-border lg:pl-4 lg:pr-6 xl:pr-7 lg:py-3">
            <select
              data-onboarding-target="timer-event-select"
              className="bg-muted text-[13px] font-sans rounded px-2 py-1.5 border border-border text-foreground shrink-0"
              value={event}
              onChange={(eventSelect) => changeEvent(eventSelect.target.value)}
            >
              {EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>

            <PracticeModeSelector
              eventId={event}
              selectedType={practiceType}
              onTypeChange={changePracticeType}
            />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 lg:px-4 lg:py-3">
            {practiceType !== "Comp Sim" && (
              <div className="flex-1 min-w-0 flex items-center justify-center">
                <button
                  data-onboarding-target="timer-scramble"
                  className={cn(
                    "text-center font-mono font-normal text-foreground leading-snug hover:text-primary transition-colors cursor-pointer",
                    SCRAMBLE_TEXT_SIZE_CLASSES[scrambleTextSize]
                  )}
                  onClick={() => {
                    navigator.clipboard.writeText(scramble).then(() => {
                      setScrambleCopied(true)
                      setTimeout(() => setScrambleCopied(false), 1500)
                    })
                  }}
                  title="Click to copy scramble"
                >
                  {scramble}
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              {practiceType !== "Comp Sim" && (
                <>
                  <button
                    className={scrambleNavBtn}
                    onClick={prevScramble}
                    disabled={!scrambleCanGoPrev || timingActive}
                    title="Go back to previous scramble"
                  >
                    ← Prev
                  </button>
                  <button
                    className={scrambleNavBtn}
                    onClick={nextScramble}
                    disabled={timingActive}
                    title="Skip to next scramble (N)"
                  >
                    Next →
                  </button>
                </>
              )}
              {solves.length > 0 && (
                <div className="relative" ref={exportRef}>
                  <button
                    className="p-1.5 rounded border border-border text-muted-foreground/70 hover:text-foreground transition-colors"
                    onClick={() => setExportOpen((v) => !v)}
                    title="Export solves"
                  >
                    <Download size={14} />
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                      {([
                        { key: "csv" as const, label: "Export CSV" },
                        { key: "json" as const, label: "Export JSON" },
                        { key: "txt" as const, label: "Export csTimer TXT" },
                        { key: "clipboard" as const, label: "Copy Stats" },
                      ]).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            void handleExport(opt.key)
                            setExportOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="relative" ref={settingsRef}>
                <button
                  data-onboarding-target="timer-settings"
                  className="p-1.5 rounded border border-border text-muted-foreground/70 hover:text-foreground transition-colors"
                  onClick={() =>
                    setSettingsOpen((value) => {
                      const nextValue = !value
                      if (nextValue) {
                        updateSettingsMenuMaxHeight()
                      }
                      return nextValue
                    })
                  }
                  title="Timer settings"
                >
                  <Settings size={14} />
                </button>
                {settingsOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 z-50 w-72 overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover p-1 text-sm shadow-xl"
                    style={{
                      maxHeight:
                        settingsMenuMaxHeight !== null
                          ? `${settingsMenuMaxHeight}px`
                          : undefined,
                      WebkitOverflowScrolling: "touch",
                      touchAction: "pan-y",
                    }}
                  >
                    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Timer
                    </div>
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors"
                      onClick={() =>
                        setTyping((value) => {
                          const next = !value
                          try {
                            localStorage.setItem("timer-typing", String(next))
                          } catch {}
                          return next
                        })
                      }
                    >
                      <span className="text-foreground">⌨ Typing Mode</span>
                      <span
                        className={cn(
                          "font-mono text-[12px]",
                          typing ? "text-primary font-medium" : "text-muted-foreground"
                        )}
                      >
                        {typing ? "On" : "Off"}
                      </span>
                    </button>
                    {isBleSupported() && (
                      <button
                        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={btStatus === "connected" ? btDisconnect : btConnect}
                        disabled={btStatus === "connecting"}
                        onPointerDown={sp}
                        title={
                          btStatus === "connected"
                            ? "Disconnect GAN Smart Timer"
                            : "Connect GAN Smart Timer via Bluetooth"
                        }
                      >
                        <span className="text-foreground">GAN Smart Timer</span>
                        <span
                          className={cn(
                            "font-mono text-[12px]",
                            btStatus === "connected"
                              ? "text-primary font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {btStatus === "connecting"
                            ? "Connecting…"
                            : btStatus === "connected"
                            ? "Connected"
                            : "Disconnected"}
                        </span>
                      </button>
                    )}
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() =>
                        setInspOn((value) => {
                          const next = !value
                          try {
                            localStorage.setItem("timer-insp-on", String(next))
                          } catch {}
                          return next
                        })
                      }
                    >
                      <span className="text-foreground">⏱ Inspection</span>
                      <span
                        className={cn(
                          "font-mono text-[12px]",
                          inspOn
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {inspOn ? "On" : "Off"}
                      </span>
                    </button>
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() =>
                        setInspVoiceOn((value) => {
                          const next = !value
                          try {
                            localStorage.setItem("timer-insp-voice-on", String(next))
                          } catch {}
                          return next
                        })
                      }
                      disabled={!inspOn}
                    >
                      <span className="text-foreground">🔊 Inspection Voice Alerts</span>
                      <span
                        className={cn(
                          "font-mono text-[12px]",
                          inspVoiceOn && inspOn
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {inspVoiceOn ? "On" : "Off"}
                      </span>
                    </button>
                    <div className="px-3 py-2 space-y-1.5">
                      <span className="block text-[11px] font-medium text-foreground">
                        Inspection Voice
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {([
                          { value: "female", label: "Female" },
                          { value: "male", label: "Male" },
                        ] as const).map((voiceOption) => {
                          const disabled = !inspOn || !inspVoiceOn
                          return (
                            <button
                              key={voiceOption.value}
                              className={cn(
                                "h-7 rounded border text-[11px] font-medium transition-colors",
                                inspVoiceGender === voiceOption.value
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                                disabled && "opacity-40 cursor-not-allowed"
                              )}
                              onClick={() => {
                                if (disabled) return
                                setInspVoiceGender(voiceOption.value)
                                try {
                                  localStorage.setItem(
                                    "timer-insp-voice-gender",
                                    voiceOption.value
                                  )
                                } catch {}
                              }}
                              disabled={disabled}
                            >
                              {voiceOption.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <span className="block text-[11px] font-medium text-foreground">
                        Update During Solve
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {TIMER_UPDATE_MODE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            className={cn(
                              "h-7 rounded border text-[11px] font-medium transition-colors",
                              timerUpdateMode === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            onClick={() => {
                              setTimerUpdateMode(option.value)
                              try {
                                localStorage.setItem("timer-update-mode", option.value)
                              } catch {}
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <span className="block text-[11px] font-medium text-foreground">
                        Hold to Start
                      </span>
                      <div className="grid grid-cols-5 gap-1">
                        {HOLD_MS_OPTIONS.map((ms) => {
                          const disabled = typing
                          return (
                            <button
                              key={ms}
                              className={cn(
                                "h-7 rounded border text-[11px] font-medium transition-colors",
                                holdMs === ms
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                                disabled && "opacity-40 cursor-not-allowed"
                              )}
                              onClick={() => {
                                if (disabled) return
                                setHoldMs(ms)
                                try {
                                  localStorage.setItem(HOLD_MS_KEY, String(ms))
                                } catch {}
                              }}
                              disabled={disabled}
                            >
                              {ms === 0 ? "None" : `${ms}ms`}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <span className="block text-[11px] font-medium text-foreground">
                        Scramble Size
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {TIMER_TEXT_SIZE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            className={cn(
                              "h-7 rounded border text-[11px] font-medium transition-colors",
                              scrambleTextSize === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            onClick={() => {
                              setScrambleTextSize(option.value)
                              try {
                                localStorage.setItem(
                                  TIMER_SCRAMBLE_TEXT_SIZE_KEY,
                                  option.value
                                )
                              } catch {}
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <span className="block text-[11px] font-medium text-foreground">
                        Timer Size
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {TIMER_TEXT_SIZE_OPTIONS.map((option) => (
                          <button
                            key={`timer-size-${option.value}`}
                            className={cn(
                              "h-7 rounded border text-[11px] font-medium transition-colors",
                              timerReadoutTextSize === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            onClick={() => {
                              setTimerReadoutTextSize(option.value)
                              try {
                                localStorage.setItem(
                                  TIMER_READOUT_TEXT_SIZE_KEY,
                                  option.value
                                )
                              } catch {}
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <span className="block text-[11px] font-medium text-foreground">
                        Solve Times
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {TIMER_TEXT_SIZE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            className={cn(
                              "h-7 rounded border text-[11px] font-medium transition-colors",
                              paneTimeTextSize === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            onClick={() => {
                              setPaneTimeTextSize(option.value)
                              try {
                                localStorage.setItem(
                                  TIMER_PANE_TIME_TEXT_SIZE_KEY,
                                  option.value
                                )
                              } catch {}
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="my-1 border-t border-border" />
                    <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Sessions
                    </div>
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors"
                      onClick={() => {
                        const next = !autoSessionEnabled
                        setAutoSessionEnabled(next)
                        try { localStorage.setItem("timer-auto-session", String(next)) } catch {}
                      }}
                    >
                      <span className="text-foreground">Auto-Start Sessions</span>
                      <span className={cn("font-mono text-[12px]", autoSessionEnabled ? "text-primary font-medium" : "text-muted-foreground")}>
                        {autoSessionEnabled ? "On" : "Off"}
                      </span>
                    </button>
                    <button
                      className={cn("w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors", !autoSessionEnabled && "opacity-40 cursor-not-allowed")}
                      onClick={() => {
                        if (!autoSessionEnabled) return
                        const next = !autoStopEnabled
                        setAutoStopEnabled(next)
                        try { localStorage.setItem("timer-auto-stop", String(next)) } catch {}
                      }}
                      disabled={!autoSessionEnabled}
                    >
                      <span className="text-foreground">Auto-Stop on Idle</span>
                      <span className={cn("font-mono text-[12px]", autoStopEnabled && autoSessionEnabled ? "text-primary font-medium" : "text-muted-foreground")}>
                        {autoStopEnabled ? "On" : "Off"}
                      </span>
                    </button>
                    {autoSessionEnabled && autoStopEnabled && (
                      <div className="px-3 py-2 space-y-1.5">
                        <span className="block text-[11px] font-medium text-foreground">
                          Idle Timeout
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {([5, 10, 15, 30] as const).map((min) => (
                            <button
                              key={min}
                              className={cn(
                                "h-7 rounded border text-[11px] font-medium transition-colors",
                                idleTimeoutMin === min
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                              onClick={() => {
                                setIdleTimeoutMin(min)
                                try { localStorage.setItem("timer-idle-timeout-min", String(min)) } catch {}
                              }}
                            >
                              {min}m
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="my-1 border-t border-border" />
                    <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Shortcuts
                    </div>
                    <ShortcutSettings
                      map={shortcutMap}
                      onMapChange={(next) => {
                        setShortcutMap(next)
                        saveShortcutMap(next)
                      }}
                    />
                    {practiceType !== "Comp Sim" && (
                      <>
                        <div className="my-1 border-t border-border" />
                        <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Tools
                        </div>
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors"
                          onClick={() =>
                            setAutoHideDuringSolve(!paneLayout.autoHideDuringSolve)
                          }
                        >
                          <span className="text-foreground">Hide Tools During Solve</span>
                          <span
                            className={cn(
                              "font-mono text-[12px]",
                              paneLayout.autoHideDuringSolve
                                ? "text-primary font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {paneLayout.autoHideDuringSolve ? "On" : "Off"}
                          </span>
                        </button>
                        <div className="px-3 py-2 space-y-1.5">
                          <span className="block text-[11px] font-medium text-foreground">
                            Pane Size
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {([
                              { value: "sm", label: "Small" },
                              { value: "md", label: "Medium" },
                              { value: "lg", label: "Large" },
                            ] as const).map((optionSize) => (
                              <button
                                key={optionSize.value}
                                className={cn(
                                  "h-7 rounded border text-[11px] font-medium transition-colors",
                                  paneLayout.desktop.size === optionSize.value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                onClick={() => setDesktopPaneSize(optionSize.value)}
                              >
                                {optionSize.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {PANE_TOOL_OPTIONS.map((option) => {
                          const tool = option.tool as PaneToolId
                          const openPane = paneByTool.get(tool)
                          const isOpen = !!openPane
                          const canAddMore = panes.length < 4
                          const isAvailable = PANE_REGISTRY[tool].isAvailable(paneContext)
                          const showCrossEventHint =
                            tool === "cross" && !isOpen && !isAvailable
                          const paneLimitDisabled = !isOpen && !canAddMore
                          const disabled = paneLimitDisabled || showCrossEventHint
                          const disabledReason = showCrossEventHint
                            ? "Only works on 3x3 and 3x3 one-handed"
                            : paneLimitDisabled
                            ? "Max 4 panes open"
                            : null
                          return (
                            <div key={tool}>
                              <button
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors",
                                  disabled && "opacity-40 cursor-not-allowed"
                                )}
                                onClick={() => {
                                  if (showCrossEventHint || paneLimitDisabled) return
                                  if (isOpen && openPane) {
                                    removePane(openPane.id)
                                  } else {
                                    addPane(tool)
                                    if (
                                      typeof window !== "undefined" &&
                                      !window.matchMedia("(min-width: 1024px)").matches
                                    ) {
                                      setMobilePaneOpenRequestKey((value) => value + 1)
                                    }
                                  }
                                }}
                                disabled={paneLimitDisabled}
                                aria-disabled={disabled}
                                title={
                                  disabledReason
                                    ? `${option.label}: ${disabledReason}`
                                    : undefined
                                }
                              >
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-foreground">
                                  {option.label}
                                  {showCrossEventHint && (
                                    <span
                                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/50 text-muted-foreground"
                                      title="Only works on 3x3 and 3x3 one-handed"
                                      aria-label="Only works on 3x3 and 3x3 one-handed"
                                    >
                                      <Info size={10} />
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={cn(
                                    "font-mono text-[12px]",
                                    isOpen ? "text-primary font-medium" : "text-muted-foreground"
                                  )}
                                >
                                  {isOpen ? "Open" : "Closed"}
                                </span>
                              </button>
                              {isOpen && openPane && (
                                <div className="px-3 pb-2">
                                  <div className="grid grid-cols-4 gap-1">
                                    {INLINE_SLOT_OPTIONS.map((slotOption) => (
                                      <button
                                        key={`${openPane.id}-${slotOption.slot}`}
                                        className={cn(
                                          "h-7 rounded border text-[11px] font-medium transition-colors",
                                          openPane.slot === slotOption.slot
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                        onClick={() => setPaneSlot(openPane.id, slotOption.slot)}
                                      >
                                        {slotOption.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
        </div>

        {practiceType !== "Comp Sim" && (
          <span
            className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs font-mono transition-all duration-200 z-20 pointer-events-none",
                scrambleCopied
                  ? "opacity-100 translate-y-0 text-green-400"
                  : "opacity-0 -translate-y-1 text-green-400"
              )}
            >
              Scramble copied!
            </span>
          )}
        </div>

        {practiceType !== "Comp Sim" && scrambleError && (
          <div className="border-b border-yellow-700/50 bg-yellow-900/35 px-4 py-1.5 text-xs text-yellow-200">
            {scrambleError}
          </div>
        )}
      </div>

      {practiceType !== "Comp Sim" && (
        <>
          <DesktopPaneWorkspace
            panes={panes}
            layout={paneLayout}
            context={paneContext}
            topOffsetPx={desktopPaneTopOffsetPx}
            timingActive={timingActive}
            autoHideDuringSolve={paneLayout.autoHideDuringSolve}
            onUpdatePaneOptions={updatePaneOptions}
          />
          <MobilePaneDrawer
            panes={panes}
            layout={paneLayout}
            context={paneContext}
            timingActive={timingActive}
            autoHideDuringSolve={paneLayout.autoHideDuringSolve}
            openRequestKey={mobilePaneOpenRequestKey}
            onAddPane={addPane}
            onRemovePane={removePane}
            onChangeTool={changePaneTool}
            onMovePane={moveMobilePane}
            onSetPaneHeight={setMobilePaneHeight}
            onUpdatePaneOptions={updatePaneOptions}
          />
        </>
      )}

      {practiceType === "Comp Sim" ? (
        <CompSimOverlay
          event={event}
          config={compSimConfig}
          startSignal={compSimStartSignal}
          typing={typing}
          inspectionEnabled={inspOn}
          inspectionVoiceEnabled={inspVoiceOn}
          inspectionVoiceGender={inspVoiceGender}
          timerUpdateMode={timerUpdateMode}
          timerReadoutTextSize={timerReadoutTextSize}
          onConfigChange={updateCompSimConfig}
          onExit={handleCompSimExit}
          onBusyChange={setCompSimBusy}
          btHandleRef={compSimBtRef}
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
          <SolveListPanel
            ref={solveListPanelRef}
            rows={solveRows}
            loadedCount={solves.length}
            totalSolveCount={totalSolveCount}
            rangeStart={solveRange.start}
            rangeEnd={solveRange.end}
            scrollResetKey={event}
            frozen={phase === "running" || engineSnapshot.suppressOptionalUi}
            stats={visibleListStats}
            summaryStats={headerSummaryStats}
            sessionStats={sessionStatsForPanel}
            statCols={statCols}
            latestSolve={last ?? null}
            selectedId={selectedId}
            selectedMetric={selectedMetric}
            selectedSolve={selectedSolve}
            savedSolveCount={panelSavedSolveCount}
            groupBoundaries={groupDividers.boundaries}
            groupDividerLabels={groupDividers.labels}
            currentSessionLabel={currentSessionLabel}
            currentSolveCount={sessionSolveCountForPanel}
            showAllStats={showAllStatsInList}
            textSize={paneTimeTextSize}
            eventDnfCount={eventDnfCount}
            unsavedDnfCount={unsavedDnfCount}
            historyStatus={historyStatus}
            historyError={historyError}
            syncingFromCloud={syncingFromCloud}
            onSetSelectedId={setSelectedId}
            onOpenSolveDetail={handleOpenSolveDetail}
            onOpenStatDetail={handleOpenStatDetail}
            onSelectSolveCell={handleSelectSolveCell}
            onSetPenalty={setPenalty}
            onDeleteSolve={deleteSolve}
            onShareSolve={handleShareSolve}
            onUpdateStatCol={updateStatCol}
            onRangeChange={handleRangeChange}
            onUpdateSavedSessionDuration={updateSavedSessionGroupDuration}
            onRetryHistoryLoad={retryEventHistoryLoad}
            multiSelectMode={multiSelect.isActive}
            multiSelectCount={multiSelect.selectedCount}
            isMultiSelected={multiSelect.isSelected}
            isSelectAll={multiSelect.isSelectAll}
            onToggleMultiSelect={multiSelect.toggleSelect}
            onToggleSelectAll={multiSelect.toggleSelectAll}
            onEnterMultiSelect={multiSelect.enter}
            onExitMultiSelect={multiSelect.exit}
            onBulkDelete={handleBulkDelete}
          />

          <div
            data-onboarding-target="timer-readout"
            className="fixed inset-y-0 left-0 right-0 lg:left-72 xl:left-80 flex flex-col items-center justify-center pointer-events-none z-10"
          >
            {typing && phase === "inspecting" ? (
              <TimerReadout
                className={cn(
                  "font-mono font-light transition-colors duration-75 cursor-default",
                  TIMER_READOUT_SIZE_CLASSES[timerReadoutTextSize],
                  "text-foreground"
                )}
                phase={phase}
                currentTimeMs={null}
                last={lastDisplaySolve}
                inInspectionHold={false}
                inspectionSecondsLeft={insp.secondsLeft}
                timerUpdateMode={timerUpdateMode}
                btReset={engineSnapshot.btReset}
              />
            ) : typing ? (
              <>
                <div
                  className="flex items-center justify-center w-full max-w-[56rem] px-4 pointer-events-auto"
                  onPointerDown={sp}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0000"
                    value={typeVal}
                    autoFocus
                    readOnly={sessionPaused}
                    onFocus={() => {
                      if (sessionPaused) showPausedAttemptPopup(SESSION_PAUSED_ENTRY_MSG)
                    }}
                    onChange={(eventInput) => setTypeVal(eventInput.target.value)}
                    onKeyDown={(eventInput) => {
                      if (sessionPaused) {
                        if (eventInput.key !== "Tab") eventInput.preventDefault()
                        showPausedAttemptPopup(SESSION_PAUSED_ENTRY_MSG)
                        return
                      }
                      if (eventInput.key !== "Enter") return
                      if (!parsedTypeTime) return
                      const inspPen = inspectionPenaltyRef.current
                      inspectionPenaltyRef.current = null
                      addSolve(parsedTypeTime, inspPen)
                      setTypeVal("")
                    }}
                    className={cn(
                      "bg-transparent border-b-2 border-border text-center font-mono font-light w-full outline-none placeholder:text-muted-foreground/30 read-only:opacity-40 read-only:cursor-not-allowed",
                      TYPING_INPUT_SIZE_CLASSES[timerReadoutTextSize]
                    )}
                  />
                </div>
                <p className="mt-2 text-sm font-mono text-muted-foreground h-5">
                  {sessionPaused
                    ? "Session paused"
                    : inspectionPenaltyRef.current === "+2"
                    ? "+2 from inspection"
                    : typeVal
                    ? parsedTypeTime !== null
                      ? `= ${formatTimeMsCentiseconds(parsedTypeTime)}`
                      : "invalid"
                    : inspOn
                    ? "Space to inspect"
                    : ""}
                </p>
              </>
            ) : (
              <TimerReadout
                className={cn(
                  "font-mono font-light transition-colors duration-75 cursor-default",
                  TIMER_READOUT_SIZE_CLASSES[timerReadoutTextSize],
                  timeColor
                )}
                phase={phase}
                currentTimeMs={phase === "running" ? solveClock.displayElapsedMs : null}
                last={lastDisplaySolve}
                inInspectionHold={inInspHold}
                inspectionSecondsLeft={insp.secondsLeft}
                timerUpdateMode={timerUpdateMode}
                btReset={engineSnapshot.btReset}
              />
            )}

            {phase === "stopped" && last && (
              <div className="flex gap-3 py-3 pointer-events-auto" onPointerDown={sp}>
                <button
                  className={cn(
                    "text-[13px] font-sans font-medium px-3 py-1.5 rounded border transition-colors",
                    last.penalty === "+2"
                      ? "bg-yellow-500 text-black border-yellow-500"
                      : "border-border text-muted-foreground hover:border-yellow-500 hover:text-yellow-400"
                  )}
                  onClick={() => setPenalty(last.id, last.penalty === "+2" ? null : "+2")}
                  title="+2 penalty (+)"
                >
                  +2
                </button>
                <button
                  className={cn(
                    "text-[13px] font-sans font-medium px-3 py-1.5 rounded border transition-colors",
                    last.penalty === "DNF"
                      ? "bg-red-500 text-white border-red-500"
                      : "border-border text-muted-foreground hover:border-red-500 hover:text-red-400"
                  )}
                  onClick={() =>
                    setPenalty(last.id, last.penalty === "DNF" ? null : "DNF")
                  }
                  title="DNF (D)"
                >
                  DNF
                </button>
                <button
                  className="text-[13px] font-sans px-3 py-1.5 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                  onClick={() => {
                    const deleted = deleteSolve(last.id)
                    if (deleted) setIdle()
                  }}
                >
                  Delete
                </button>
                {canSharePb && (
                  <button
                    className="text-[13px] font-sans font-semibold px-3 py-1.5 rounded border border-cyan-400/60 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                    onClick={() => setPbPhotoOpen(true)}
                  >
                    Share PB
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative flex-1 order-first lg:order-last min-h-[60vh] lg:min-h-0">
            <div
              className="absolute left-3 right-3 top-3 z-30 rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg overflow-hidden sm:right-auto sm:w-56"
              onPointerDown={sp}
            >
              {hasActiveSession ? (
                <>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        sessionPaused ? "bg-yellow-400" : "bg-green-500 animate-pulse"
                      )}
                    />
                    <span className="font-mono text-sm font-medium">
                      {fmtSession(sessionElapsed)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {currentSolveCount} solve{currentSolveCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {sessionPaused && (
                    <div className="px-3 pb-1">
                      <span className="text-[10px] text-yellow-400">Paused - solving disabled</span>
                    </div>
                  )}
                  <div className="flex border-t border-border/50">
                    <button
                      className="flex-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                      onClick={sessionPaused ? resumeSession : pauseSession}
                      disabled={timingActive}
                    >
                      {sessionPaused ? "▶ Resume" : "⏸ Pause"}
                    </button>
                    <div className="w-px bg-border/50" />
                    <button
                      className="flex-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                      onClick={endSession}
                      disabled={timingActive}
                    >
                      {currentSolveCount === 0 ? "Cancel" : "⏹ Stop"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="w-full px-4 py-3 text-sm font-semibold text-left text-white transition-all hover:brightness-110 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"
                  onClick={() => startSession()}
                >
                  {sessionSaved ? (
                    <span className="text-white">Session saved! Start another</span>
                  ) : (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/90 animate-pulse" />
                      Start Session
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pausedAttemptMessage && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-[70] -translate-x-1/2 px-4">
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/15 px-3 py-2 text-xs font-semibold text-yellow-300 shadow-lg backdrop-blur-sm">
            {pausedAttemptMessage}
          </div>
        </div>
      )}

      {idleWarningSecondsLeft !== null && (
        <div className="fixed left-1/2 top-16 z-[70] -translate-x-1/2 px-4">
          <div className="flex items-center gap-3 rounded-lg border border-orange-500/50 bg-orange-500/15 px-4 py-2.5 text-xs font-semibold text-orange-300 shadow-lg backdrop-blur-sm">
            <span>
              Session ending in{" "}
              <span className="font-mono">
                {Math.floor(idleWarningSecondsLeft / 60)}:{String(idleWarningSecondsLeft % 60).padStart(2, "0")}
              </span>
              {" "}due to inactivity
            </span>
            <button
              className="rounded-md border border-orange-400/50 bg-orange-500/20 px-2.5 py-1 text-[11px] font-semibold text-orange-200 transition-colors hover:bg-orange-500/30"
              onClick={dismissIdleWarning}
            >
              Stay active
            </button>
          </div>
        </div>
      )}

      {compSimEntryDialogConfig && (
        <CompSimEntryDialog
          open={true}
          title={compSimEntryDialogConfig.title}
          description={compSimEntryDialogConfig.description}
          actions={compSimEntryDialogConfig.actions}
          onOpenChange={(open) => {
            if (!open) {
              setCompSimAutoStartRequested(false)
              setCompSimEntryGuard(null)
            }
          }}
        />
      )}

      {showEndModal && activeSessionStartMs !== null && (
        <EndSessionModal
          solves={currentSessionSolves}
          event={event}
          eventName={EVENTS.find((entry) => entry.id === event)?.name ?? event}
          practiceType={practiceType}
          durationMinutes={
            (Date.now() - activeSessionStartMs - sessionPausedMsRef.current) / 1000 / 60
          }
          sessionStartMs={activeSessionStartMs}
          autoStopReason={autoStopReason}
          onClose={() => {
            setShowEndModal(false)
            setPendingEventSwitch(null)
            setPendingPracticeTypeSwitch(null)
            clearAutoStopReason()
          }}
          onDiscard={() => {
            discardSessionSolves()
            clearAutoStopReason()
          }}
          onSaved={(payload) => {
            handleSessionSaved(payload)
            clearAutoStopReason()
          }}
        />
      )}
      <SolveDetailModal
        key={detailSolve?.id ?? "closed"}
        solve={detailSolve}
        solveNumber={detailSolveNumber}
        isOpen={detailSolve !== null}
        isPersonalBest={isSolvePersonalBest(detailSolve)}
        onClose={() => setDetailSolveId(null)}
        onPenaltyChange={setPenalty}
        onDelete={deleteSolve}
        onNotesChange={handleSolveNotesChange}
        onShare={handleShareSolve}
      />
      <StatDetailModal
        isOpen={statDetail !== null}
        onClose={() => setStatDetail(null)}
        info={statDetail}
        onSolveClick={(solve) => handleOpenSolveDetail(solve.id)}
      />
      {shareCardData && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          data={shareCardData}
          defaultAspectRatio="1:1"
        />
      )}
      {pbPhotoOpen && (
        <PbPhotoModeOverlay
          eventLabel={getEventLabel(event)}
          timeText={lastSinglePb?.formattedTime ?? "0.00"}
          scramble={lastSinglePb?.scramble ?? ""}
          displayName={viewer?.displayName ?? "Cuber"}
          handle={viewer?.handle ?? null}
          onClose={() => setPbPhotoOpen(false)}
        />
      )}
      {timerTour && (
        <OnboardingTour
          key={timerTour}
          open
          steps={ONBOARDING_TOURS[timerTour]}
          onClose={clearTour}
          onSkip={clearTour}
        />
      )}
    </div>
  )
}
