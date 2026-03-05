import type { TimerSolve } from "@/lib/timer/stats"

export type SessionGroupMeta = {
  id: string
  title: string
  savedAt: number
  solveCount: number
  // Optional feed-style summary stats for divider popups.
  durationMinutes?: number
  numDnf?: number
  avgSeconds?: number | null
  bestSeconds?: number | null
  practiceType?: string
}

export type DividerLabel = {
  title: string
  date: string | null
  stats: DividerStats
  practiceType: string | null
}

export type DividerStats = {
  solveCount: number
  dnfCount: number
  durationMinutes: number | null
  avgSeconds: number | null
  bestSeconds: number | null
}

export type SessionDividers = {
  boundaries: Set<number>
  labels: Map<number, DividerLabel>
}

function normalizeTitle(
  title: string | undefined,
  fallback = "Saved Session"
): string {
  const trimmed = title?.trim()
  return trimmed ? trimmed : fallback
}

function parseDateGroup(groupId: string): string | null {
  if (!groupId.startsWith("date:")) return null
  const day = groupId.slice(5)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  // Noon UTC avoids day drift when formatting in Pacific Time.
  return formatSessionDividerDate(new Date(`${day}T12:00:00.000Z`))
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
  const statsByGroup = new Map<string, DividerStats>()
  const solvesByGroup = new Map<string, TimerSolve[]>()

  for (const solve of solves) {
    const groupId = solve.group ?? null
    if (!groupId) continue
    const bucket = solvesByGroup.get(groupId)
    if (bucket) {
      bucket.push(solve)
    } else {
      solvesByGroup.set(groupId, [solve])
    }
  }

  for (const [groupId, groupSolves] of solvesByGroup) {
    const nonDnf = groupSolves.filter((solve) => solve.penalty !== "DNF")
    const effectiveTimes = nonDnf.map((solve) =>
      solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
    )
    const effectiveTotalMs = effectiveTimes.reduce((sum, time) => sum + time, 0)
    const avgMs =
      effectiveTimes.length > 0
        ? Math.round(effectiveTotalMs / effectiveTimes.length)
        : null
    const bestMs = effectiveTimes.length > 0 ? Math.min(...effectiveTimes) : null
    const meta = groupById.get(groupId)
    const derivedDurationMinutes =
      effectiveTimes.length > 0
        ? Math.max(1, Math.round(effectiveTotalMs / 1000 / 60))
        : null

    statsByGroup.set(groupId, {
      solveCount: groupSolves.length,
      dnfCount: groupSolves.length - nonDnf.length,
      durationMinutes:
        typeof meta?.durationMinutes === "number"
          ? Math.max(1, Math.round(meta.durationMinutes))
          : derivedDurationMinutes,
      avgSeconds:
        typeof meta?.avgSeconds === "number"
          ? meta.avgSeconds
          : avgMs !== null
            ? Math.round(avgMs / 10) / 100
            : null,
      bestSeconds:
        typeof meta?.bestSeconds === "number"
          ? meta.bestSeconds
          : bestMs !== null
            ? Math.round(bestMs / 10) / 100
            : null,
    })
  }

  for (let i = solves.length - 2; i >= 0; i--) {
    const displayIdx = solves.length - 1 - i
    const currentGroup = solves[i].group ?? null
    const nextGroup = solves[i + 1].group ?? null

    if (currentGroup === nextGroup) continue

    boundaries.add(displayIdx)

    if (!currentGroup) continue
    const meta = groupById.get(currentGroup)
    const dateFromGroup = parseDateGroup(currentGroup)
    labels.set(displayIdx, {
      title: normalizeTitle(meta?.title, dateFromGroup ? "Session" : "Saved Session"),
      date:
        typeof meta?.savedAt === "number"
          ? formatSessionDividerDate(meta.savedAt)
          : dateFromGroup,
      stats: statsByGroup.get(currentGroup) ?? {
        solveCount: 0,
        dnfCount: 0,
        durationMinutes: null,
        avgSeconds: null,
        bestSeconds: null,
      },
      practiceType: meta?.practiceType ?? null,
    })
  }

  return { boundaries, labels }
}
