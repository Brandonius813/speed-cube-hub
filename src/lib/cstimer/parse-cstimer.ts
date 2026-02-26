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
  avg_time: number | null; // null if all DNFs
  best_time: number | null; // null if all DNFs
};

type ParsedSolve = {
  time: number | null; // null = bare DNF with no recorded time
  isDnf: boolean;
  date: string; // YYYY-MM-DD
};

export function parseCsTimerCsv(text: string): {
  sessions: CsTimerParsedSession[];
  totalSolves: number;
  errors: string[];
} {
  const errors: string[] = [];

  // Strip UTF-8 BOM
  const cleaned = text.replace(/^\uFEFF/, "");

  const lines = splitIntoRows(cleaned);

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

    // Parse time (extracts underlying time even from DNFs like "DNF(12.34)")
    const { time, isDnf } = parseSolveTime(rawTime);

    // Parse date
    const dateMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      errors.push(`Row ${i + 1}: invalid date "${rawDate}"`);
      continue;
    }

    const dateStr = dateMatch[1];

    solves.push({ time, isDnf, date: dateStr });
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

    const numDnf = daySolves.filter((s) => s.isDnf).length;

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
      avg_time: avgTime,
      best_time: bestTime,
    });
  }

  return { sessions, totalSolves: solves.length, errors };
}

/**
 * Parses a csTimer time value, returning both the time and whether it was a DNF.
 * DNFs with a recorded time (e.g. "DNF(12.34)") have their time extracted
 * so it can be included in averages.
 *
 * - "10.26"       → { time: 10.26, isDnf: false }
 * - "13.30+"      → { time: 13.30, isDnf: false }
 * - "DNF(12.34)"  → { time: 12.34, isDnf: true }
 * - "DNF"         → { time: null,  isDnf: true }
 */
function parseSolveTime(raw: string): { time: number | null; isDnf: boolean } {
  const trimmed = raw.trim();

  // DNF — could be "DNF" or "DNF(12.34)"
  if (trimmed.toUpperCase().startsWith("DNF")) {
    const match = trimmed.match(/DNF\(([^)]+)\)/i);
    if (match) {
      const time = parseTimeValue(match[1].trim());
      return { time, isDnf: true };
    }
    return { time: null, isDnf: true };
  }

  // Strip trailing "+" for +2 penalty (time already includes the penalty)
  const cleaned = trimmed.replace(/\+$/, "");
  return { time: parseTimeValue(cleaned), isDnf: false };
}

/** Parses a raw numeric time string (supports ss.cc and m:ss.cc formats). */
function parseTimeValue(raw: string): number | null {
  // Handle m:ss.cc format (e.g. "2:34.56" → 154.56 seconds)
  const colonMatch = raw.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (colonMatch) {
    const minutes = parseInt(colonMatch[1], 10);
    const seconds = parseFloat(colonMatch[2]);
    if (isNaN(minutes) || isNaN(seconds)) return null;
    const total = minutes * 60 + seconds;
    if (total <= 0) return null;
    return Math.round(total * 100) / 100;
  }

  const num = parseFloat(raw);
  if (isNaN(num) || num <= 0) return null;

  return Math.round(num * 100) / 100;
}

/**
 * Splits CSV text into logical rows, respecting quoted fields that may
 * contain newlines (e.g. megaminx scrambles span multiple lines).
 */
function splitIntoRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      if (current.trim()) rows.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) rows.push(current);
  return rows;
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
