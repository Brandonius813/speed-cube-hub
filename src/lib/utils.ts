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

export type SessionStats = {
  sessionsThisWeek: number
  totalMinutes: number
  currentStreak: number
  longestStreak: number
  weeklyMinutes: number
  weeklyChange: number
}

/**
 * Compute dashboard stats from a list of sessions.
 * Only needs session_date and duration_minutes — avoids loading full rows.
 * Used by page server components to derive stats from already-fetched sessions,
 * eliminating the previous pattern of fetching all sessions twice.
 */
export function computeSessionStats(
  sessions: Array<{ session_date: string; duration_minutes: number }>
): SessionStats {
  if (sessions.length === 0) {
    return {
      sessionsThisWeek: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      weeklyMinutes: 0,
      weeklyChange: 0,
    }
  }

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(startOfWeek)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  let sessionsThisWeek = 0
  let weeklyMinutes = 0
  let lastWeekSessions = 0
  let totalMinutes = 0

  for (const session of sessions) {
    const sessionDate = new Date(session.session_date + "T00:00:00")
    totalMinutes += session.duration_minutes

    if (sessionDate >= startOfWeek) {
      sessionsThisWeek++
      weeklyMinutes += session.duration_minutes
    } else if (sessionDate >= lastWeekStart && sessionDate < startOfWeek) {
      lastWeekSessions++
    }
  }

  // Calculate streaks from unique dates
  const uniqueDates = [
    ...new Set(sessions.map((s) => s.session_date)),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  let currentStreak = 0
  if (uniqueDates.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let checkDate = new Date(today)
    const latestSession = new Date(uniqueDates[0] + "T00:00:00")
    if (latestSession < today) {
      checkDate = latestSession
    }

    for (const dateStr of uniqueDates) {
      const sessionDate = new Date(dateStr + "T00:00:00")
      if (sessionDate.getTime() === checkDate.getTime()) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (sessionDate < checkDate) {
        break
      }
    }
  }

  let longestStreak = 0
  if (uniqueDates.length > 0) {
    let streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00")
      const curr = new Date(uniqueDates[i] + "T00:00:00")
      const diffDays =
        (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000)
      if (Math.round(diffDays) === 1) {
        streak++
      } else {
        longestStreak = Math.max(longestStreak, streak)
        streak = 1
      }
    }
    longestStreak = Math.max(longestStreak, streak)
  }

  return {
    sessionsThisWeek,
    totalMinutes,
    currentStreak,
    longestStreak,
    weeklyMinutes,
    weeklyChange: sessionsThisWeek - lastWeekSessions,
  }
}
