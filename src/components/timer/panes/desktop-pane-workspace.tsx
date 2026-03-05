"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { PANE_REGISTRY } from "@/components/timer/panes/pane-registry"
import {
  clampPixelRectToZone,
  findNearestFreeRect,
  fitRectAtOrigin,
  gridRectToPixels,
  hasPaneCollision,
  nearestGuideDistance,
  normalizePaneRect,
  pixelRectToGrid,
  type AxisGuideLine,
  type DesktopGridMetrics,
  type PixelPaneRect,
} from "@/components/timer/panes/desktop-pane-geometry"
import type {
  DockPreview,
  DragInteractionState,
  SnapCandidate,
  SnapGuide,
  TimerPaneInstance,
  TimerPaneLayoutV1,
  TimerPaneRenderContext,
} from "@/components/timer/panes/types"

type DesktopPaneWorkspaceProps = {
  panes: TimerPaneInstance[]
  layout: TimerPaneLayoutV1
  context: TimerPaneRenderContext
  topOffsetPx: number
  timingActive: boolean
  autoHideDuringSolve: boolean
  onUpdateRect: (paneId: string, rect: TimerPaneInstance["rect"]) => boolean
  onUpdatePaneOptions: (paneId: string, options: TimerPaneInstance["options"]) => void
}

type DragRenderState = {
  paneId: string
  mode: "move" | "resize"
  ghostRectPx: PixelPaneRect
  preview: SnapCandidate
  guides: SnapGuide[]
  dock: DockPreview | null
}

type AxisGuideSet = {
  x: AxisGuideLine[]
  y: AxisGuideLine[]
}

const GUIDE_SNAP_THRESHOLD_PX = 12
const DOCK_EDGE_THRESHOLD_PX = 64
const DOCK_UPPER_SPLIT = 0.35
const DOCK_LOWER_SPLIT = 0.65
const TARGET_PANE_WIDTH_PX = 520
const TARGET_PANE_COL_SPAN = 8
const MIN_RENDER_COLS = 16
const MAX_RENDER_COLS = 36
const SETTLE_TRANSITION =
  "transform 140ms cubic-bezier(0.22, 1, 0.36, 1), width 140ms cubic-bezier(0.22, 1, 0.36, 1), height 140ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease"

function isHeavyPane(tool: TimerPaneInstance["tool"]): boolean {
  return tool === "time_distribution" || tool === "time_trend"
}

function dockLabel(zone: DockPreview["zone"]): string {
  if (zone === "left-half") return "Dock: Left Half"
  if (zone === "right-half") return "Dock: Right Half"
  if (zone === "top-left") return "Dock: Top Left"
  if (zone === "bottom-left") return "Dock: Bottom Left"
  if (zone === "top-right") return "Dock: Top Right"
  return "Dock: Bottom Right"
}

function rectStyle(rect: PixelPaneRect): CSSProperties {
  return {
    transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
    width: rect.w,
    height: rect.h,
  }
}

function asSnapGuide(axis: "x" | "y", line: AxisGuideLine): SnapGuide {
  return {
    axis,
    positionPx: line.positionPx,
    source: line.source,
    kind: line.kind,
  }
}

function scaleAxisPosition(
  value: number,
  size: number,
  sourceLimit: number,
  targetLimit: number
): number {
  const sourceRange = Math.max(0, sourceLimit - size)
  const targetRange = Math.max(0, targetLimit - size)
  if (sourceRange <= 0 || targetRange <= 0) return 0
  const ratio = Math.max(0, Math.min(1, value / sourceRange))
  return Math.round(ratio * targetRange)
}

function scaleRectToGrid(
  rect: TimerPaneInstance["rect"],
  sourceGrid: Pick<DesktopGridMetrics, "cols" | "maxRows">,
  targetGrid: Pick<DesktopGridMetrics, "cols" | "maxRows">
): TimerPaneInstance["rect"] {
  return {
    ...rect,
    x: scaleAxisPosition(rect.x, rect.w, sourceGrid.cols, targetGrid.cols),
    y: scaleAxisPosition(rect.y, rect.h, sourceGrid.maxRows, targetGrid.maxRows),
  }
}

