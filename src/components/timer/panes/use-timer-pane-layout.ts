"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getTimerPaneLayout, upsertTimerPaneLayout } from "@/lib/actions/timer-layout"
import { timerPaneLayoutSchema } from "@/lib/validations"
import {
  DESKTOP_PANE_SLOTS,
  DEFAULT_TIMER_PANE_LAYOUT,
  TIMER_PANE_MAX,
  type LegacyDesktopPaneSlot,
  type DesktopPaneSize,
  type DesktopPaneSlot,
  type PaneToolId,
  type TimerPaneInstance,
  type TimerPaneLayoutV1,
  type TimerPaneRect,
} from "@/components/timer/panes/types"
import { PANE_REGISTRY } from "@/components/timer/panes/pane-registry"
import {
  hasPaneCollision,
  normalizePaneRect,
} from "@/components/timer/panes/desktop-pane-geometry"

const LOCAL_STORAGE_KEY = "timer-pane-layout-v1"
const SAVE_DEBOUNCE_MS = 800
const TARGET_DESKTOP_COLS = DEFAULT_TIMER_PANE_LAYOUT.desktop.cols

function isDesktopPaneSlot(value: string | undefined): value is DesktopPaneSlot {
  return (
    value === "top_right" ||
    value === "bottom_right" ||
    value === "bottom_middle" ||
    value === "bottom_left"
  )
}

function isLegacyDesktopPaneSlot(
  value: string | undefined
): value is LegacyDesktopPaneSlot {
  return value === "top" || value === "left" || value === "right" || value === "bottom"
}

function mapLegacySlot(slot: LegacyDesktopPaneSlot): DesktopPaneSlot {
  if (slot === "top") return "top_right"
  if (slot === "left") return "bottom_left"
  if (slot === "right") return "bottom_right"
  return "bottom_middle"
}

function firstFreeSlot(usedSlots: Set<DesktopPaneSlot>): DesktopPaneSlot | null {
  for (const slot of DESKTOP_PANE_SLOTS) {
    if (!usedSlots.has(slot)) return slot
  }
  return null
}

function getDesktopMaxRows(): number {
  if (typeof window === "undefined") return 18
  const rowUnit = DEFAULT_TIMER_PANE_LAYOUT.desktop.rowHeight + DEFAULT_TIMER_PANE_LAYOUT.desktop.gap
  const availableHeight = Math.max(240, window.innerHeight - 104)
  return Math.max(1, Math.floor((availableHeight + DEFAULT_TIMER_PANE_LAYOUT.desktop.gap) / rowUnit))
}

function cloneDefaultLayout(): TimerPaneLayoutV1 {
  return {
    ...DEFAULT_TIMER_PANE_LAYOUT,
    desktop: {
      ...DEFAULT_TIMER_PANE_LAYOUT.desktop,
      panes: [],
    },
    mobile: {
      order: [],
      heights: {},
    },
  }
}

function normalizeRect(rect: TimerPaneRect): TimerPaneRect {
  return normalizePaneRect(rect, {
    cols: TARGET_DESKTOP_COLS,
    maxRows: getDesktopMaxRows(),
  })
}

function withFixedToolSize(tool: PaneToolId, rect: TimerPaneRect): TimerPaneRect {
  const { w, h } = PANE_REGISTRY[tool].defaultRect
  return normalizeRect({
    ...rect,
    w,
    h,
  })
}

function inferSlotFromRect(rect: TimerPaneRect): DesktopPaneSlot {
  const maxRows = getDesktopMaxRows()
  const centerX = rect.x + rect.w / 2
  const centerY = rect.y + rect.h / 2
  const xRatio = centerX / Math.max(1, TARGET_DESKTOP_COLS)
  const yRatio = centerY / Math.max(1, maxRows)

  if (yRatio <= 0.44) return "top_right"
  if (xRatio < 0.33) return "bottom_left"
  if (xRatio > 0.67) return "bottom_right"
  return "bottom_middle"
}

function rectForSlot(tool: PaneToolId, slot: DesktopPaneSlot): TimerPaneRect {
  const base = withFixedToolSize(tool, PANE_REGISTRY[tool].defaultRect)
  const maxRows = getDesktopMaxRows()
  const middleX = Math.max(0, Math.round((TARGET_DESKTOP_COLS - base.w) / 2))
  const bottomY = Math.max(0, maxRows - base.h)
  const rightX = Math.max(0, TARGET_DESKTOP_COLS - base.w)

  if (slot === "top_right") return normalizeRect({ ...base, x: rightX, y: 0 })
  if (slot === "bottom_right") return normalizeRect({ ...base, x: rightX, y: bottomY })
  if (slot === "bottom_middle") return normalizeRect({ ...base, x: middleX, y: bottomY })
  return normalizeRect({ ...base, x: 0, y: bottomY })
}

