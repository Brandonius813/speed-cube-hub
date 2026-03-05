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

type RingPreset = {
  sideRatio: number
  bandRatio: number
  centerMin: number
}

const OUTER_GAP_PX = 12
const INNER_GAP_PX = 12
const MIN_ZONE_WIDTH_PX = 560
const MIN_ZONE_HEIGHT_PX = 360
const MIN_MIDDLE_HEIGHT_PX = 160

const RING_PRESETS: Record<DesktopPaneSize, RingPreset> = {
  sm: {
    sideRatio: 0.2,
    bandRatio: 0.16,
    centerMin: 280,
  },
  md: {
    sideRatio: 0.24,
    bandRatio: 0.2,
    centerMin: 340,
  },
  lg: {
    sideRatio: 0.28,
    bandRatio: 0.24,
    centerMin: 400,
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isDesktopPaneSlot(value: string | undefined): value is DesktopPaneSlot {
  return value === "top" || value === "left" || value === "right" || value === "bottom"
}

function rectStyle(rect: PixelRect): CSSProperties {
  return {
    transform: `translate3d(${Math.round(rect.x)}px, ${Math.round(rect.y)}px, 0)`,
    width: Math.round(rect.w),
    height: Math.round(rect.h),
  }
}

function computeRingRects(
  zoneWidth: number,
  zoneHeight: number,
  size: DesktopPaneSize
): Record<DesktopPaneSlot, PixelRect> | null {
  if (zoneWidth < MIN_ZONE_WIDTH_PX || zoneHeight < MIN_ZONE_HEIGHT_PX) return null

  const preset = RING_PRESETS[size]
  const innerWidth = zoneWidth - OUTER_GAP_PX * 2
  const innerHeight = zoneHeight - OUTER_GAP_PX * 2

  const maxSideWidth = Math.max(
    120,
    Math.floor((innerWidth - preset.centerMin - INNER_GAP_PX * 2) / 2)
  )

  let sideWidth = clamp(Math.round(innerWidth * preset.sideRatio), 120, maxSideWidth)
  let centerWidth = innerWidth - sideWidth * 2 - INNER_GAP_PX * 2

  if (centerWidth < preset.centerMin) {
    sideWidth = Math.max(120, Math.floor((innerWidth - preset.centerMin - INNER_GAP_PX * 2) / 2))
    centerWidth = innerWidth - sideWidth * 2 - INNER_GAP_PX * 2
  }

  if (centerWidth < 180) return null

  let topHeight = clamp(Math.round(innerHeight * preset.bandRatio), 70, 220)
  let bottomHeight = topHeight
  let middleHeight = innerHeight - topHeight - bottomHeight - INNER_GAP_PX * 2

  if (middleHeight < MIN_MIDDLE_HEIGHT_PX) {
    const shrinkEach = Math.ceil((MIN_MIDDLE_HEIGHT_PX - middleHeight) / 2)
    topHeight = Math.max(56, topHeight - shrinkEach)
    bottomHeight = Math.max(56, bottomHeight - shrinkEach)
    middleHeight = innerHeight - topHeight - bottomHeight - INNER_GAP_PX * 2
  }

  if (middleHeight < 120) return null

  const leftX = OUTER_GAP_PX
  const centerX = leftX + sideWidth + INNER_GAP_PX
  const rightX = centerX + centerWidth + INNER_GAP_PX

  const topY = OUTER_GAP_PX
  const middleY = topY + topHeight + INNER_GAP_PX
  const bottomY = middleY + middleHeight + INNER_GAP_PX

  return {
    top: {
      x: centerX,
      y: topY,
      w: centerWidth,
      h: topHeight,
    },
    left: {
      x: leftX,
      y: middleY,
      w: sideWidth,
      h: middleHeight,
    },
    right: {
      x: rightX,
      y: middleY,
      w: sideWidth,
      h: middleHeight,
    },
    bottom: {
      x: centerX,
      y: bottomY,
      w: centerWidth,
      h: bottomHeight,
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
    () => computeRingRects(zoneSize.width, zoneSize.height, layout.desktop.size),
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
        {slotRects && DESKTOP_PANE_SLOTS.map((slot) => {
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
              <div className="flex items-center justify-between gap-2 border-b border-border/70 px-2 py-1">
                <span className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
                  {entry.label}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {slot.toUpperCase()}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden p-2">
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