export function DesktopPaneWorkspace({
  panes,
  layout,
  context,
  topOffsetPx,
  timingActive,
  autoHideDuringSolve,
  onUpdateRect,
  onUpdatePaneOptions,
}: DesktopPaneWorkspaceProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragInteractionState | null>(null)
  const dragRenderRef = useRef<DragRenderState | null>(null)
  const capturedHandleRef = useRef<HTMLElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastValidPreviewRef = useRef<TimerPaneInstance["rect"] | null>(null)
  const previousGridRef = useRef<Pick<DesktopGridMetrics, "cols" | "maxRows"> | null>(
    null
  )
  const previousPaneSignatureRef = useRef("")
  const visibleRectByIdRef = useRef<Map<string, TimerPaneInstance["rect"]>>(new Map())

  const [zoneWidth, setZoneWidth] = useState(0)
  const [zoneHeight, setZoneHeight] = useState(0)
  const [dragRenderState, setDragRenderState] = useState<DragRenderState | null>(null)
  const [visiblePanes, setVisiblePanes] = useState<TimerPaneInstance[]>(panes)

  const { cols: storageCols, rowHeight, gap } = layout.desktop

  useEffect(() => {
    const node = zoneRef.current
    if (!node) return

    const observer = new ResizeObserver(() => {
      setZoneWidth(node.clientWidth)
      setZoneHeight(node.clientHeight)
    })

    setZoneWidth(node.clientWidth)
    setZoneHeight(node.clientHeight)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const renderCols = useMemo(() => {
    const fallbackWidth =
      typeof window !== "undefined" ? Math.max(320, window.innerWidth - 16) : 0
    const resolvedWidth = zoneWidth > 0 ? zoneWidth : fallbackWidth
    if (resolvedWidth <= 0) return storageCols
    const targetUnit = (TARGET_PANE_WIDTH_PX + gap) / TARGET_PANE_COL_SPAN
    const preferredCols = Math.round((resolvedWidth + gap) / targetUnit)
    return Math.max(
      MIN_RENDER_COLS,
      Math.min(MAX_RENDER_COLS, Math.max(1, preferredCols))
    )
  }, [gap, storageCols, zoneWidth])

  const colWidth = useMemo(() => {
    const fallbackWidth =
      typeof window !== "undefined" ? Math.max(320, window.innerWidth - 16) : 0
    const resolvedWidth = zoneWidth > 0 ? zoneWidth : fallbackWidth
    if (resolvedWidth <= 0) return 0
    return (resolvedWidth - gap * (renderCols - 1)) / renderCols
  }, [gap, renderCols, zoneWidth])

  const maxRows = useMemo(() => {
    const fallbackHeight =
      typeof window !== "undefined" ? Math.max(240, window.innerHeight - 104) : 0
    const resolvedHeight = zoneHeight > 0 ? zoneHeight : fallbackHeight
    if (resolvedHeight <= 0) return 1
    return Math.max(1, Math.floor((resolvedHeight + gap) / (rowHeight + gap)))
  }, [gap, rowHeight, zoneHeight])

  const metrics = useMemo<DesktopGridMetrics | null>(() => {
    if (colWidth <= 0 || maxRows <= 0) return null
    return {
      cols: renderCols,
      maxRows,
      colWidth,
      rowHeight,
      gap,
    }
  }, [colWidth, gap, maxRows, renderCols, rowHeight])

  const storageGrid = useMemo(
    () => ({
      cols: storageCols,
      maxRows,
    }),
    [maxRows, storageCols]
  )

  const workspaceWidthPx = useMemo(() => {
    if (!metrics) return 0
    return metrics.cols * (metrics.colWidth + metrics.gap) - metrics.gap
  }, [metrics])

  const workspaceHeightPx = useMemo(() => {
    if (!metrics) return 0
    return metrics.maxRows * (metrics.rowHeight + metrics.gap) - metrics.gap
  }, [metrics])

  const gridOffsetYPx = useMemo(() => {
    if (!metrics || zoneHeight <= 0) return 0
    return Math.max(0, zoneHeight - workspaceHeightPx)
  }, [metrics, workspaceHeightPx, zoneHeight])

  const paneSignature = useMemo(() => {
    return panes
      .map(
        (pane) =>
          `${pane.id}:${pane.rect.x},${pane.rect.y},${pane.rect.w},${pane.rect.h}:${pane.tool}`
      )
      .join("|")
  }, [panes])

  const applyVisiblePanes = useCallback((next: TimerPaneInstance[]) => {
    const nextById = new Map<string, TimerPaneInstance["rect"]>()
    for (const pane of next) {
      nextById.set(pane.id, pane.rect)
    }
    visibleRectByIdRef.current = nextById
    setVisiblePanes(next)
  }, [])

  const resolveVisiblePanes = useCallback(
    (baseRectForPane: (pane: TimerPaneInstance) => TimerPaneInstance["rect"]) => {
      if (!metrics) return panes

      const placed: TimerPaneInstance[] = []
      const resolved: TimerPaneInstance[] = []

      for (const pane of panes) {
        const entry = PANE_REGISTRY[pane.tool]
        const options = {
          cols: metrics.cols,
          maxRows: metrics.maxRows,
          minW: entry.minW,
          minH: entry.minH,
        }
        const normalized = normalizePaneRect(baseRectForPane(pane), options)
        const nextRect = hasPaneCollision(placed, normalized)
          ? findNearestFreeRect(placed, normalized, options) ?? normalized
          : normalized
        const nextPane: TimerPaneInstance = {
          ...pane,
          rect: nextRect,
        }
        resolved.push(nextPane)
        placed.push(nextPane)
      }

      return resolved
    },
    [metrics, panes]
  )

  useEffect(() => {
    if (!metrics) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applyVisiblePanes(panes)
      previousGridRef.current = null
      previousPaneSignatureRef.current = paneSignature
      return
    }

    const currentGrid = { cols: metrics.cols, maxRows: metrics.maxRows }
    const previousGrid = previousGridRef.current
    const paneChanged = previousPaneSignatureRef.current !== paneSignature

    if (!previousGrid || paneChanged) {
      applyVisiblePanes(
        resolveVisiblePanes((pane) =>
          scaleRectToGrid(pane.rect, storageGrid, currentGrid)
        )
      )
      previousGridRef.current = currentGrid
      previousPaneSignatureRef.current = paneSignature
      return
    }

    if (
      previousGrid.cols !== currentGrid.cols ||
      previousGrid.maxRows !== currentGrid.maxRows
    ) {
      applyVisiblePanes(
        resolveVisiblePanes((pane) => {
          const previousRect = visibleRectByIdRef.current.get(pane.id) ?? pane.rect
          return scaleRectToGrid(previousRect, previousGrid, currentGrid)
        })
      )
    }

    previousGridRef.current = currentGrid
    previousPaneSignatureRef.current = paneSignature
  }, [
    applyVisiblePanes,
    metrics,
    paneSignature,
    panes,
    resolveVisiblePanes,
    storageGrid,
  ])

  const visiblePaneById = useMemo(() => {
    const map = new Map<string, TimerPaneInstance>()
    for (const pane of visiblePanes) {
      map.set(pane.id, pane)
    }
    return map
  }, [visiblePanes])

  const buildGuides = useCallback(
    (paneId: string): AxisGuideSet => {
      if (!metrics) return { x: [], y: [] }

      const x: AxisGuideLine[] = [
        { positionPx: 0, source: "workspace", kind: "edge" },
        {
          positionPx: workspaceWidthPx / 2,
          source: "workspace",
          kind: "center",
        },
        {
          positionPx: workspaceWidthPx,
          source: "workspace",
          kind: "edge",
        },
      ]
      const y: AxisGuideLine[] = [
        { positionPx: 0, source: "workspace", kind: "edge" },
        {
          positionPx: workspaceHeightPx / 2,
          source: "workspace",
          kind: "center",
        },
        {
          positionPx: workspaceHeightPx,
          source: "workspace",
          kind: "edge",
        },
      ]

      for (const pane of visiblePanes) {
        if (pane.id === paneId) continue
        const rectPx = gridRectToPixels(pane.rect, metrics)
        x.push({ positionPx: rectPx.x, source: "pane", kind: "edge" })
        x.push({
          positionPx: rectPx.x + rectPx.w / 2,
          source: "pane",
          kind: "center",
        })
        x.push({
          positionPx: rectPx.x + rectPx.w,
          source: "pane",
          kind: "edge",
        })

        y.push({ positionPx: rectPx.y, source: "pane", kind: "edge" })
        y.push({
          positionPx: rectPx.y + rectPx.h / 2,
          source: "pane",
          kind: "center",
        })
        y.push({
          positionPx: rectPx.y + rectPx.h,
          source: "pane",
          kind: "edge",
        })
      }

      return { x, y }
    },
    [metrics, visiblePanes, workspaceHeightPx, workspaceWidthPx]
  )

  const computeDockPreview = useCallback(
    (
      state: DragInteractionState,
      pointerLocalX: number,
      pointerLocalY: number
    ): DockPreview | null => {
      if (!metrics) return null

      const nearLeft = pointerLocalX <= DOCK_EDGE_THRESHOLD_PX
      const nearRight = pointerLocalX >= workspaceWidthPx - DOCK_EDGE_THRESHOLD_PX

      if (!nearLeft && !nearRight) return null

      let zone: DockPreview["zone"]
      if (nearLeft) {
        if (pointerLocalY <= workspaceHeightPx * DOCK_UPPER_SPLIT) zone = "top-left"
        else if (pointerLocalY >= workspaceHeightPx * DOCK_LOWER_SPLIT) zone = "bottom-left"
        else zone = "left-half"
      } else {
        if (pointerLocalY <= workspaceHeightPx * DOCK_UPPER_SPLIT) zone = "top-right"
        else if (pointerLocalY >= workspaceHeightPx * DOCK_LOWER_SPLIT) zone = "bottom-right"
        else zone = "right-half"
      }

      const halfCols = Math.max(state.minW, Math.floor(metrics.cols / 2))
      const halfRows = Math.max(state.minH, Math.floor(metrics.maxRows / 2))

      const rawRect =
        zone === "left-half"
          ? { x: 0, y: 0, w: halfCols, h: metrics.maxRows }
          : zone === "right-half"
          ? { x: metrics.cols - halfCols, y: 0, w: halfCols, h: metrics.maxRows }
          : zone === "top-left"
          ? { x: 0, y: 0, w: halfCols, h: halfRows }
          : zone === "bottom-left"
          ? {
              x: 0,
              y: metrics.maxRows - halfRows,
              w: halfCols,
              h: halfRows,
            }
          : zone === "top-right"
          ? {
              x: metrics.cols - halfCols,
              y: 0,
              w: halfCols,
              h: halfRows,
            }
          : {
              x: metrics.cols - halfCols,
              y: metrics.maxRows - halfRows,
              w: halfCols,
              h: halfRows,
            }

      return {
        zone,
        rect: normalizePaneRect(rawRect, {
          cols: metrics.cols,
          maxRows: metrics.maxRows,
          minW: state.minW,
          minH: state.minH,
        }),
      }
    },
    [metrics, workspaceHeightPx, workspaceWidthPx]
  )

  const computeDragRender = useCallback(
    (
      state: DragInteractionState,
      clientX: number,
      clientY: number
    ): DragRenderState | null => {
      if (!metrics) return null

      const zoneBounds = zoneRef.current?.getBoundingClientRect()
      const pointerLocalXRaw = zoneBounds ? clientX - zoneBounds.left : clientX
      const pointerLocalYRaw = zoneBounds
        ? clientY - zoneBounds.top - gridOffsetYPx
        : clientY
      const pointerLocalX = Math.max(0, Math.min(workspaceWidthPx, pointerLocalXRaw))
      const pointerLocalY = Math.max(0, Math.min(workspaceHeightPx, pointerLocalYRaw))

      const dxPx = clientX - state.startClientX
      const dyPx = clientY - state.startClientY
      const unitX = metrics.colWidth + metrics.gap
      const unitY = metrics.rowHeight + metrics.gap
      const minWidthPx = state.minW * unitX - metrics.gap
      const minHeightPx = state.minH * unitY - metrics.gap

      if (state.mode === "move") {
        let ghostRectPx = clampPixelRectToZone(
          {
            ...state.startPixelRect,
            x: state.startPixelRect.x + dxPx,
            y: state.startPixelRect.y + dyPx,
          },
          workspaceWidthPx,
          workspaceHeightPx
        )

        const dock = computeDockPreview(state, pointerLocalX, pointerLocalY)
        if (dock) {
          const dockRect = hasPaneCollision(visiblePanes, dock.rect, state.paneId)
            ? findNearestFreeRect(visiblePanes, dock.rect, {
                cols: metrics.cols,
                maxRows: metrics.maxRows,
                minW: state.minW,
                minH: state.minH,
                ignorePaneId: state.paneId,
              })
            : dock.rect

          if (dockRect) {
            lastValidPreviewRef.current = dockRect
            return {
              paneId: state.paneId,
              mode: state.mode,
              ghostRectPx,
              preview: {
                rect: dockRect,
                source: "dock",
                score: 0,
              },
              guides: [],
              dock: {
                ...dock,
                rect: dockRect,
              },
            }
          }
        }

        const guides = buildGuides(state.paneId)
        const xAnchors = [
          ghostRectPx.x,
          ghostRectPx.x + ghostRectPx.w / 2,
          ghostRectPx.x + ghostRectPx.w,
        ]
        const yAnchors = [
          ghostRectPx.y,
          ghostRectPx.y + ghostRectPx.h / 2,
          ghostRectPx.y + ghostRectPx.h,
        ]

        let snappedGuides: SnapGuide[] = []

        let bestX: ReturnType<typeof nearestGuideDistance> | null = null
        for (const anchor of xAnchors) {
          const candidate = nearestGuideDistance(anchor, guides.x)
          if (!candidate) continue
          if (!bestX || candidate.distancePx < bestX.distancePx) bestX = candidate
        }
        if (bestX && bestX.distancePx <= GUIDE_SNAP_THRESHOLD_PX) {
          ghostRectPx = clampPixelRectToZone(
            {
              ...ghostRectPx,
              x: ghostRectPx.x + bestX.deltaPx,
            },
            workspaceWidthPx,
            workspaceHeightPx
          )
          snappedGuides.push(asSnapGuide("x", bestX.guide))
        }

        let bestY: ReturnType<typeof nearestGuideDistance> | null = null
        for (const anchor of yAnchors) {
          const candidate = nearestGuideDistance(anchor, guides.y)
          if (!candidate) continue
          if (!bestY || candidate.distancePx < bestY.distancePx) bestY = candidate
        }
        if (bestY && bestY.distancePx <= GUIDE_SNAP_THRESHOLD_PX) {
          ghostRectPx = clampPixelRectToZone(
            {
              ...ghostRectPx,
              y: ghostRectPx.y + bestY.deltaPx,
            },
            workspaceWidthPx,
            workspaceHeightPx
          )
          snappedGuides.push(asSnapGuide("y", bestY.guide))
        }

        const gridCandidate = pixelRectToGrid(
          {
            ...ghostRectPx,
            w: state.startPixelRect.w,
            h: state.startPixelRect.h,
          },
          metrics
        )

        let previewRect = normalizePaneRect(
          {
            ...gridCandidate,
            w: state.startRect.w,
            h: state.startRect.h,
          },
          {
            cols: metrics.cols,
            maxRows: metrics.maxRows,
            minW: state.minW,
            minH: state.minH,
          }
        )

        if (hasPaneCollision(visiblePanes, previewRect, state.paneId)) {
          const nearest = findNearestFreeRect(visiblePanes, previewRect, {
            cols: metrics.cols,
            maxRows: metrics.maxRows,
            minW: state.minW,
            minH: state.minH,
            ignorePaneId: state.paneId,
          })
          if (nearest) {
            previewRect = nearest
          } else {
            previewRect = lastValidPreviewRef.current ?? state.startRect
            snappedGuides = []
          }
        }

        lastValidPreviewRef.current = previewRect

        return {
          paneId: state.paneId,
          mode: state.mode,
          ghostRectPx,
          preview: {
            rect: previewRect,
            source: snappedGuides.length > 0 ? "guide" : "base",
            score: snappedGuides.length > 0 ? 0.5 : 1,
          },
          guides: snappedGuides,
          dock: null,
        }
      }

      const nextWidthPx = Math.max(minWidthPx, state.startPixelRect.w + dxPx)
      const nextHeightPx = Math.max(minHeightPx, state.startPixelRect.h + dyPx)
      const maxWidthPx = Math.max(minWidthPx, workspaceWidthPx - state.startPixelRect.x)
      const maxHeightPx = Math.max(minHeightPx, workspaceHeightPx - state.startPixelRect.y)

      const ghostRectPx = {
        ...state.startPixelRect,
        w: Math.min(maxWidthPx, nextWidthPx),
        h: Math.min(maxHeightPx, nextHeightPx),
      }

      const gridCandidate = pixelRectToGrid(ghostRectPx, metrics)
      const normalizedCandidate = normalizePaneRect(
        {
          ...gridCandidate,
          x: state.startRect.x,
          y: state.startRect.y,
        },
        {
          cols: metrics.cols,
          maxRows: metrics.maxRows,
          minW: state.minW,
          minH: state.minH,
        }
      )

      const resolved = fitRectAtOrigin(visiblePanes, normalizedCandidate, {
        cols: metrics.cols,
        maxRows: metrics.maxRows,
        minW: state.minW,
        minH: state.minH,
        ignorePaneId: state.paneId,
      })

      const previewRect = resolved ?? lastValidPreviewRef.current ?? state.startRect
      if (resolved) lastValidPreviewRef.current = resolved

      return {
        paneId: state.paneId,
        mode: state.mode,
        ghostRectPx,
        preview: {
          rect: previewRect,
          source: resolved ? "base" : "fallback",
          score: resolved ? 1 : 10,
        },
        guides: [],
        dock: null,
      }
    },
    [
      buildGuides,
      computeDockPreview,
      gridOffsetYPx,
      metrics,
      visiblePanes,
      workspaceHeightPx,
      workspaceWidthPx,
    ]
  )

  const scheduleFrame = useCallback(() => {
    if (rafRef.current !== null) return

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      const state = dragRef.current
      if (!state) return
      const next = computeDragRender(state, state.currentClientX, state.currentClientY)
      if (!next) return
      dragRenderRef.current = next
      setDragRenderState(next)
    })
  }, [computeDragRender])

  const stopInteraction = useCallback(
    (clientX: number, clientY: number, cancel = false) => {
      const state = dragRef.current
      if (!state) return

      const finalRender = computeDragRender(state, clientX, clientY) ?? dragRenderRef.current
      const finalRect = cancel ? state.startRect : finalRender?.preview.rect ?? state.startRect

      if (!cancel) {
        const persistedRect = metrics
          ? scaleRectToGrid(finalRect, metrics, storageGrid)
          : finalRect
        void onUpdateRect(state.paneId, persistedRect)
      }

      const handle = capturedHandleRef.current
      if (handle && handle.hasPointerCapture(state.pointerId)) {
        handle.releasePointerCapture(state.pointerId)
      }

      capturedHandleRef.current = null
      dragRef.current = null
      dragRenderRef.current = null
      lastValidPreviewRef.current = null
      setDragRenderState(null)

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    },
    [computeDragRender, metrics, onUpdateRect, storageGrid]
  )

  useEffect(() => {
    const onPointerMove = (eventMove: PointerEvent) => {
      const state = dragRef.current
      if (!state || eventMove.pointerId !== state.pointerId) return

      state.currentClientX = eventMove.clientX
      state.currentClientY = eventMove.clientY
      eventMove.preventDefault()
      scheduleFrame()
    }

    const onPointerUp = (eventUp: PointerEvent) => {
      const state = dragRef.current
      if (!state || eventUp.pointerId !== state.pointerId) return
      stopInteraction(eventUp.clientX, eventUp.clientY)
    }

    const onPointerCancel = (eventCancel: PointerEvent) => {
      const state = dragRef.current
      if (!state || eventCancel.pointerId !== state.pointerId) return
      stopInteraction(eventCancel.clientX, eventCancel.clientY, true)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerCancel)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerCancel)
    }
  }, [scheduleFrame, stopInteraction])

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      const active = dragRef.current
      const handle = capturedHandleRef.current
      if (active && handle && handle.hasPointerCapture(active.pointerId)) {
        handle.releasePointerCapture(active.pointerId)
      }
    },
    []
  )

  const startInteraction = useCallback(
    (
      eventPointer: ReactPointerEvent<HTMLElement>,
      paneId: string,
      mode: "move" | "resize"
    ) => {
      if (!metrics) return
      if (eventPointer.button !== 0) return

      eventPointer.preventDefault()
      eventPointer.stopPropagation()

      const visiblePane = visiblePaneById.get(paneId)
      const fallbackPane = panes.find((entry) => entry.id === paneId)
      const pane = visiblePane ?? fallbackPane
      if (!pane) return

      const entry = PANE_REGISTRY[pane.tool]
      const startRect = visiblePane
        ? visiblePane.rect
        : scaleRectToGrid(pane.rect, storageGrid, {
            cols: metrics.cols,
            maxRows: metrics.maxRows,
          })
      const startPixelRect = gridRectToPixels(startRect, metrics)

      try {
        eventPointer.currentTarget.setPointerCapture(eventPointer.pointerId)
        capturedHandleRef.current = eventPointer.currentTarget
      } catch {
        capturedHandleRef.current = null
      }

      const state: DragInteractionState = {
        paneId,
        mode,
        pointerId: eventPointer.pointerId,
        startClientX: eventPointer.clientX,
        startClientY: eventPointer.clientY,
        currentClientX: eventPointer.clientX,
        currentClientY: eventPointer.clientY,
        startRect,
        startPixelRect,
        minW: entry.minW,
        minH: entry.minH,
      }

      dragRef.current = state
      lastValidPreviewRef.current = startRect

      const initial = computeDragRender(state, eventPointer.clientX, eventPointer.clientY)
      if (initial) {
        dragRenderRef.current = initial
        setDragRenderState(initial)
      }
    },
    [computeDragRender, metrics, panes, storageGrid, visiblePaneById]
  )

  const previewPixelRect = useMemo(() => {
    if (!metrics || !dragRenderState) return null
    return gridRectToPixels(dragRenderState.preview.rect, metrics)
  }, [dragRenderState, metrics])

  if (visiblePanes.length === 0) return null
  if (autoHideDuringSolve && timingActive) return null
  if (!metrics || colWidth <= 0 || maxRows <= 0) return null

  return (
    <div
      className="pointer-events-none fixed right-2 bottom-0 z-30 hidden lg:block lg:left-[calc(14rem+0.5rem)] xl:left-[calc(16rem+0.5rem)]"
      style={{ top: `${Math.max(92, Math.round(topOffsetPx))}px` }}
    >
      <div ref={zoneRef} className="relative h-full w-full overflow-hidden">
        <div
          className="absolute inset-x-0"
          style={{
            top: `${Math.round(gridOffsetYPx)}px`,
            height: `${workspaceHeightPx}px`,
          }}
        >
          {previewPixelRect && (
            <div
              className="pointer-events-none absolute rounded-lg border-2 border-primary/80 bg-primary/15"
              style={{
                ...rectStyle(previewPixelRect),
                zIndex: 65,
              }}
            >
              {dragRenderState?.dock && (
                <span className="absolute left-2 top-2 rounded bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">
                  {dockLabel(dragRenderState.dock.zone)}
                </span>
              )}
            </div>
          )}

          {dragRenderState?.guides.map((guide, index) => {
            if (guide.axis === "x") {
              return (
                <div
                  key={`guide-x-${guide.positionPx}-${index}`}
                  className="pointer-events-none absolute w-px bg-primary/85"
                  style={{
                    left: `${guide.positionPx}px`,
                    top: 0,
                    height: `${workspaceHeightPx}px`,
                    zIndex: 70,
                  }}
                />
              )
            }

            return (
              <div
                key={`guide-y-${guide.positionPx}-${index}`}
                className="pointer-events-none absolute left-0 right-0 h-px bg-primary/85"
                style={{
                  top: `${guide.positionPx}px`,
                  zIndex: 70,
                }}
              />
            )
          })}

          {visiblePanes.map((pane) => {
            const entry = PANE_REGISTRY[pane.tool]
            const baseRectPx = gridRectToPixels(pane.rect, metrics)
            const isActive = dragRenderState?.paneId === pane.id
            const renderRectPx =
              isActive && dragRenderState ? dragRenderState.ghostRectPx : baseRectPx
            const showLabel =
              pane.tool !== "time_distribution" && pane.tool !== "time_trend"
            const activeHeavyGhost = isActive && isHeavyPane(pane.tool)

            return (
              <div
                key={pane.id}
                className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-lg border border-border/70 bg-background/95 shadow-2xl backdrop-blur"
                style={{
                  ...rectStyle(renderRectPx),
                  zIndex: isActive ? 80 : 40,
                  transition: isActive ? "none" : SETTLE_TRANSITION,
                  willChange: isActive ? "transform,width,height" : "auto",
                  opacity: dragRenderState && !isActive ? 0.94 : 1,
                }}
                onPointerDown={(eventPointer) => eventPointer.stopPropagation()}
              >
                <div
                  className="flex items-center justify-between gap-2 border-b border-border/70 px-2 py-1 cursor-move select-none"
                  style={{ touchAction: "none" }}
                  onPointerDown={(eventPointer) => startInteraction(eventPointer, pane.id, "move")}
                >
                  {showLabel ? (
                    <span className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
                      {entry.label}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-muted-foreground">::</span>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden p-2">
                  {activeHeavyGhost ? (
                    <div className="flex h-full items-center justify-center rounded-md border border-border/70 bg-muted/20 text-xs text-muted-foreground">
                      Moving {entry.label}
                    </div>
                  ) : (
                    <entry.Render
                      pane={pane}
                      context={context}
                      updatePaneOptions={onUpdatePaneOptions}
                    />
                  )}
                </div>

                <div
                  className="absolute right-1 bottom-1 h-4 w-4 cursor-se-resize rounded-sm border border-border/80 bg-secondary/80"
                  style={{ touchAction: "none" }}
                  onPointerDown={(eventPointer) =>
                    startInteraction(eventPointer, pane.id, "resize")
                  }
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
