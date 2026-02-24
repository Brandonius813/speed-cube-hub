/**
 * Header aliases — maps common CSV header variations to our canonical field names.
 */
const HEADER_MAP: Record<string, string> = {
  date: "date",
  session_date: "date",
  "session date": "date",
  event: "event",
  puzzle: "event",
  practice_type: "practice_type",
  "practice type": "practice_type",
  type: "practice_type",
  num_solves: "num_solves",
  "num solves": "num_solves",
  solves: "num_solves",
  "number of solves": "num_solves",
  duration_minutes: "duration_minutes",
  "duration minutes": "duration_minutes",
  duration: "duration_minutes",
  minutes: "duration_minutes",
  "time practiced": "duration_minutes",
  avg_time: "avg_time",
  "avg time": "avg_time",
  average: "avg_time",
  "result average": "avg_time",
  avg: "avg_time",
  best_time: "best_time",
  "best time": "best_time",
  best: "best_time",
  "best single": "best_time",
  single: "best_time",
  notes: "notes",
};

const REQUIRED_FIELDS = ["date", "event", "practice_type", "num_solves", "duration_minutes"];

export type CsvParseResult = {
  rows: Record<string, string>[];
  errors: string[];
};

/**
 * Parses a CSV string into an array of row objects keyed by canonical field names.
 * Handles quoted fields, BOM stripping, and flexible header matching.
 */
export function parseCsv(text: string): CsvParseResult {
  const errors: string[] = [];

  // Strip UTF-8 BOM (Excel adds this)
  const cleaned = text.replace(/^\uFEFF/, "");

  const lines = splitCsvLines(cleaned);

  if (lines.length === 0) {
    return { rows: [], errors: ["The CSV file is empty."] };
  }

  // Parse header row
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => {
    const normalized = h.trim().toLowerCase();
    return HEADER_MAP[normalized] ?? null;
  });

  // Check for required columns
  const foundFields = new Set(headers.filter(Boolean));
  const missingFields = REQUIRED_FIELDS.filter((f) => !foundFields.has(f));

  if (missingFields.length > 0) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missingFields.join(", ")}. Expected: date, event, practice_type, num_solves, duration_minutes`],
    };
  }

  // Parse data rows
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip blank lines

    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      const field = headers[j];
      if (field) {
        row[field] = (values[j] ?? "").trim();
      }
    }

    rows.push(row);
  }

  if (rows.length === 0) {
    errors.push("The CSV file has headers but no data rows.");
  }

  if (rows.length > 500) {
    errors.push(`CSV has ${rows.length} rows. Maximum is 500 rows per import.`);
  }

  return { rows, errors };
}

/**
 * Splits CSV text into lines, respecting quoted fields that contain newlines.
 */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++; // skip \r\n
      lines.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parses a single CSV line into an array of field values.
 * Handles quoted fields with escaped quotes ("").
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
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
