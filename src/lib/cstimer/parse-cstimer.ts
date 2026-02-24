/**
 * Parses a csTimer CSV export (semicolon-delimited) and groups individual
 * solves into per-day session summaries for import into Speed Cube Hub.
 *
 * csTimer export format:
 *   No.;Time;Comment;Scramble;Date;P.1
 *   1;10.26;;L F2 U' B2...;2026-02-03 07:59:41;10.26
 *   3;13.30+;;D2 R' D2...;2026-02-03 08:03:24;11.30
 *
 * Time column:  "10.26" (normal), "13.30+" (+2 penalty), "DNF(12.34)" or "DNF" (did not finish)
 * P.1 column:   base time without penalty (not used — we read Time directly)
 */

export type CsTimerParsedSession = {
  session_date: string; // YYYY-MM-DD
  num_solves: number;
  num_dnf: number;
  duration_minutes: number;
  avg_time: number | null; // null if all DNFs
  best_time: number | null; // null if all DNFs
};

type ParsedSolve = {
  time: number | null; // null = DNF
  date: string; // YYYY-MM-DD
  timestamp: Date;
};

export function parseCsTimerCsv(text: string): {
  sessions: CsTimerParsedSession[];
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

  // Validate header row
  const headerLine = lines[0];
  const headers = headerLine.split(";").map((h) => h.trim().toLowerCase());

  const timeIdx = headers.indexOf("time");
  const dateIdx = headers.indexOf("date");

  if (timeIdx === -1 || dateIdx === -1) {
    return {
      sessions: [],
      totalSolves: 0,
      errors: [
        'This doesn\'t look like a csTimer export. Expected "Time" and "Date" columns separated by semicolons.',
      ],
    };
  }

  // Parse each solve row
  const solves: ParsedSolve[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = splitSemicolonLine(lines[i]);

    const rawTime = (fields[timeIdx] ?? "").trim();
    const rawDate = (fields[dateIdx] ?? "").trim();

    if (!rawTime || !rawDate) continue;

    // Parse time
    const time = parseSolveTime(rawTime);

    // Parse date
    const dateMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      errors.push(`Row ${i + 1}: invalid date "${rawDate}"`);
      continue;
    }

    const dateStr = dateMatch[1];
    const timestamp = new Date(rawDate.replace(" ", "T"));

    if (isNaN(timestamp.getTime())) {
      errors.push(`Row ${i + 1}: could not parse timestamp "${rawDate}"`);
      continue;
    }

    solves.push({ time, date: dateStr, timestamp });
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
  const sessions: CsTimerParsedSession[] = [];
  const sortedDates = [...grouped.keys()].sort();

  for (const date of sortedDates) {
    const daySolves = grouped.get(date)!;
    const validTimes = daySolves
      .map((s) => s.time)
      .filter((t): t is number => t !== null);

    const numDnf = daySolves.length - validTimes.length;

    // Duration: difference between first and last solve timestamp
    const timestamps = daySolves.map((s) => s.timestamp.getTime()).sort((a, b) => a - b);
    const durationMs = timestamps[timestamps.length - 1] - timestamps[0];
    const durationMinutes = Math.max(1, Math.ceil(durationMs / 60000));

    // Averages
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
      duration_minutes: durationMinutes,
      avg_time: avgTime,
      best_time: bestTime,
    });
  }

  return { sessions, totalSolves: solves.length, errors };
}

/**
 * Parses a csTimer time value.
 * - "10.26"       → 10.26
 * - "13.30+"      → 13.30  (+2 penalty already included)
 * - "DNF(12.34)"  → null   (DNF)
 * - "DNF"         → null   (DNF)
 */
function parseSolveTime(raw: string): number | null {
  const trimmed = raw.trim();

  // DNF — could be "DNF" or "DNF(12.34)"
  if (trimmed.toUpperCase().startsWith("DNF")) {
    return null;
  }

  // Strip trailing "+" for +2 penalty (time already includes the penalty)
  const cleaned = trimmed.replace(/\+$/, "");

  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;

  return Math.round(num * 100) / 100;
}

/**
 * Splits a semicolon-delimited line, respecting quoted fields.
 */
function splitSemicolonLine(line: string): string[] {
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
      } else if (char === ";") {
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
