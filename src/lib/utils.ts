import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
