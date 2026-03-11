import { ALL_TIMER_EVENTS, getEventLabel, getPBTypesForEvent } from "@/lib/constants"
import type { PBRecord, Profile, Session } from "@/lib/types"
import { formatEventTime, getTodayPacific } from "@/lib/utils"

export type ComparisonSide = "viewer" | "target"
export type ComparisonWinner = ComparisonSide | "tie" | null
export type ComparisonPbResult =
  | ComparisonSide
  | "tie"
  | "viewer_only"
  | "target_only"
  | "none"

export type ComparisonPracticeTotals = {
  minutes: number
  sessions: number
  solves: number
}

export type ComparisonPracticeWindow = {
  key: "7d" | "30d"
  label: string
  viewer: ComparisonPracticeTotals
  target: ComparisonPracticeTotals
  winner: ComparisonWinner
}

export type ComparisonEventPracticeRow = {
  eventId: string
  eventLabel: string
  viewer: {
    minutes: number
    solves: number
  }
  target: {
    minutes: number
    solves: number
  }
  minutesWinner: ComparisonWinner
  solvesWinner: ComparisonWinner
}

export type ComparisonPbTypeRow = {
  pbType: string
  viewerRecord: PBRecord | null
  targetRecord: PBRecord | null
  viewerDisplay: string | null
  targetDisplay: string | null
  result: ComparisonPbResult
  note: string | null
}

export type ComparisonPbEventRow = {
  eventId: string
  eventLabel: string
  rows: ComparisonPbTypeRow[]
  lead: ComparisonWinner
  comparableCount: number
}

export type ComparisonIdentity = {
  id: string
  displayName: string
  handle: string
  avatarUrl: string | null
  mainEvents: string[]
  totalMinutes: number
  totalSolves: number
  sessionCount: number
}

export type ComparisonSummaryLeads = {
  viewerLeadEvents: string[]
  targetLeadEvents: string[]
  tiedEvents: string[]
  comparableEventCount: number
}

export type ProfileComparisonData = {
  viewer: ComparisonIdentity
  target: ComparisonIdentity
  practiceWindows: ComparisonPracticeWindow[]
  eventPracticeRows: ComparisonEventPracticeRow[]
  pbEventRows: ComparisonPbEventRow[]
  summaryLeads: ComparisonSummaryLeads
}

const EVENT_ORDER = new Map<string, number>(
  ALL_TIMER_EVENTS.map((event, index) => [event.id, index])
)

