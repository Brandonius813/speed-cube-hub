/**
 * Shared types for the hybrid import system.
 * All parsers (deterministic + AI) normalize into these types.
 */

export type ImportDataType = "solves" | "pbs" | "mixed"

export type NormalizedSolve = {
  time_seconds: number | null // decimal seconds (null = bare DNF)
  date: string // YYYY-MM-DD
  is_dnf: boolean
  penalty: "+2" | null
  scramble: string | null
}

export type NormalizedPB = {
  event: string // WCA event ID
  pb_type: string // "Single", "Ao5", "Ao12", etc.
  time_seconds: number
  date_achieved: string // YYYY-MM-DD
}

/** Session-level summary available before import for solve-based timer exports. */
export type ImportPreviewSession = {
  session_date: string
  num_solves: number
  num_dnf: number
  avg_time: number | null
  best_time: number | null
}

/** Individual solve ready for bulkImportSolves() */
export type RawImportSolve = {
  time_ms: number // base time in ms (before penalty)
  penalty: "+2" | "DNF" | null
  scramble: string // empty string if none in export
  date: string // YYYY-MM-DD
}

/** Optional preview payload for timer imports that include solve-level data. */
export type ImportPreviewPayload = {
  rawSolves: RawImportSolve[]
  totalSolves: number
  rawSessions?: ImportPreviewSession[]
}

export type DetectedFormat =
  | "cstimer"
  | "cubetime"
  | "twistytimer"
  | "generic_csv"
  | "unknown"

export type DetectionResult = {
  format: DetectedFormat
  confidence: "high" | "medium" | "low"
}

export type ParseResult = {
  dataType: ImportDataType
  source: string // "csTimer", "CubeTime", "Twisty Timer", "AI", "CSV"
  detectedEvent: string | null // WCA event ID if detected, null if unknown
  solves: NormalizedSolve[]
  pbs: NormalizedPB[]
  errors: string[]
  needsEventSelection: boolean // true if event could not be determined
  preview?: ImportPreviewPayload
}

/** Shape expected by createSessionsBulk() */
export type SessionSummary = {
  session_date: string
  event: string
  practice_type: string
  num_solves: number
  num_dnf: number
  duration_minutes: number
  avg_time: number | null
  best_time: number | null
  notes: string | null
}
