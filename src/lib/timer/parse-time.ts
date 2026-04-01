/**
 * Parse a user-typed time string into milliseconds.
 *
 * Supported formats:
 * - Stackmat-style digits: "1234" → 12.34s → 12340ms
 * - Decimal seconds: "12.34" → 12340ms
 * - Colon notation: "1:23.45" → 83450ms
 */
export function parseTime(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.includes(":")) {
    const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:[.,](\d{1,2}))?$/)
    if (!colonMatch) return null
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    const cs = parseInt((colonMatch[3] ?? "0").padEnd(2, "0"), 10)
    if (secs >= 60) return null
    const ms = (mins * 60 + secs) * 1000 + cs * 10
    return ms > 0 ? ms : null
  }

  const normalized = trimmed.replace(",", ".")
  if (normalized.includes(".")) {
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null
    const seconds = Number(normalized)
    if (!Number.isFinite(seconds) || seconds <= 0) return null
    const ms = Math.round(seconds * 100) * 10
    return ms > 0 ? ms : null
  }

  const digits = normalized.replace(/\D/g, "")
  if (!digits) return null
  const padded = digits.padStart(3, "0")
  const cs = parseInt(padded.slice(-2), 10)
  const rest = padded.slice(0, -2)
  const secs = parseInt(rest.slice(-2) || "0", 10)
  const mins = parseInt(rest.slice(0, -2) || "0", 10)
  if (secs >= 60) return null
  const ms = (mins * 60 + secs) * 1000 + cs * 10
  return ms > 0 ? ms : null
}
