import { WCA_EVENTS, getPBTypesForEvent } from "@/lib/constants"
import { getTodayPacific } from "@/lib/utils"

// ── Types ──

export type ImportRow = {
  id: number
  event: string
  pbType: string
  time: string
  date: string
  mbldScore: string // "4/5" format for Multi-BLD
}

export type ParsedCSVRow = {
  event: string // resolved event ID
  eventRaw: string // original text from CSV
  pbType: string
  time: string
  date: string
  mbldScore: string // "4/5" parsed from CSV for Multi-BLD
  error?: string
}

// ── Helpers ──

export function parseTimeInput(value: string): number | null {
  if (!value.trim()) return null
  if (!value.includes(":")) {
    const num = Number(value)
    return !isNaN(num) && num > 0 ? num : null
  }
  const parts = value.split(":")
  // H:MM:SS format
  if (parts.length === 3) {
    const hours = Number(parts[0])
    const minutes = Number(parts[1])
    const seconds = Number(parts[2])
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null
    const total = hours * 3600 + minutes * 60 + seconds
    return total > 0 ? total : null
  }
  // MM:SS or MM:SS.XX format
  if (parts.length !== 2) return null
  const minutes = Number(parts[0])
  const seconds = Number(parts[1])
  if (isNaN(minutes) || isNaN(seconds)) return null
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null
  const total = minutes * 60 + seconds
  return total > 0 ? total : null
}

/**
 * Parse an MBLD score string like "4/5" into { solved, attempted }.
 */
export function parseMBLDScore(value: string): { solved: number; attempted: number } | null {
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!match) return null
  const solved = Number(match[1])
  const attempted = Number(match[2])
  if (solved < 1 || attempted < 2 || solved > attempted) return null
  return { solved, attempted }
}

/**
 * Fuzzy-match an event name string to a WCA event ID.
 * Accepts: "3x3", "333", "3x3x3", "3x3 BLD", "megaminx", "OH", etc.
 */
function resolveEventId(raw: string): string | null {
  const input = raw.trim().toLowerCase()
  if (!input) return null

  // Direct ID match (e.g. "333", "333bf", "sq1")
  const directId = WCA_EVENTS.find((e) => e.id.toLowerCase() === input)
  if (directId) return directId.id

  // Label match (e.g. "3x3", "3x3 BLD", "Megaminx")
  const labelMatch = WCA_EVENTS.find((e) => e.label.toLowerCase() === input)
  if (labelMatch) return labelMatch.id

  // Common aliases
  const aliases: Record<string, string> = {
    "2x2x2": "222",
    "3x3x3": "333",
    "4x4x4": "444",
    "5x5x5": "555",
    "6x6x6": "666",
    "7x7x7": "777",
    "3bld": "333bf",
    "3x3 blind": "333bf",
    "3x3 blindfolded": "333bf",
    "4bld": "444bf",
    "4x4 bld": "444bf",
    "4x4 blind": "444bf",
    "4x4 blindfolded": "444bf",
    "5bld": "555bf",
    "5x5 bld": "555bf",
    "5x5 blind": "555bf",
    "5x5 blindfolded": "555bf",
    "mbld": "333mbf",
    "multi bld": "333mbf",
    "multi-blind": "333mbf",
    "multi blind": "333mbf",
    "multiblind": "333mbf",
    "one-handed": "333oh",
    "one handed": "333oh",
    "3x3 oh": "333oh",
    "3oh": "333oh",
    "mega": "minx",
    "megaminx": "minx",
    "pyra": "pyram",
    "pyraminx": "pyram",
    "square-1": "sq1",
    "square 1": "sq1",
    "squan": "sq1",
    "fmc": "333fm",
    "fewest moves": "333fm",
  }

  return aliases[input] ?? null
}

/**
 * Fuzzy-match a PB type string.
 * Accepts: "single", "ao5", "Ao12", "mo3", etc.
 */
function resolvePBType(raw: string): string | null {
  const input = raw.trim().toLowerCase()
  if (!input) return null

  const typeMap: Record<string, string> = {
    single: "Single",
    ao5: "Ao5",
    ao12: "Ao12",
    ao25: "Ao25",
    ao50: "Ao50",
    ao100: "Ao100",
    ao200: "Ao200",
    ao1000: "Ao1000",
    mo3: "Mo3",
  }

  return typeMap[input] ?? null
}

/**
 * Parse a date string flexibly. Accepts:
 * - YYYY-MM-DD
 * - MM/DD/YYYY
 * - M/D/YYYY
 */
function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-")
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // MM/DD/YYYY or M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [m, d, y] = trimmed.split("/")
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  return null
}

export function parseCSVText(text: string): ParsedCSVRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim())
  if (lines.length === 0) return []

  // Check if the first line is a header row
  const firstLine = lines[0].toLowerCase()
  const startsWithHeader =
    firstLine.includes("event") || firstLine.includes("type") || firstLine.includes("time")
  const dataLines = startsWithHeader ? lines.slice(1) : lines

  return dataLines.map((line) => {
    // Split by comma or tab
    const parts = line.split(/[,\t]/).map((p) => p.trim())

    if (parts.length < 3) {
      return {
        event: "",
        eventRaw: parts[0] || "",
        pbType: "",
        time: "",
        date: getTodayPacific(),
        mbldScore: "",
        error: "Need at least 3 columns: Event, PB Type, Time",
      }
    }

    const eventId = resolveEventId(parts[0])
    const pbType = resolvePBType(parts[1])
    const isMBLD = eventId === "333mbf"

    const errors: string[] = []
    if (!eventId) errors.push(`Unknown event "${parts[0]}"`)
    if (!pbType) errors.push(`Unknown PB type "${parts[1]}"`)

    let time: string
    let date: string | null
    let mbldScore = ""

    if (isMBLD) {
      // MBLD format: Event, Type, Score (4/5), Time (19:31), Date
      mbldScore = parts[2]
      time = parts[3] || ""
      date = parts[4] ? parseDateInput(parts[4]) : getTodayPacific()

      const score = parseMBLDScore(mbldScore)
      if (!score) errors.push(`Invalid MBLD score "${parts[2]}" (use solved/attempted, e.g. "4/5")`)
      if (!time) {
        errors.push("Time is required for Multi-BLD")
      } else if (parseTimeInput(time) === null) {
        errors.push(`Invalid time "${parts[3]}"`)
      }
      if (parts[4] && !date) errors.push(`Invalid date "${parts[4]}"`)
    } else {
      // Standard format: Event, Type, Time, Date
      time = parts[2]
      date = parts[3] ? parseDateInput(parts[3]) : getTodayPacific()

      if (parseTimeInput(time) === null) errors.push(`Invalid time "${parts[2]}"`)
      if (parts[3] && !date) errors.push(`Invalid date "${parts[3]}"`)
    }

    // Validate PB type is valid for this event
    if (eventId && pbType) {
      const validTypes = getPBTypesForEvent(eventId)
      if (!validTypes.includes(pbType)) {
        errors.push(`${pbType} is not valid for ${parts[0]}`)
      }
    }

    return {
      event: eventId || "",
      eventRaw: parts[0],
      pbType: pbType || "",
      time,
      date: date || getTodayPacific(),
      mbldScore,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    }
  })
}
