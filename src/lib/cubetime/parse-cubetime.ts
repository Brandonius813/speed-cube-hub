import { toDateStringPacific } from "@/lib/utils"

/**
 * Parses a CubeTime (iOS timer app) CSV export and groups individual
 * solves into per-day session summaries for import into Speed Cube Hub.
 *
 * CubeTime export format (comma-delimited):
 *   Time,Comment,Scramble,Date
 *   9.632094025611877,"",D U2 B2 L2...,2024-12-12 20:39:49 +0000
 *
 * Time column:  Raw decimal seconds (e.g., 9.632094025611877)
 *               May also contain "DNF" for did-not-finish solves
 * Date column:  ISO-ish format with timezone offset (2024-12-12 20:39:49 +0000)
 *
 * IMPORTANT: Dates are converted to Pacific Time (America/Los_Angeles) so that
 * solves are grouped by the user's local day, not UTC day.
 */

export type CubeTimeParsedSession = {
  session_date: string; // YYYY-MM-DD
  num_solves: number;
  num_dnf: number;
  avg_time: number | null; // null if all DNFs
  best_time: number | null; // null if all DNFs
};

type ParsedSolve = {
  time: number | null; // null = DNF
  date: string; // YYYY-MM-DD
};

export function parseCubeTimeCsv(text: string): {
  sessions: CubeTimeParsedSession[];
  totalSolves: number;
  errors: string[];
} {
  const errors: string[] = [];

  // Strip UTF-8 BOM
  const cleaned = text.replace(/^\uFEFF/, "");

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length === 0) {
    return { sessions: [], totalSolves: 0, errors: ["The file is empty."] };
  }

  // Parse header row
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  const timeIdx = headers.indexOf("time");
  const dateIdx = headers.indexOf("date");

  if (timeIdx === -1 || dateIdx === -1) {
    return {
      sessions: [],
      totalSolves: 0,
      errors: [
        'This doesn\'t look like a CubeTime export. Expected "Time" and "Date" columns.',
      ],
    };
  }

  // Parse each solve row.
  // Time is always the first field, Date is always the last field.
  // We use first/last instead of header indices for data rows because
  // the Scramble column can contain unquoted commas (e.g., Square-1
  // notation like "(0,2)") which would shift field indices.
  const solves: ParsedSolve[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    if (fields.length < 2) continue;

    const rawTime = fields[0].trim();
    const rawDate = fields[fields.length - 1].trim();

    if (!rawTime || !rawDate) continue;

    // Parse time
    const time = parseSolveTime(rawTime);

    // Parse date — format: "2024-12-12 20:39:49 +0000"
    // Convert full timestamp to Pacific Time so solves group by the user's local day
    const dateMatch = rawDate.match(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*([+-]\d{4})?/
    );
    if (!dateMatch) {
      errors.push(`Row ${i + 1}: invalid date "${rawDate}"`);
      continue;
    }

    let dateStr: string;
    if (dateMatch[2] && dateMatch[3]) {
      // Full timestamp with timezone — convert to Pacific
      const isoStr = `${dateMatch[1]}T${dateMatch[2]}${dateMatch[3].slice(0, 3)}:${dateMatch[3].slice(3)}`;
      const parsed = new Date(isoStr);
      dateStr = isNaN(parsed.getTime()) ? dateMatch[1] : toDateStringPacific(parsed);
    } else {
      // Fallback: just the date portion
      dateStr = dateMatch[1];
    }

    solves.push({ time, date: dateStr });
  }

  if (solves.length === 0) {
    return {
      sessions: [],
      totalSolves: 0,
      errors: errors.length > 0 ? errors : ["No valid solves found in file."],
    };
  }

  // Group solves by date
  const grouped = new Map<string, ParsedSolve[]>();
  for (const solve of solves) {
    const existing = grouped.get(solve.date);
    if (existing) {
      existing.push(solve);
    } else {
      grouped.set(solve.date, [solve]);
    }
  }

  // Build session summaries, sorted by date ascending
  const sessions: CubeTimeParsedSession[] = [];
  const sortedDates = [...grouped.keys()].sort();

  for (const date of sortedDates) {
    const daySolves = grouped.get(date)!;
    const validTimes = daySolves
      .map((s) => s.time)
      .filter((t): t is number => t !== null);

    const numDnf = daySolves.length - validTimes.length;

    const avgTime =
      validTimes.length > 0
        ? Math.round(
            (validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length) *
              100
          ) / 100
        : null;

    const bestTime =
      validTimes.length > 0
        ? Math.round(Math.min(...validTimes) * 100) / 100
        : null;

    sessions.push({
      session_date: date,
      num_solves: daySolves.length,
      num_dnf: numDnf,
      avg_time: avgTime,
      best_time: bestTime,
    });
  }

  return { sessions, totalSolves: solves.length, errors };
}

/**
 * Parses a CubeTime time value.
 * - "9.632094025611877" → 9.63  (rounded to centiseconds)
 * - "DNF"               → null
 * - empty/invalid       → null
 */
function parseSolveTime(raw: string): number | null {
  const trimmed = raw.trim();

  if (trimmed.toUpperCase() === "DNF" || trimmed.toUpperCase().startsWith("DNF")) {
    return null;
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return null;

  return Math.round(num * 100) / 100;
}

/**
 * Splits a comma-delimited CSV line, respecting quoted fields.
 * CubeTime wraps the Comment field in quotes and the Scramble field
 * can contain commas that are NOT inside quotes — but fortunately the
 * column order is fixed (Time, Comment, Scramble, Date) and the Date
 * column is always at the end with a recognizable format.
 *
 * Strategy: parse Time and Comment normally (they won't have unquoted
 * commas), then grab Date from the end, and everything in between is
 * the Scramble.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}
