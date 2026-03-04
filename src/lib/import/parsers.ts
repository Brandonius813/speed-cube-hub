/**
 * Unified parser wrappers for known timer formats.
 * Each function takes raw text and returns a ParseResult.
 * Unknown formats are handled by the AI route, not here.
 */

import type { ParseResult, NormalizedSolve, RawImportSolve } from "./types"
import { parseCsTimerCsv } from "@/lib/cstimer/parse-cstimer"
import { parseCubeTimeCsv } from "@/lib/cubetime/parse-cubetime"
import { parseCsv } from "@/lib/csv/parse-csv"
import { resolveEventId } from "@/lib/csv/event-aliases"
import { toDateStringPacific } from "@/lib/utils"

/** Raw session shape returned by csTimer/CubeTime parsers */
export type RawSession = {
  session_date: string
  num_solves: number
  num_dnf: number
  avg_time: number | null
  best_time: number | null
}

// -- csTimer --

export function parseCsTimer(text: string): ParseResult & {
  _rawSessions: RawSession[]
  _totalSolves: number
  _rawSolves: RawImportSolve[]
} {
  const { sessions, rawSolves, totalSolves, errors } = parseCsTimerCsv(text)

  const rawSessions: RawSession[] = sessions.map((s) => ({
    session_date: s.session_date,
    num_solves: s.num_solves,
    num_dnf: s.num_dnf,
    avg_time: s.avg_time,
    best_time: s.best_time,
  }))

  return {
    dataType: "solves",
    source: "csTimer",
    detectedEvent: null,
    solves: [],
    pbs: [],
    errors,
    needsEventSelection: true,
    _rawSessions: rawSessions,
    _totalSolves: totalSolves,
    _rawSolves: rawSolves,
  }
}

// -- CubeTime --

export function parseCubeTime(text: string): ParseResult & {
  _rawSessions: RawSession[]
  _totalSolves: number
  _rawSolves: RawImportSolve[]
} {
  const { sessions, rawSolves, totalSolves, errors } = parseCubeTimeCsv(text)

  const rawSessions: RawSession[] = sessions.map((s) => ({
    session_date: s.session_date,
    num_solves: s.num_solves,
    num_dnf: s.num_dnf,
    avg_time: s.avg_time,
    best_time: s.best_time,
  }))

  return {
    dataType: "solves",
    source: "CubeTime",
    detectedEvent: null,
    solves: [],
    pbs: [],
    errors,
    needsEventSelection: true,
    _rawSessions: rawSessions,
    _totalSolves: totalSolves,
    _rawSolves: rawSolves,
  }
}

// -- Twisty Timer (Android) --

const TWISTY_EVENT_MAP: Record<string, string> = {
  "333": "333",
  "222": "222",
  "444": "444",
  "555": "555",
  "666": "666",
  "777": "777",
  pyra: "pyram",
  pyraminx: "pyram",
  skewb: "skewb",
  mega: "minx",
  megaminx: "minx",
  sq1: "sq1",
  "sq-1": "sq1",
  "square-1": "sq1",
  clock: "clock",
  "3bld": "333bf",
  "333bf": "333bf",
  "4bld": "444bf",
  "5bld": "555bf",
  "333oh": "333oh",
  oh: "333oh",
}

export function parseTwistyTimer(text: string): ParseResult & {
  _rawSolves: RawImportSolve[]
} {
  const errors: string[] = []
  const cleaned = text.replace(/^\uFEFF/, "")
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim())

  if (lines.length < 2) {
    return {
      dataType: "solves",
      source: "Twisty Timer",
      detectedEvent: null,
      solves: [],
      pbs: [],
      errors: ["File is empty or has no data rows."],
      needsEventSelection: false,
      _rawSolves: [],
    }
  }

  const headers = lines[0].split(";").map((h) => h.trim().toLowerCase())
  const puzzleIdx = headers.indexOf("puzzle")
  const timeIdx = headers.findIndex((h) => h.includes("time(millis)"))
  const dateIdx = headers.findIndex((h) => h.includes("date(millis)"))
  const penaltyIdx = headers.indexOf("penalty")

  if (timeIdx === -1 || dateIdx === -1) {
    return {
      dataType: "solves",
      source: "Twisty Timer",
      detectedEvent: null,
      solves: [],
      pbs: [],
      errors: ["Missing Time(millis) or Date(millis) columns."],
      needsEventSelection: false,
      _rawSolves: [],
    }
  }

  const solves: NormalizedSolve[] = []
  let detectedEvent: string | null = null
  const eventCounts = new Map<string, number>()

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(";")
    const rawTime = (fields[timeIdx] ?? "").trim()
    const rawDate = (fields[dateIdx] ?? "").trim()
    const rawPenalty = penaltyIdx >= 0 ? (fields[penaltyIdx] ?? "").trim() : ""
    const rawPuzzle = puzzleIdx >= 0 ? (fields[puzzleIdx] ?? "").trim() : ""

    if (!rawTime || !rawDate) continue

    const timeMs = parseInt(rawTime, 10)
    const dateMs = parseInt(rawDate, 10)

    if (isNaN(timeMs) || isNaN(dateMs)) {
      errors.push(`Row ${i + 1}: invalid time or date`)
      continue
    }

    const isDnf = rawPenalty.toUpperCase() === "DNF"
    const penalty = rawPenalty === "+2" ? ("+2" as const) : null
    const timeSeconds = isDnf ? null : Math.round(timeMs / 10) / 100

    const dateObj = new Date(dateMs)
    const dateStr = isNaN(dateObj.getTime())
      ? "1970-01-01"
      : toDateStringPacific(dateObj)

    solves.push({
      time_seconds: timeSeconds,
      date: dateStr,
      is_dnf: isDnf,
      penalty,
      scramble: null,
    })

    // Track event from Puzzle column
    if (rawPuzzle) {
      const eventId =
        TWISTY_EVENT_MAP[rawPuzzle.toLowerCase()] ??
        resolveEventId(rawPuzzle)
      if (eventId) {
        eventCounts.set(eventId, (eventCounts.get(eventId) ?? 0) + 1)
      }
    }
  }

  // Pick the most common event
  if (eventCounts.size > 0) {
    let maxCount = 0
    for (const [event, count] of eventCounts) {
      if (count > maxCount) {
        maxCount = count
        detectedEvent = event
      }
    }
  }

  // Build raw solve records for bulk import
  const rawSolves: RawImportSolve[] = solves.map((s) => ({
    time_ms: s.time_seconds != null ? Math.round(s.time_seconds * 1000) : 0,
    penalty: (s.is_dnf ? "DNF" : s.penalty) as "+2" | "DNF" | null,
    scramble: s.scramble ?? "",
    date: s.date,
  }))

  return {
    dataType: "solves",
    source: "Twisty Timer",
    detectedEvent,
    solves,
    pbs: [],
    errors,
    needsEventSelection: !detectedEvent,
    _rawSolves: rawSolves,
  }
}

// -- Generic CSV --

export function parseGenericCsv(text: string): ParseResult & {
  _csvRows: Record<string, string>[]
} {
  const { rows, errors } = parseCsv(text)

  return {
    dataType: "solves",
    source: "CSV",
    detectedEvent: null,
    solves: [],
    pbs: [],
    errors,
    needsEventSelection: false,
    _csvRows: rows,
  }
}
