"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getTimerPaneLayout, upsertTimerPaneLayout } from "@/lib/actions/timer-layout"
import { timerPaneLayoutSchema } from "@/lib/validations"
import {
  DEFAULT_TIMER_PANE_LAYOUT,
  TIMER_PANE_MAX,
  type DesktopPaneSize,
  type PaneToolId,
  type TimerPaneInstance,
  type TimerPaneLayoutV1,
  type TimerPaneRect,
} from "@/components/timer/panes/types"
import { PANE_REGISTRY } from "@/components/timer/panes/pane-registry"
import {
  findNearestFreeRect,
  hasPaneCollision,
  normalizePaneRect,
} from "@/components/timer/panes/desktop-pane-geometry"

const LOCAL_STORAGE_KEY = "timer-pane-layout-v1"
const SAVE_DEBOUNCE_MS = 800
const TARGET_DESKTOP_COLS = DEFAULT_TIMER_PANE_LAYOUT.desktop.cols

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

function bottomAnchoredY(heightUnits: number): number {
  const visibleRows = getDesktopMaxRows()
  return Math.max(0, visibleRows - Math.max(1, Math.round(heightUnits)))
}

function defaultToolRect(tool: PaneToolId): TimerPaneRect {
  const base = PANE_REGISTRY[tool].defaultRect
  return normalizeRect({
    ...base,
    y: bottomAnchoredY(base.h),
  })
}

function normalizeLayout(layout: TimerPaneLayoutV1): TimerPaneLayoutV1 {
  const sourceCols = layout.desktop.cols
  const colScale = sourceCols > 0 ? TARGET_DESKTOP_COLS / sourceCols : 1
  let normalizedPanes = layout.desktop.panes
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

  // Legacy migration: early pane builds defaulted every pane to y=0, which is not usable.
  // If all panes are still parked at the top row, remap them to the new bottom defaults.
  if (normalizedPanes.length > 0 && normalizedPanes.every((pane) => pane.rect.y === 0)) {
    const migrated: TimerPaneInstance[] = []
    for (const pane of normalizedPanes) {
      migrated.push({
        ...pane,
        rect: findFreeRect(defaultToolRect(pane.tool), migrated),
      })
    }
    normalizedPanes = migrated
  }

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

function findFreeRect(baseRect: TimerPaneRect, panes: TimerPaneInstance[]): TimerPaneRect {
  const maxRows = getDesktopMaxRows()
  const resolved = findNearestFreeRect(panes, normalizeRect(baseRect), {
    cols: TARGET_DESKTOP_COLS,
    maxRows,
  })
  if (resolved) return resolved
  return normalizeRect({
    ...baseRect,
    y: Math.max(...panes.map((pane) => pane.rect.y + pane.rect.h), 0),
  })
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

      const pane: TimerPaneInstance = {
        id: crypto.randomUUID(),
        tool,
        rect: findFreeRect(defaultToolRect(tool), previous.desktop.panes),
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

  const togglePaneTool = useCallback(
    (tool: PaneToolId) => {
      const existing = panes.find((pane) => pane.tool === tool)
      if (existing) {
        removePane(existing.id)
        return
      }
      addPane(tool)
    },
    [addPane, panes, removePane]
  )

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

      const nextPanes = previous.desktop.panes.map((pane) => {
        if (pane.id !== paneId) return pane
        return {
          ...pane,
          tool,
          rect: withFixedToolSize(tool, pane.rect),
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
