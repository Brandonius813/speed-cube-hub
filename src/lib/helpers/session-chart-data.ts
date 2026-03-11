import { ALL_TIMER_EVENTS, EVENT_COLORS, getEventLabel } from "../constants"
import type { Session } from "../types"

export type SessionChartGroupMode = "daily" | "weekly" | "monthly"
export type SessionChartWeekStart = 0 | 1
export type SessionChartValueMode = "solves" | "duration"

export type SessionChartSeries = {
  eventId: string
  label: string
  color: string
}

export type SessionChartRow = {
  label: string
} & Record<string, number | string>

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const UNKNOWN_EVENT_COLOR = "#94A3B8"
const KNOWN_EVENT_ORDER = new Map<string, number>(
  ALL_TIMER_EVENTS.map((event, index) => [event.id, index] as [string, number]),
)

function getGroupStartDate(dateStr: string, mode: SessionChartGroupMode, weekStart: SessionChartWeekStart) {
  const date = new Date(dateStr + "T00:00:00")
  if (mode === "daily") {
    return date
  }
  if (mode === "weekly") {
    const start = new Date(date)
    const day = start.getDay()
    const diff = weekStart === 1 ? (day === 0 ? -6 : 1 - day) : -day
    start.setDate(start.getDate() + diff)
    return start
  }
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getGroupLabel(dateStr: string, mode: SessionChartGroupMode, weekStart: SessionChartWeekStart) {
  const startDate = getGroupStartDate(dateStr, mode, weekStart)

  if (mode === "daily") {
    return `${startDate.getMonth() + 1}/${startDate.getDate()} ${DAY_NAMES[startDate.getDay()]}`
  }
  if (mode === "weekly") {
    return `${startDate.getMonth() + 1}/${startDate.getDate()}`
  }

  return `${MONTH_NAMES[startDate.getMonth()]} ${startDate.getFullYear().toString().slice(-2)}`
}

function getGroupSortKey(dateStr: string, mode: SessionChartGroupMode, weekStart: SessionChartWeekStart) {
  return getGroupStartDate(dateStr, mode, weekStart).getTime()
}

export function getAutoSessionChartGroupMode(sessions: Session[]): SessionChartGroupMode {
  if (sessions.length === 0) return "daily"

  const dates = sessions.map((session) => new Date(session.session_date + "T00:00:00").getTime())
  const span = Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1

  if (span <= 31) return "daily"
  if (span <= 90) return "weekly"
  return "monthly"
}

export function getSessionChartSeriesMeta(eventId: string): SessionChartSeries {
  return {
    eventId,
    label: getEventLabel(eventId),
    color: EVENT_COLORS[eventId] ?? UNKNOWN_EVENT_COLOR,
  }
}

export function buildSessionChartData({
  sessions,
  groupMode,
  valueMode,
  weekStart = 0,
}: {
  sessions: Session[]
  groupMode: SessionChartGroupMode
  valueMode: SessionChartValueMode
  weekStart?: SessionChartWeekStart
}) {
  const groupedValues: Record<string, Record<string, number>> = {}
  const sortKeys: Record<string, number> = {}
  const eventTotals: Record<string, number> = {}

  for (const session of sessions) {
    const value =
      valueMode === "solves"
        ? (session.num_solves ?? 0)
        : session.duration_minutes
    const solveCount = session.num_solves ?? 0
    const groupLabel = getGroupLabel(session.session_date, groupMode, weekStart)

    if (!groupedValues[groupLabel]) {
      groupedValues[groupLabel] = {}
      sortKeys[groupLabel] = getGroupSortKey(session.session_date, groupMode, weekStart)
    }

    if (value > 0) {
      groupedValues[groupLabel][session.event] =
        (groupedValues[groupLabel][session.event] || 0) + value
      eventTotals[session.event] = (eventTotals[session.event] || 0) + value
    }

    if (solveCount > 0) {
      groupedValues[groupLabel][`_solves_${session.event}`] =
        (groupedValues[groupLabel][`_solves_${session.event}`] || 0) + solveCount
    }
  }

  const orderedEventIds = Object.keys(eventTotals).sort((a, b) => {
    const totalDiff = eventTotals[b] - eventTotals[a]
    if (totalDiff !== 0) return totalDiff

    const knownOrderA = KNOWN_EVENT_ORDER.get(a)
    const knownOrderB = KNOWN_EVENT_ORDER.get(b)

    if (knownOrderA !== undefined && knownOrderB !== undefined) {
      return knownOrderA - knownOrderB
    }
    if (knownOrderA !== undefined) return -1
    if (knownOrderB !== undefined) return 1
    return a.localeCompare(b)
  })

  const chartData = Object.keys(groupedValues)
    .sort((a, b) => sortKeys[a] - sortKeys[b])
    .map((label) => ({
      label,
      ...groupedValues[label],
    }))

  return {
    chartData,
    series: orderedEventIds.map(getSessionChartSeriesMeta),
  }
}