function parseDateOnly(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`)
}

function shiftDate(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function pickNumericWinner(
  viewerValue: number,
  targetValue: number
): ComparisonWinner {
  if (viewerValue === 0 && targetValue === 0) return null
  if (viewerValue === targetValue) return "tie"
  return viewerValue > targetValue ? "viewer" : "target"
}

function sortEventIds(eventIds: Iterable<string>): string[] {
  return Array.from(new Set(eventIds)).sort((left, right) => {
    const leftOrder = EVENT_ORDER.get(left)
    const rightOrder = EVENT_ORDER.get(right)

    if (leftOrder !== undefined && rightOrder !== undefined) {
      return leftOrder - rightOrder
    }

    if (leftOrder !== undefined) return -1
    if (rightOrder !== undefined) return 1

    return getEventLabel(left).localeCompare(getEventLabel(right))
  })
}

function getMainEvents(profile: Profile): string[] {
  if (profile.main_events?.length) return profile.main_events
  return profile.main_event ? [profile.main_event] : []
}

function buildIdentity(profile: Profile, sessions: Session[]): ComparisonIdentity {
  return {
    id: profile.id,
    displayName: profile.display_name,
    handle: profile.handle,
    avatarUrl: profile.avatar_url,
    mainEvents: getMainEvents(profile),
    totalMinutes: sessions.reduce((sum, session) => sum + session.duration_minutes, 0),
    totalSolves: sessions.reduce((sum, session) => sum + (session.num_solves ?? 0), 0),
    sessionCount: sessions.length,
  }
}

function isBetterMbld(
  candidate: Pick<PBRecord, "time_seconds" | "mbld_solved" | "mbld_attempted">,
  current: Pick<PBRecord, "time_seconds" | "mbld_solved" | "mbld_attempted">
): boolean {
  const candidatePoints =
    2 * (candidate.mbld_solved ?? 0) - (candidate.mbld_attempted ?? 0)
  const currentPoints =
    2 * (current.mbld_solved ?? 0) - (current.mbld_attempted ?? 0)

  if (candidatePoints !== currentPoints) {
    return candidatePoints > currentPoints
  }

  return candidate.time_seconds < current.time_seconds
}

function isEqualMbld(
  left: Pick<PBRecord, "time_seconds" | "mbld_solved" | "mbld_attempted">,
  right: Pick<PBRecord, "time_seconds" | "mbld_solved" | "mbld_attempted">
): boolean {
  const leftPoints = 2 * (left.mbld_solved ?? 0) - (left.mbld_attempted ?? 0)
  const rightPoints = 2 * (right.mbld_solved ?? 0) - (right.mbld_attempted ?? 0)

  return leftPoints === rightPoints && left.time_seconds === right.time_seconds
}

function pickBetterPb(candidate: PBRecord, current: PBRecord): PBRecord {
  if (candidate.event === "333mbf") {
    return isBetterMbld(candidate, current) ? candidate : current
  }

  return candidate.time_seconds < current.time_seconds ? candidate : current
}

function groupCurrentPbs(pbs: PBRecord[]): Map<string, Map<string, PBRecord>> {
  const grouped = new Map<string, Map<string, PBRecord>>()

  for (const pb of pbs) {
    const eventMap = grouped.get(pb.event) ?? new Map<string, PBRecord>()
    const current = eventMap.get(pb.pb_type)

    eventMap.set(pb.pb_type, current ? pickBetterPb(pb, current) : pb)
    grouped.set(pb.event, eventMap)
  }

  return grouped
}

function sortPbTypes(eventId: string, pbTypes: Iterable<string>): string[] {
  const typeSet = new Set(pbTypes)
  const preferred = getPBTypesForEvent(eventId)
  const ordered = preferred.filter((type) => typeSet.has(type))
  const extras = Array.from(typeSet).filter((type) => !preferred.includes(type)).sort()

  return [...ordered, ...extras]
}

export function aggregatePracticeWindow(
  sessions: Session[],
  days: number,
  todayString = getTodayPacific()
): ComparisonPracticeTotals {
  const today = parseDateOnly(todayString)
  const start = shiftDate(today, -(days - 1))

  let minutes = 0
  let sessionCount = 0
  let solves = 0

  for (const session of sessions) {
    const sessionDate = parseDateOnly(session.session_date)
    if (sessionDate < start || sessionDate > today) continue

    minutes += session.duration_minutes
    sessionCount += 1
    solves += session.num_solves ?? 0
  }

  return {
    minutes,
    sessions: sessionCount,
    solves,
  }
}

export function aggregateEventPractice(
  sessions: Session[]
): Map<string, { minutes: number; solves: number }> {
  const eventMap = new Map<string, { minutes: number; solves: number }>()

  for (const session of sessions) {
    const current = eventMap.get(session.event) ?? { minutes: 0, solves: 0 }
    current.minutes += session.duration_minutes
    current.solves += session.num_solves ?? 0
    eventMap.set(session.event, current)
  }

  return eventMap
}

export function formatComparisonPb(record: PBRecord | null): string | null {
  if (!record) return null

  if (record.event === "333mbf" && record.mbld_solved && record.mbld_attempted) {
    return `${record.mbld_solved}/${record.mbld_attempted} in ${formatEventTime(record.time_seconds, record.event, { showSecondsSuffix: false })}`
  }

  return formatEventTime(record.time_seconds, record.event, {
    showSecondsSuffix: false,
  })
}

export function comparePbRecords(
  viewerRecord: PBRecord | null,
  targetRecord: PBRecord | null
): { result: ComparisonPbResult; note: string | null } {
  if (!viewerRecord && !targetRecord) {
    return { result: "none", note: null }
  }

  if (viewerRecord && !targetRecord) {
    return {
      result: "viewer_only",
      note: "Only one user has logged this PB",
    }
  }

  if (!viewerRecord && targetRecord) {
    return {
      result: "target_only",
      note: "Only one user has logged this PB",
    }
  }

  if (!viewerRecord || !targetRecord) {
    return { result: "none", note: null }
  }

  if (viewerRecord.event === "333mbf") {
    if (isEqualMbld(viewerRecord, targetRecord)) {
      return { result: "tie", note: "Matching current PBs" }
    }

    return {
      result: isBetterMbld(viewerRecord, targetRecord) ? "viewer" : "target",
      note: null,
    }
  }

  if (viewerRecord.time_seconds === targetRecord.time_seconds) {
    return { result: "tie", note: "Matching current PBs" }
  }

  return {
    result:
      viewerRecord.time_seconds < targetRecord.time_seconds ? "viewer" : "target",
    note: null,
  }
}

export function buildProfileComparisonData(
  input: {
    viewerProfile: Profile
    targetProfile: Profile
    viewerSessions: Session[]
    targetSessions: Session[]
    viewerPbs: PBRecord[]
    targetPbs: PBRecord[]
  },
  options?: {
    todayString?: string
  }
): ProfileComparisonData {
  const todayString = options?.todayString ?? getTodayPacific()
  const viewerIdentity = buildIdentity(input.viewerProfile, input.viewerSessions)
  const targetIdentity = buildIdentity(input.targetProfile, input.targetSessions)
  const viewerPractice = aggregateEventPractice(input.viewerSessions)
  const targetPractice = aggregateEventPractice(input.targetSessions)
  const viewerPbsByEvent = groupCurrentPbs(input.viewerPbs)
  const targetPbsByEvent = groupCurrentPbs(input.targetPbs)

  const practiceWindows: ComparisonPracticeWindow[] = [
    {
      key: "7d" as const,
      label: "Last 7 Days",
      viewer: aggregatePracticeWindow(input.viewerSessions, 7, todayString),
      target: aggregatePracticeWindow(input.targetSessions, 7, todayString),
      winner: null,
    },
    {
      key: "30d" as const,
      label: "Last 30 Days",
      viewer: aggregatePracticeWindow(input.viewerSessions, 30, todayString),
      target: aggregatePracticeWindow(input.targetSessions, 30, todayString),
      winner: null,
    },
  ].map((window): ComparisonPracticeWindow => ({
    ...window,
    winner: pickNumericWinner(window.viewer.minutes, window.target.minutes),
  }))

  const allEventIds = sortEventIds([
    ...viewerPractice.keys(),
    ...targetPractice.keys(),
    ...viewerPbsByEvent.keys(),
    ...targetPbsByEvent.keys(),
  ])

  const eventPracticeRows: ComparisonEventPracticeRow[] = allEventIds.map((eventId) => {
    const viewerTotals = viewerPractice.get(eventId) ?? { minutes: 0, solves: 0 }
    const targetTotals = targetPractice.get(eventId) ?? { minutes: 0, solves: 0 }

    return {
      eventId,
      eventLabel: getEventLabel(eventId),
      viewer: viewerTotals,
      target: targetTotals,
      minutesWinner: pickNumericWinner(viewerTotals.minutes, targetTotals.minutes),
      solvesWinner: pickNumericWinner(viewerTotals.solves, targetTotals.solves),
    }
  })

  const pbEventIds = sortEventIds([
    ...viewerPbsByEvent.keys(),
    ...targetPbsByEvent.keys(),
  ])

  const pbEventRows: ComparisonPbEventRow[] = pbEventIds.map((eventId) => {
    const viewerEventPbs = viewerPbsByEvent.get(eventId) ?? new Map<string, PBRecord>()
    const targetEventPbs = targetPbsByEvent.get(eventId) ?? new Map<string, PBRecord>()
    const pbTypes = sortPbTypes(eventId, [
      ...viewerEventPbs.keys(),
      ...targetEventPbs.keys(),
    ])

    const rows = pbTypes.map((pbType) => {
      const viewerRecord = viewerEventPbs.get(pbType) ?? null
      const targetRecord = targetEventPbs.get(pbType) ?? null
      const comparison = comparePbRecords(viewerRecord, targetRecord)

      return {
        pbType,
        viewerRecord,
        targetRecord,
        viewerDisplay: formatComparisonPb(viewerRecord),
        targetDisplay: formatComparisonPb(targetRecord),
        result: comparison.result,
        note: comparison.note,
      }
    })

    const viewerWins = rows.filter((row) => row.result === "viewer").length
    const targetWins = rows.filter((row) => row.result === "target").length
    const comparableCount = rows.filter((row) =>
      row.result === "viewer" || row.result === "target" || row.result === "tie"
    ).length

    let lead: ComparisonWinner = null
    if (viewerWins > targetWins) {
      lead = "viewer"
    } else if (targetWins > viewerWins) {
      lead = "target"
    } else if (comparableCount > 0) {
      lead = "tie"
    }

    return {
      eventId,
      eventLabel: getEventLabel(eventId),
      rows,
      lead,
      comparableCount,
    }
  })

  const summaryLeads: ComparisonSummaryLeads = {
    viewerLeadEvents: pbEventRows
      .filter((row) => row.lead === "viewer")
      .map((row) => row.eventLabel),
    targetLeadEvents: pbEventRows
      .filter((row) => row.lead === "target")
      .map((row) => row.eventLabel),
    tiedEvents: pbEventRows
      .filter((row) => row.lead === "tie")
      .map((row) => row.eventLabel),
    comparableEventCount: pbEventRows.filter((row) => row.comparableCount > 0)
      .length,
  }

  return {
    viewer: viewerIdentity,
    target: targetIdentity,
    practiceWindows,
    eventPracticeRows,
    pbEventRows,
    summaryLeads,
  }
}
