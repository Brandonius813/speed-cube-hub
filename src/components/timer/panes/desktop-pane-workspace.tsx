"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { PANE_REGISTRY } from "@/components/timer/panes/pane-registry"
import {
  DESKTOP_PANE_SLOTS,
  type DesktopPaneSize,
  type DesktopPaneSlot,
  type TimerPaneInstance,
  type TimerPaneLayoutV1,
  type TimerPaneRenderContext,
} from "@/components/timer/panes/types"

type DesktopPaneWorkspaceProps = {
  panes: TimerPaneInstance[]
  layout: TimerPaneLayoutV1
  context: TimerPaneRenderContext
  topOffsetPx: number
  timingActive: boolean
  autoHideDuringSolve: boolean
  onUpdatePaneOptions: (paneId: string, options: TimerPaneInstance["options"]) => void
}

type PixelRect = {
  x: number
  y: number
  w: number
  h: number
}

type SlotPreset = {
  widthFill: number
  heightAspect: number
  centerMin: number
  maxCardWidth: number
}

const OUTER_GAP_PX = 12
const BOTTOM_GAP_PX = 12
const VERTICAL_GAP_PX = 8
const MIN_ZONE_WIDTH_PX = 500
const MIN_ZONE_HEIGHT_PX = 320
const MIN_CARD_WIDTH_PX = 150
const MIN_CARD_HEIGHT_PX = 170

const SLOT_PRESETS: Record<DesktopPaneSize, SlotPreset> = {
  sm: {
    widthFill: 1,
    heightAspect: 0.68,
    centerMin: 150,
    maxCardWidth: 440,
  },
  md: {
    widthFill: 1,
    heightAspect: 0.8,
    centerMin: 90,
    maxCardWidth: 540,
  },
  lg: {
    widthFill: 1,
    heightAspect: 0.9,
    centerMin: 56,
    maxCardWidth: 620,
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isDesktopPaneSlot(value: string | undefined): value is DesktopPaneSlot {
  return (
    value === "top_right" ||
    value === "bottom_right" ||
    value === "bottom_middle" ||
    value === "bottom_left"
  )
}

function rectStyle(rect: PixelRect): CSSProperties {
  return {
    transform: `translate3d(${Math.round(rect.x)}px, ${Math.round(rect.y)}px, 0)`,
    width: Math.round(rect.w),
    height: Math.round(rect.h),
  }
}

function computeSlotRects(
  zoneWidth: number,
  zoneHeight: number,
  size: DesktopPaneSize
): Record<DesktopPaneSlot, PixelRect> | null {
  if (zoneWidth < MIN_ZONE_WIDTH_PX || zoneHeight < MIN_ZONE_HEIGHT_PX) return null

  const preset = SLOT_PRESETS[size]
  const innerWidth = zoneWidth - OUTER_GAP_PX * 2
  const innerHeight = zoneHeight - OUTER_GAP_PX * 2

  if (innerWidth <= 0 || innerHeight <= 0) return null

  const rowCardMaxWidth = Math.floor((innerWidth - BOTTOM_GAP_PX * 2) / 3)
  const maxCardHeight = Math.floor((innerHeight - preset.centerMin - VERTICAL_GAP_PX) / 2)

  if (rowCardMaxWidth < MIN_CARD_WIDTH_PX || maxCardHeight < MIN_CARD_HEIGHT_PX) return null

  const widthCap = Math.min(rowCardMaxWidth, preset.maxCardWidth)
  const cardWidth = clamp(Math.round(rowCardMaxWidth * preset.widthFill), MIN_CARD_WIDTH_PX, widthCap)
  const cardHeight = clamp(
    Math.round(cardWidth * preset.heightAspect),
    MIN_CARD_HEIGHT_PX,
    maxCardHeight
  )

  const totalBottomWidth = cardWidth * 3 + BOTTOM_GAP_PX * 2
  const bottomStartX = OUTER_GAP_PX + Math.round((innerWidth - totalBottomWidth) / 2)
  const leftX = bottomStartX
  const middleX = leftX + cardWidth + BOTTOM_GAP_PX
  const rightX = middleX + cardWidth + BOTTOM_GAP_PX

  const topY = OUTER_GAP_PX
  const bottomY = OUTER_GAP_PX + innerHeight - cardHeight

  if (bottomY - (topY + cardHeight) - VERTICAL_GAP_PX < preset.centerMin) return null

  return {
    top_right: {
      x: rightX,
      y: topY,
      w: cardWidth,
      h: cardHeight,
    },
    bottom_right: {
      x: rightX,
      y: bottomY,
      w: cardWidth,
      h: cardHeight,
    },
    bottom_middle: {
      x: middleX,
      y: bottomY,
      w: cardWidth,
      h: cardHeight,
    },
    bottom_left: {
      x: leftX,
      y: bottomY,
      w: cardWidth,
      h: cardHeight,
    },
  }
}

export function DesktopPaneWorkspace({
  panes,
  layout,
  context,
  topOffsetPx,
  timingActive,
  autoHideDuringSolve,
  onUpdatePaneOptions,
}: DesktopPaneWorkspaceProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null)
  const [zoneSize, setZoneSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const node = zoneRef.current
    if (!node) return

    const updateSize = () => {
      setZoneSize({ width: node.clientWidth, height: node.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const paneBySlot = useMemo(() => {
    const map = new Map<DesktopPaneSlot, TimerPaneInstance>()
    for (const pane of panes) {
      if (!isDesktopPaneSlot(pane.slot)) continue
      if (!map.has(pane.slot)) {
        map.set(pane.slot, pane)
      }
    }
    return map
  }, [panes])

  const slotRects = useMemo(
    () => computeSlotRects(zoneSize.width, zoneSize.height, layout.desktop.size),
    [layout.desktop.size, zoneSize.height, zoneSize.width]
  )

  if (panes.length === 0) return null
  if (autoHideDuringSolve && timingActive) return null

  return (
    <div
      className="pointer-events-none fixed right-2 bottom-0 z-30 hidden lg:block lg:left-[calc(14rem+0.5rem)] xl:left-[calc(16rem+0.5rem)]"
      style={{ top: `${Math.max(92, Math.round(topOffsetPx))}px` }}
    >
      <div ref={zoneRef} className="relative h-full w-full overflow-hidden">
        {slotRects &&
          DESKTOP_PANE_SLOTS.map((slot) => {
            const pane = paneBySlot.get(slot)
            if (!pane) return null

            const entry = PANE_REGISTRY[pane.tool]
            const rect = slotRects[slot]

            return (
              <div
                key={pane.id}
                className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-lg border border-border/70 bg-background/95 shadow-2xl backdrop-blur"
                style={{
                  ...rectStyle(rect),
                  zIndex: 40,
                }}
              >
                <div className="min-h-0 flex-1 overflow-hidden p-1">
                  <entry.Render
                    pane={pane}
                    context={context}
                    updatePaneOptions={onUpdatePaneOptions}
                  />
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
