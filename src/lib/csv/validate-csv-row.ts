import { PRACTICE_TYPES } from "@/lib/constants";
import { resolveEventId, getEventLabel } from "./event-aliases";

export type ParsedRow = {
  rowNumber: number;
  raw: Record<string, string>;
  parsed: {
    session_date: string | null;
    event: string | null;
    eventLabel: string | null;
    practice_type: string | null;
    num_solves: number | null;
    duration_minutes: number | null;
    avg_time: number | null;
    best_time: number | null;
    notes: string | null;
  };
  errors: string[];
  isValid: boolean;
};

/**
 * Practice type aliases — maps lowercase variations to canonical values.
 */
const PRACTICE_TYPE_ALIASES: Record<string, string> = {};

for (const pt of PRACTICE_TYPES) {
  PRACTICE_TYPE_ALIASES[pt.toLowerCase()] = pt;
}

// Extra aliases
PRACTICE_TYPE_ALIASES["drills"] = "Drill Algs";
PRACTICE_TYPE_ALIASES["algorithms"] = "Drill Algs";
PRACTICE_TYPE_ALIASES["slow"] = "Slow Solves";
PRACTICE_TYPE_ALIASES["comp sim"] = "Comp Sim";
PRACTICE_TYPE_ALIASES["competition sim"] = "Comp Sim";
PRACTICE_TYPE_ALIASES["comp simulation"] = "Comp Sim";
PRACTICE_TYPE_ALIASES["competition simulation"] = "Comp Sim";

/**
 * Validates a single CSV row and returns a ParsedRow with resolved values or errors.
 */
export function validateCsvRow(
  raw: Record<string, string>,
  rowNumber: number
): ParsedRow {
  const errors: string[] = [];

  // Date validation
  const dateResult = parseDate(raw.date ?? "");
  if (!dateResult) {
    errors.push(`Invalid date "${raw.date || "(empty)}"}"`);
  }

  // Event validation
  const eventId = resolveEventId(raw.event ?? "");
  if (!eventId) {
    errors.push(`Unknown event "${raw.event || "(empty)"}"`);
  }

  // Practice type validation — resolve known aliases, but accept any non-empty string as custom
  const practiceType = resolvePracticeType(raw.practice_type ?? "");
  if (!practiceType) {
    errors.push(`Practice type cannot be empty`);
  }

  // Num solves validation
  const numSolves = parsePositiveInt(raw.num_solves ?? "");
  if (numSolves === null) {
    errors.push(
      `Number of solves must be a positive whole number, got "${raw.num_solves || "(empty)"}"`
    );
  }

  // Duration minutes validation
  const durationMinutes = parsePositiveInt(raw.duration_minutes ?? "");
  if (durationMinutes === null) {
    errors.push(
      `Duration must be a positive whole number of minutes, got "${raw.duration_minutes || "(empty)"}"`
    );
  }

  // Avg time validation (optional)
  const avgTimeRaw = (raw.avg_time ?? "").trim();
  let avgTime: number | null = null;
  if (avgTimeRaw) {
    avgTime = parseTime(avgTimeRaw);
    if (avgTime === null) {
      errors.push(`Invalid average time "${avgTimeRaw}"`);
    }
  }

  // Best time validation (optional)
  const bestTimeRaw = (raw.best_time ?? "").trim();
  let bestTime: number | null = null;
  if (bestTimeRaw) {
    bestTime = parseTime(bestTimeRaw);
    if (bestTime === null) {
      errors.push(`Invalid best time "${bestTimeRaw}"`);
    }
  }

  // Notes (optional, no validation needed)
  const notes = (raw.notes ?? "").trim() || null;

  return {
    rowNumber,
    raw,
    parsed: {
      session_date: dateResult,
      event: eventId,
      eventLabel: eventId ? getEventLabel(eventId) : null,
      practice_type: practiceType,
      num_solves: numSolves,
      duration_minutes: durationMinutes,
      avg_time: avgTime,
      best_time: bestTime,
      notes,
    },
    errors,
    isValid: errors.length === 0,
  };
}

/**
 * Validates all rows and returns ParsedRow array.
 */
export function validateAllRows(
  rows: Record<string, string>[]
): ParsedRow[] {
  return rows.map((row, i) => validateCsvRow(row, i + 1));
}

/**
 * Parses a date string in multiple common formats.
 * Returns YYYY-MM-DD string or null if invalid.
 */
function parseDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return validateAndFormat(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]),
      parseInt(isoMatch[3])
    );
  }

  // Try MM/DD/YYYY or M/D/YYYY
  const usSlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usSlashMatch) {
    return validateAndFormat(
      parseInt(usSlashMatch[3]),
      parseInt(usSlashMatch[1]),
      parseInt(usSlashMatch[2])
    );
  }

  // Try MM-DD-YYYY
  const usDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (usDashMatch) {
    return validateAndFormat(
      parseInt(usDashMatch[3]),
      parseInt(usDashMatch[1]),
      parseInt(usDashMatch[2])
    );
  }

  return null;
}

function validateAndFormat(
  year: number,
  month: number,
  day: number
): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Check the date components match (catches things like Feb 30)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  // Don't allow future dates
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return null;

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function resolvePracticeType(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Try known aliases first, otherwise accept the raw input as a custom type
  return PRACTICE_TYPE_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

function parsePositiveInt(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

/**
 * Parses a time string — supports decimal seconds (12.34) and mm:ss.ms (1:23.45).
 * Returns decimal seconds or null if invalid.
 */
function parseTime(input: string): number | null {
  const trimmed = input.trim();

  // Try mm:ss.ms format (e.g., "1:23.45")
  const timeMatch = trimmed.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1]);
    const seconds = parseFloat(timeMatch[2]);
    if (seconds >= 60) return null;
    const total = minutes * 60 + seconds;
    return total > 0 ? Math.round(total * 100) / 100 : null;
  }

  // Try plain decimal seconds (e.g., "12.34" or "12.34s")
  const cleaned = trimmed.replace(/s$/i, "");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
}