function resolveSlot(
  pane: TimerPaneInstance,
  usedSlots: Set<DesktopPaneSlot>
): DesktopPaneSlot {
  let requested: DesktopPaneSlot
  if (isDesktopPaneSlot(pane.slot)) {
    requested = pane.slot
  } else if (isLegacyDesktopPaneSlot(pane.slot)) {
    requested = mapLegacySlot(pane.slot)
  } else {
    requested = inferSlotFromRect(pane.rect)
  }
  if (!usedSlots.has(requested)) return requested
  return firstFreeSlot(usedSlots) ?? requested
}

function getUsedSlots(panes: TimerPaneInstance[]): Set<DesktopPaneSlot> {
  const used = new Set<DesktopPaneSlot>()
  for (const pane of panes) {
    if (isDesktopPaneSlot(pane.slot)) {
      used.add(pane.slot)
    }
  }
  return used
}

function normalizeLayout(layout: TimerPaneLayoutV1): TimerPaneLayoutV1 {
  const sourceCols = layout.desktop.cols
  const colScale = sourceCols > 0 ? TARGET_DESKTOP_COLS / sourceCols : 1
  const normalizedPanesBase = layout.desktop.panes
    .filter((pane) => pane.tool !== "scramble_text")
    .slice(0, TIMER_PANE_MAX)
    .map((pane) => {
      const scaledRect = colScale === 1
        ? pane.rect
        : {
            ...pane.rect,
            x: pane.rect.x * colScale,
          }
      return {
        ...pane,
        rect: withFixedToolSize(pane.tool, scaledRect),
      }
    })
  const usedSlots = new Set<DesktopPaneSlot>()
  const normalizedPanes = normalizedPanesBase.map((pane) => {
    const slot = resolveSlot(pane, usedSlots)
    usedSlots.add(slot)
    return {
      ...pane,
      slot,
      rect: rectForSlot(pane.tool, slot),
    }
  })

  const paneIds = new Set(normalizedPanes.map((pane) => pane.id))
  const order = layout.mobile.order.filter((id) => paneIds.has(id))
  for (const pane of normalizedPanes) {
    if (!order.includes(pane.id)) order.push(pane.id)
  }

  const heights: Record<string, "sm" | "md" | "lg"> = {}
  for (const paneId of order) {
    heights[paneId] = layout.mobile.heights[paneId] ?? "md"
  }

  return {
    ...layout,
    desktop: {
      cols: TARGET_DESKTOP_COLS,
      rowHeight: DEFAULT_TIMER_PANE_LAYOUT.desktop.rowHeight,
      gap: DEFAULT_TIMER_PANE_LAYOUT.desktop.gap,
      size: layout.desktop.size ?? "md",
      panes: normalizedPanes,
    },
    mobile: {
      order,
      heights,
    },
  }
}

function readLocalLayout(): TimerPaneLayoutV1 | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    const parsed = timerPaneLayoutSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    return normalizeLayout(parsed.data)
  } catch {
    return null
  }
}

function writeLocalLayout(layout: TimerPaneLayoutV1): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout))
  } catch {}
}

function hasCollision(
  panes: TimerPaneInstance[],
  rect: TimerPaneRect,
  ignorePaneId?: string
): boolean {
  return hasPaneCollision(panes, rect, ignorePaneId)
}

function withUpdatedAt(layout: TimerPaneLayoutV1): TimerPaneLayoutV1 {
  return {
    ...layout,
    updatedAtMs: Date.now(),
  }
}

