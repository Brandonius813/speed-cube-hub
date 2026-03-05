import type { TimerPaneInstance, TimerPaneRect } from "@/components/timer/panes/types"

export type DesktopGridMetrics = {
  cols: number
  maxRows: number
  colWidth: number
  rowHeight: number
  gap: number
}

export type PixelPaneRect = {
  x: number
  y: number
  w: number
  h: number
}

export type AxisGuideLine = {
  positionPx: number
  source: "workspace" | "pane"
  kind: "edge" | "center"
}

const BIG_SCORE = Number.MAX_SAFE_INTEGER

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizePaneRect(
  rect: TimerPaneRect,
  options: {
    cols: number
    maxRows: number
    minW?: number
    minH?: number
  }
): TimerPaneRect {
  const minW = Math.max(1, Math.round(options.minW ?? 1))
  const minH = Math.max(1, Math.round(options.minH ?? 1))
  const cols = Math.max(1, Math.round(options.cols))
  const maxRows = Math.max(1, Math.round(options.maxRows))

  const w = clamp(Math.round(rect.w), minW, cols)
  const h = clamp(Math.round(rect.h), minH, maxRows)
  const x = clamp(Math.round(rect.x), 0, cols - w)
  const y = clamp(Math.round(rect.y), 0, maxRows - h)
  return { x, y, w, h }
}

export function rectsOverlap(a: TimerPaneRect, b: TimerPaneRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function hasPaneCollision(
  panes: TimerPaneInstance[],
  rect: TimerPaneRect,
  ignorePaneId?: string
): boolean {
  return panes.some((pane) => {
    if (ignorePaneId && pane.id === ignorePaneId) return false
    return rectsOverlap(pane.rect, rect)
  })
}

export function gridRectToPixels(rect: TimerPaneRect, metrics: DesktopGridMetrics): PixelPaneRect {
  const unitX = metrics.colWidth + metrics.gap
  const unitY = metrics.rowHeight + metrics.gap
  return {
    x: rect.x * unitX,
    y: rect.y * unitY,
    w: rect.w * unitX - metrics.gap,
    h: rect.h * unitY - metrics.gap,
  }
}

export function pixelRectToGrid(rect: PixelPaneRect, metrics: DesktopGridMetrics): TimerPaneRect {
  const unitX = Math.max(1, metrics.colWidth + metrics.gap)
  const unitY = Math.max(1, metrics.rowHeight + metrics.gap)
  return {
    x: rect.x / unitX,
    y: rect.y / unitY,
    w: (rect.w + metrics.gap) / unitX,
    h: (rect.h + metrics.gap) / unitY,
  }
}

export function clampPixelRectToZone(
  rect: PixelPaneRect,
  zoneWidth: number,
  zoneHeight: number
): PixelPaneRect {
  return {
    x: clamp(rect.x, 0, Math.max(0, zoneWidth - rect.w)),
    y: clamp(rect.y, 0, Math.max(0, zoneHeight - rect.h)),
    w: clamp(rect.w, 1, Math.max(1, zoneWidth)),
    h: clamp(rect.h, 1, Math.max(1, zoneHeight)),
  }
}

export function nearestGuideDistance(
  anchorPx: number,
  guides: AxisGuideLine[]
): { guide: AxisGuideLine; distancePx: number; deltaPx: number } | null {
  let best: { guide: AxisGuideLine; distancePx: number; deltaPx: number } | null = null
  for (const guide of guides) {
    const deltaPx = guide.positionPx - anchorPx
    const distancePx = Math.abs(deltaPx)
    if (!best || distancePx < best.distancePx) {
      best = { guide, distancePx, deltaPx }
    }
  }
  return best
}

export function findNearestFreeRect(
  panes: TimerPaneInstance[],
  rect: TimerPaneRect,
  options: {
    cols: number
    maxRows: number
    minW?: number
    minH?: number
    ignorePaneId?: string
  }
): TimerPaneRect | null {
  const normalized = normalizePaneRect(rect, options)
  if (!hasPaneCollision(panes, normalized, options.ignorePaneId)) {
    return normalized
  }

  let best: { score: number; rect: TimerPaneRect } | null = null
  const maxX = options.cols - normalized.w
  const maxY = options.maxRows - normalized.h
  const originCx = normalized.x + normalized.w / 2
  const originCy = normalized.y + normalized.h / 2

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const candidate = normalizePaneRect(
        {
          ...normalized,
          x,
          y,
        },
        options
      )
      if (hasPaneCollision(panes, candidate, options.ignorePaneId)) continue

      const candidateCx = candidate.x + candidate.w / 2
      const candidateCy = candidate.y + candidate.h / 2
      const score =
        Math.abs(candidateCx - originCx) * 10 +
        Math.abs(candidateCy - originCy) * 10 +
        Math.abs(candidate.x - normalized.x) +
        Math.abs(candidate.y - normalized.y)

      if (!best || score < best.score) {
        best = { score, rect: candidate }
      }
    }
  }

  return best?.rect ?? null
}

export function fitRectAtOrigin(
  panes: TimerPaneInstance[],
  rect: TimerPaneRect,
  options: {
    cols: number
    maxRows: number
    minW?: number
    minH?: number
    ignorePaneId?: string
  }
): TimerPaneRect | null {
  const normalized = normalizePaneRect(rect, options)
  if (!hasPaneCollision(panes, normalized, options.ignorePaneId)) {
    return normalized
  }

  let best: { score: number; rect: TimerPaneRect } = { score: BIG_SCORE, rect: normalized }

  for (let h = normalized.h; h >= Math.max(1, options.minH ?? 1); h--) {
    for (let w = normalized.w; w >= Math.max(1, options.minW ?? 1); w--) {
      const candidate = normalizePaneRect(
        {
          ...normalized,
          w,
          h,
        },
        options
      )
      if (hasPaneCollision(panes, candidate, options.ignorePaneId)) continue

      const score = (normalized.w - candidate.w) * 100 + (normalized.h - candidate.h)
      if (score < best.score) {
        best = { score, rect: candidate }
      }
    }
  }

  return best.score === BIG_SCORE ? null : best.rect
}
