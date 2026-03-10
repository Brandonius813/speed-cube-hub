import type { TimerPhase } from "@/lib/timer/engine"
import type { Solve as StoredSolve } from "@/lib/types"

export type PaneToolId =
  | "scramble_text"
  | "draw"
  | "cross"
  | "time_distribution"
  | "time_trend"

export type TimerPaneScope = "session" | "all"
export type TimerPaneTextSize = "md" | "lg" | "xl"
export type DesktopPaneSize = "sm" | "md" | "lg"
export type DesktopPaneSlot =
  | "top_right"
  | "bottom_right"
  | "bottom_middle"
  | "bottom_left"
export type LegacyDesktopPaneSlot = "top" | "left" | "right" | "bottom"

export type TimerPaneRect = {
  x: number
  y: number
  w: number
  h: number
}

export type DragInteractionState = {
  paneId: string
  mode: "move" | "resize"
  pointerId: number
  startClientX: number
  startClientY: number
  currentClientX: number
  currentClientY: number
  startRect: TimerPaneRect
  startPixelRect: {
    x: number
    y: number
    w: number
    h: number
  }
  minW: number
  minH: number
}

export type SnapGuide = {
  axis: "x" | "y"
  positionPx: number
  source: "workspace" | "pane"
  kind: "edge" | "center"
}

export type SnapCandidate = {
  rect: TimerPaneRect
  source: "base" | "guide" | "dock" | "fallback"
  score: number
}

export type DockPreview = {
  zone:
    | "left-half"
    | "right-half"
    | "top-left"
    | "bottom-left"
    | "top-right"
    | "bottom-right"
  rect: TimerPaneRect
}

export type TimerPaneInstance = {
  id: string
  tool: PaneToolId
  rect: TimerPaneRect
  slot?: DesktopPaneSlot | LegacyDesktopPaneSlot
  options?: {
    scope?: TimerPaneScope
  }
}

export type TimerPaneToolPreference = {
  slot?: DesktopPaneSlot | LegacyDesktopPaneSlot
  options?: TimerPaneInstance["options"]
  mobileHeight?: "sm" | "md" | "lg"
}

export type TimerPaneLayoutV1 = {
  version: 1
  updatedAtMs: number
  autoHideDuringSolve: boolean
  toolPreferences?: Partial<Record<PaneToolId, TimerPaneToolPreference>>
  desktop: {
    cols: 12 | 24
    rowHeight: 36
    gap: 8
    size: DesktopPaneSize
    panes: TimerPaneInstance[]
  }
  mobile: {
    order: string[]
    heights: Record<string, "sm" | "md" | "lg">
  }
}

export type TimerPaneRenderContext = {
  event: string
  phase: TimerPhase
  scramble: string
  scramblePaneTextSize: TimerPaneTextSize
  canShowCrossTrainer: boolean
  chartSolvesSession: StoredSolve[]
  chartSolvesAll: StoredSolve[]
  statCols: [string, string]
}

export type PaneContentProps = {
  pane: TimerPaneInstance
  context: TimerPaneRenderContext
  updatePaneOptions: (paneId: string, options: TimerPaneInstance["options"]) => void
}

export const TIMER_PANE_MAX = 4
export const DESKTOP_PANE_SLOTS: DesktopPaneSlot[] = [
  "top_right",
  "bottom_right",
  "bottom_middle",
  "bottom_left",
]

export const TIMER_PANE_TOOLS: PaneToolId[] = [
  "scramble_text",
  "draw",
  "cross",
  "time_distribution",
  "time_trend",
]

export const DEFAULT_TIMER_PANE_LAYOUT: TimerPaneLayoutV1 = {
  version: 1,
  updatedAtMs: 0,
  autoHideDuringSolve: false,
  desktop: {
    cols: 24,
    rowHeight: 36,
    gap: 8,
    size: "md",
    panes: [],
  },
  mobile: {
    order: [],
    heights: {},
  },
}