export function useTimerPaneLayout(layoutKey = "main") {
  const [layout, setLayout] = useState<TimerPaneLayoutV1>(() => {
    if (typeof window === "undefined") return cloneDefaultLayout()
    return readLocalLayout() ?? cloneDefaultLayout()
  })
  const [syncReady, setSyncReady] = useState(false)
  const saveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const local = readLocalLayout()

    getTimerPaneLayout(layoutKey)
      .then((result) => {
        if (cancelled || !result.data) return
        const serverLayout = normalizeLayout(result.data)
        const localLayout = local ?? readLocalLayout()
        const chosen =
          localLayout && localLayout.updatedAtMs > serverLayout.updatedAtMs
            ? localLayout
            : serverLayout
        setLayout(chosen)
        writeLocalLayout(chosen)
      })
      .finally(() => {
        if (!cancelled) setSyncReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [layoutKey])

  useEffect(() => {
    writeLocalLayout(layout)
  }, [layout])

  useEffect(() => {
    if (!syncReady) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      void upsertTimerPaneLayout(layout, layoutKey)
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [layout, layoutKey, syncReady])

  const panes = layout.desktop.panes

  const addPane = useCallback((tool: PaneToolId) => {
    setLayout((previous) => {
      if (previous.desktop.panes.length >= TIMER_PANE_MAX) return previous
      if (previous.desktop.panes.some((pane) => pane.tool === tool)) return previous

      const usedSlots = getUsedSlots(previous.desktop.panes)
      const preferredSlot = PANE_REGISTRY[tool].defaultSlot
      const slot = usedSlots.has(preferredSlot)
        ? firstFreeSlot(usedSlots) ?? preferredSlot
        : preferredSlot

      const pane: TimerPaneInstance = {
        id: crypto.randomUUID(),
        tool,
        slot,
        rect: rectForSlot(tool, slot),
        options:
          tool === "time_distribution" || tool === "time_trend"
            ? { scope: "session" }
            : undefined,
      }

      const next = withUpdatedAt({
        ...previous,
        desktop: {
          ...previous.desktop,
          panes: [...previous.desktop.panes, pane],
        },
        mobile: {
          ...previous.mobile,
          order: [...previous.mobile.order, pane.id],
          heights: {
            ...previous.mobile.heights,
            [pane.id]: previous.mobile.heights[pane.id] ?? "md",
          },
        },
      })

      return normalizeLayout(next)
    })
  }, [])

  const removePane = useCallback((paneId: string) => {
    setLayout((previous) => {
      const next = withUpdatedAt({
        ...previous,
        desktop: {
          ...previous.desktop,
          panes: previous.desktop.panes.filter((pane) => pane.id !== paneId),
        },
        mobile: {
          order: previous.mobile.order.filter((id) => id !== paneId),
          heights: Object.fromEntries(
            Object.entries(previous.mobile.heights).filter(([id]) => id !== paneId)
          ),
        },
      })

      return normalizeLayout(next)
    })
  }, [])

  const togglePaneTool = useCallback((tool: PaneToolId) => {
    setLayout((previous) => {
      const existing = previous.desktop.panes.find((pane) => pane.tool === tool)
      if (existing) {
        const next = withUpdatedAt({
          ...previous,
          desktop: {
            ...previous.desktop,
            panes: previous.desktop.panes.filter((pane) => pane.id !== existing.id),
          },
          mobile: {
            order: previous.mobile.order.filter((id) => id !== existing.id),
            heights: Object.fromEntries(
              Object.entries(previous.mobile.heights).filter(([id]) => id !== existing.id)
            ),
          },
        })

        return normalizeLayout(next)
      }

      if (previous.desktop.panes.length >= TIMER_PANE_MAX) return previous

      const usedSlots = getUsedSlots(previous.desktop.panes)
      const preferredSlot = PANE_REGISTRY[tool].defaultSlot
      const slot = usedSlots.has(preferredSlot)
        ? firstFreeSlot(usedSlots) ?? preferredSlot
        : preferredSlot

      const pane: TimerPaneInstance = {
        id: crypto.randomUUID(),
        tool,
        slot,
        rect: rectForSlot(tool, slot),
        options:
          tool === "time_distribution" || tool === "time_trend"
            ? { scope: "session" }
            : undefined,
      }

      const next = withUpdatedAt({
        ...previous,
        desktop: {
          ...previous.desktop,
          panes: [...previous.desktop.panes, pane],
        },
        mobile: {
          ...previous.mobile,
          order: [...previous.mobile.order, pane.id],
          heights: {
            ...previous.mobile.heights,
            [pane.id]: previous.mobile.heights[pane.id] ?? "md",
          },
        },
      })

      return normalizeLayout(next)
    })
  }, [])

  const setPaneSlot = useCallback((paneId: string, slot: DesktopPaneSlot) => {
    setLayout((previous) => {
      const currentPane = previous.desktop.panes.find((pane) => pane.id === paneId)
      if (!currentPane) return previous

      const currentSlot = isDesktopPaneSlot(currentPane.slot)
        ? currentPane.slot
        : inferSlotFromRect(currentPane.rect)
      if (currentSlot === slot) return previous

      const occupant = previous.desktop.panes.find(
        (pane) => pane.id !== paneId && pane.slot === slot
      )

      const nextPanes = previous.desktop.panes.map((pane) => {
        if (pane.id === paneId) {
          return {
            ...pane,
            slot,
            rect: rectForSlot(pane.tool, slot),
          }
        }
        if (occupant && pane.id === occupant.id) {
          return {
            ...pane,
            slot: currentSlot,
            rect: rectForSlot(pane.tool, currentSlot),
          }
        }
        return pane
      })

      return withUpdatedAt({
        ...previous,
        desktop: {
          ...previous.desktop,
          panes: nextPanes,
        },
      })
    })
  }, [])

  const updatePaneRect = useCallback((paneId: string, rect: TimerPaneRect): boolean => {
    let updated = false
    setLayout((previous) => {
      const currentPane = previous.desktop.panes.find((pane) => pane.id === paneId)
      if (!currentPane) return previous
      const normalized = withFixedToolSize(currentPane.tool, rect)
      if (hasCollision(previous.desktop.panes, normalized, paneId)) return previous

      const nextPanes = previous.desktop.panes.map((pane) => {
        if (pane.id !== paneId) return pane
        updated = true
        return { ...pane, rect: normalized }
      })
      if (!updated) return previous

      return withUpdatedAt({
        ...previous,
        desktop: {
          ...previous.desktop,
          panes: nextPanes,
        },
      })
    })
    return updated
  }, [])

  const changePaneTool = useCallback((paneId: string, tool: PaneToolId) => {
    setLayout((previous) => {
      const existing = previous.desktop.panes.find((pane) => pane.tool === tool)
      if (existing && existing.id !== paneId) return previous

      const usedSlots = getUsedSlots(previous.desktop.panes.filter((pane) => pane.id !== paneId))
      const nextPanes = previous.desktop.panes.map((pane) => {
        if (pane.id !== paneId) return pane
        const preferredSlot = isDesktopPaneSlot(pane.slot)
          ? pane.slot
          : PANE_REGISTRY[tool].defaultSlot
        const nextSlot = usedSlots.has(preferredSlot)
          ? firstFreeSlot(usedSlots) ?? preferredSlot
          : preferredSlot
        return {
          ...pane,
          tool,
          slot: nextSlot,
          rect: rectForSlot(tool, nextSlot),
          options:
            tool === "time_distribution" || tool === "time_trend"
              ? { scope: pane.options?.scope ?? "session" }
              : undefined,
        }
      })

      return withUpdatedAt({
        ...previous,
        desktop: {
          ...previous.desktop,
          panes: nextPanes,
        },
      })
    })
  }, [])

  const updatePaneOptions = useCallback(
    (paneId: string, options: TimerPaneInstance["options"]) => {
      setLayout((previous) => {
        const nextPanes = previous.desktop.panes.map((pane) =>
          pane.id === paneId ? { ...pane, options } : pane
        )

        return withUpdatedAt({
          ...previous,
          desktop: {
            ...previous.desktop,
            panes: nextPanes,
          },
        })
      })
    },
    []
  )

  const resetLayout = useCallback(() => {
    setLayout(withUpdatedAt(cloneDefaultLayout()))
  }, [])

  const setAutoHideDuringSolve = useCallback((value: boolean) => {
    setLayout((previous) =>
      withUpdatedAt({
        ...previous,
        autoHideDuringSolve: value,
      })
    )
  }, [])

  const setDesktopPaneSize = useCallback((size: DesktopPaneSize) => {
    setLayout((previous) =>
      withUpdatedAt({
        ...previous,
        desktop: {
          ...previous.desktop,
          size,
        },
      })
    )
  }, [])

  const moveMobilePane = useCallback((paneId: string, direction: "up" | "down") => {
    setLayout((previous) => {
      const order = [...previous.mobile.order]
      const idx = order.indexOf(paneId)
      if (idx === -1) return previous
      if (direction === "up" && idx === 0) return previous
      if (direction === "down" && idx === order.length - 1) return previous

      const swapWith = direction === "up" ? idx - 1 : idx + 1
      ;[order[idx], order[swapWith]] = [order[swapWith], order[idx]]

      return withUpdatedAt({
        ...previous,
        mobile: {
          ...previous.mobile,
          order,
        },
      })
    })
  }, [])

  const setMobilePaneHeight = useCallback((paneId: string, height: "sm" | "md" | "lg") => {
    setLayout((previous) =>
      withUpdatedAt({
        ...previous,
        mobile: {
          ...previous.mobile,
          heights: {
            ...previous.mobile.heights,
            [paneId]: height,
          },
        },
      })
    )
  }, [])

  const paneByTool = useMemo(() => {
    const map = new Map<PaneToolId, TimerPaneInstance>()
    for (const pane of panes) {
      map.set(pane.tool, pane)
    }
    return map
  }, [panes])

  return {
    layout,
    panes,
    paneByTool,
    addPane,
    removePane,
    togglePaneTool,
    setPaneSlot,
    updatePaneRect,
    changePaneTool,
    updatePaneOptions,
    resetLayout,
    setAutoHideDuringSolve,
    setDesktopPaneSize,
    moveMobilePane,
    setMobilePaneHeight,
  }
}
