/**
 * Auto-detects the format of uploaded text by examining its structure.
 * Checks known timer export patterns before falling through to "unknown".
 */

import type { DetectionResult } from "./types"

export function detectFormat(text: string): DetectionResult {
  const cleaned = text.replace(/^\uFEFF/, "").trim()
  if (!cleaned) return { format: "unknown", confidence: "low" }

  const lines = cleaned
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 5)

  if (lines.length === 0) return { format: "unknown", confidence: "low" }

  const headerLine = lines[0]

  // csTimer: semicolon-delimited with "Time" and "Date" headers
  if (headerLine.includes(";")) {
    const headers = headerLine.split(";").map((h) => h.trim().toLowerCase())
    if (headers.includes("time") && headers.includes("date")) {
      return { format: "cstimer", confidence: "high" }
    }
  }

  // Twisty Timer: semicolons + Puzzle + Time(millis) + Date(millis)
  if (headerLine.includes(";")) {
    const headersLower = headerLine.toLowerCase()
    if (
      headersLower.includes("puzzle") &&
      headersLower.includes("time(millis)") &&
      headersLower.includes("date(millis)")
    ) {
      return { format: "twistytimer", confidence: "high" }
    }
  }

  // CubeTime: commas + Time/Date headers + high-precision floats
  if (headerLine.includes(",")) {
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase())
    if (headers.includes("time") && headers.includes("date")) {
      if (lines.length > 1) {
        const dataLine = lines[1]
        const hasPreciseFloat = /^\d+\.\d{6,}/.test(dataLine.trim())
        const hasTimezoneOffset = /[+-]\d{4}\s*$/.test(dataLine.trim())
        if (hasPreciseFloat || hasTimezoneOffset) {
          return { format: "cubetime", confidence: "high" }
        }
      }
    }
  }

  // Generic CSV: session summary headers
  if (headerLine.includes(",")) {
    const headersLower = headerLine.toLowerCase()
    const hasDate = headersLower.includes("date") || headersLower.includes("session_date")
    const hasEvent = headersLower.includes("event") || headersLower.includes("puzzle")
    const hasDuration = headersLower.includes("duration") || headersLower.includes("minutes")
    const hasPracticeType =
      headersLower.includes("practice_type") ||
      headersLower.includes("practice type") ||
      headersLower.includes("type")

    if (hasDate && hasEvent && (hasDuration || hasPracticeType)) {
      return { format: "generic_csv", confidence: "medium" }
    }
  }

  return { format: "unknown", confidence: "low" }
}
