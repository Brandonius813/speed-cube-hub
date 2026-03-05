"use client"

import type { ComponentType } from "react"
import type {
  DesktopPaneSlot,
  PaneContentProps,
  PaneToolId,
  TimerPaneRect,
  TimerPaneRenderContext,
} from "@/components/timer/panes/types"
import { PaneScrambleText } from "@/components/timer/panes/pane-scramble-text"
import { PaneDraw } from "@/components/timer/panes/pane-draw"
import { PaneCross } from "@/components/timer/panes/pane-cross"
import { PaneTimeDistribution } from "@/components/timer/panes/pane-time-distribution"
import { PaneTimeTrend } from "@/components/timer/panes/pane-time-trend"

export type PaneRegistryEntry = {
  tool: PaneToolId
  label: string
  defaultSlot: DesktopPaneSlot
  defaultRect: TimerPaneRect
  minW: number
  minH: number
  maxInstances: number
  isAvailable: (context: TimerPaneRenderContext) => boolean
  Render: ComponentType<PaneContentProps>
}

export const PANE_REGISTRY: Record<PaneToolId, PaneRegistryEntry> = {
  scramble_text: {
    tool: "scramble_text",
    label: "Scramble",
    defaultSlot: "top_right",
    defaultRect: { x: 2, y: 7, w: 8, h: 3 },
    minW: 3,
    minH: 3,
    maxInstances: 1,
    isAvailable: () => true,
    Render: PaneScrambleText,
  },
  draw: {
    tool: "draw",
    label: "Draw Scramble",
    defaultSlot: "bottom_left",
    defaultRect: { x: 2, y: 2, w: 8, h: 8 },
    minW: 8,
    minH: 8,
    maxInstances: 1,
    isAvailable: () => true,
    Render: PaneDraw,
  },
  cross: {
    tool: "cross",
    label: "Cross Trainer",
    defaultSlot: "bottom_right",
    defaultRect: { x: 14, y: 2, w: 8, h: 8 },
    minW: 8,
    minH: 8,
    maxInstances: 1,
    isAvailable: (context) => context.event === "333" || context.event === "333oh",
    Render: PaneCross,
  },
  time_distribution: {
    tool: "time_distribution",
    label: "Time Distribution",
    defaultSlot: "bottom_middle",
    defaultRect: { x: 2, y: 2, w: 8, h: 8 },
    minW: 8,
    minH: 8,
    maxInstances: 1,
    isAvailable: () => true,
    Render: PaneTimeDistribution,
  },
  time_trend: {
    tool: "time_trend",
    label: "Time Trend",
    defaultSlot: "top_right",
    defaultRect: { x: 14, y: 2, w: 8, h: 8 },
    minW: 8,
    minH: 8,
    maxInstances: 1,
    isAvailable: () => true,
    Render: PaneTimeTrend,
  },
}

export const PANE_TOOL_OPTIONS = (Object.keys(PANE_REGISTRY) as PaneToolId[])
  .filter((tool) => tool !== "scramble_text")
  .map((tool) => ({
    tool,
    label: PANE_REGISTRY[tool].label,
  }))
