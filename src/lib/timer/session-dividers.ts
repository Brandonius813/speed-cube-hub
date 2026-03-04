import type { TimerSolve } from "@/lib/timer/stats"

export type SessionGroupMeta = {
  id: string
  title: string
  savedAt: number
  solveCount: number
}

export type DividerLabel = {
  title: string
  date: string | null
}

export type SessionDividers = {
  boundaries: Set<number>
  labels: Map<number, DividerLabel>
}

function normalizeTitle(title: string | undefined): string {
  const trimmed = title?.trim()
  return trimmed ? trimmed : "Saved Session"
}

export function formatSessionDividerDate(value: number | Date): string | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Builds divider indices (for boundary lines) and labels (for inline headers)
 * based on solve-group transitions in a reversed virtualized list.
 */
export function computeSessionDividers(
  solves: TimerSolve[],
  sessionGroups: SessionGroupMeta[]
): SessionDividers {
  const boundaries = new Set<number>()
  const labels = new Map<number, DividerLabel>()
  const groupById = new Map(sessionGroups.map((group) => [group.id, group]))

  for (let i = solves.length - 2; i >= 0; i--) {
    const displayIdx = solves.length - 1 - i
    const currentGroup = solves[i].group ?? null
    const nextGroup = solves[i + 1].group ?? null

    if (currentGroup === nextGroup) continue

    boundaries.add(displayIdx)

    if (!currentGroup) continue
    const meta = groupById.get(currentGroup)
    labels.set(displayIdx, {
      title: normalizeTitle(meta?.title),
      date:
        typeof meta?.savedAt === "number"
          ? formatSessionDividerDate(meta.savedAt)
          : null,
    })
  }

  return { boundaries, labels }
}
