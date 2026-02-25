import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert any Date to a YYYY-MM-DD string in Pacific Time.
 * Works on both client (any timezone) and server (Vercel = UTC).
 */
export function toDateStringPacific(date: Date): string {
  const pacific = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  )
  const y = pacific.getFullYear()
  const m = String(pacific.getMonth() + 1).padStart(2, "0")
  const d = String(pacific.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Today's date as YYYY-MM-DD in Pacific Time. */
export function getTodayPacific(): string {
  return toDateStringPacific(new Date())
}

/**
 * Format a duration in minutes to a human-readable string.
 * - Under 60 minutes: "45m"
 * - 60+ minutes: "1h 30m" (omits minutes if exactly on the hour, e.g. "2h")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Format a solve time (in decimal seconds) to standard cubing notation.
 * - Under 60s: "12.34"
 * - 60s+: "1:30.00"
 */
export function formatSolveTime(seconds: number): string {
  if (seconds < 60) return seconds.toFixed(2)
  const min = Math.floor(seconds / 60)
  const sec = (seconds % 60).toFixed(2)
  return `${min}:${sec.padStart(5, "0")}`
}

/**
 * Parse a solve time string back to decimal seconds.
 * Accepts "12.34" → 12.34, "1:30.00" → 90, "1:30" → 90.
 * Returns null if the input is empty or invalid.
 */
export function parseSolveTime(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":")
    if (parts.length !== 2) return null
    const min = parseInt(parts[0], 10)
    const sec = parseFloat(parts[1])
    if (isNaN(min) || isNaN(sec) || min < 0 || sec < 0 || sec >= 60) return null
    const total = min * 60 + sec
    return total > 0 ? total : null
  }

  const num = parseFloat(trimmed)
  if (isNaN(num) || num <= 0) return null
  return num
}

/**
 * Parse a duration string into total minutes.
 * Accepts "1:30" (h:mm) → 90, or "90" (plain minutes) → 90.
 * Returns null if the input is invalid.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":")
    if (parts.length !== 2) return null
    const hours = parseInt(parts[0], 10)
    const mins = parseInt(parts[1], 10)
    if (isNaN(hours) || isNaN(mins) || hours < 0 || mins < 0 || mins > 59) return null
    const total = hours * 60 + mins
    return total > 0 ? total : null
  }

  const num = parseInt(trimmed, 10)
  if (isNaN(num) || num < 1) return null
  return num
}
