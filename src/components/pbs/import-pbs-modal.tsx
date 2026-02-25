"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WCA_EVENTS, getPBTypesForEvent } from "@/lib/constants"
import { bulkImportPBs } from "@/lib/actions/personal-bests"
import { getTodayPacific } from "@/lib/utils"
import { Plus, Trash2, FileSpreadsheet, LayoutList, Download } from "lucide-react"

// ── Types ──

type ImportRow = {
  id: number
  event: string
  pbType: string
  time: string
  date: string
  mbldScore: string  // "4/5" format for Multi-BLD
}

type ParsedCSVRow = {
  event: string      // resolved event ID
  eventRaw: string   // original text from CSV
  pbType: string
  time: string
  date: string
  mbldScore: string  // "4/5" parsed from CSV for Multi-BLD
  error?: string
}

// ── Helpers ──

function parseTimeInput(value: string): number | null {
  if (!value.trim()) return null
  if (!value.includes(":")) {
    const num = Number(value)
    return !isNaN(num) && num > 0 ? num : null
  }
  const parts = value.split(":")
  // H:MM:SS format
  if (parts.length === 3) {
    const hours = Number(parts[0])
    const minutes = Number(parts[1])
    const seconds = Number(parts[2])
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null
    const total = hours * 3600 + minutes * 60 + seconds
    return total > 0 ? total : null
  }
  // MM:SS or MM:SS.XX format
  if (parts.length !== 2) return null
  const minutes = Number(parts[0])
  const seconds = Number(parts[1])
  if (isNaN(minutes) || isNaN(seconds)) return null
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null
  const total = minutes * 60 + seconds
  return total > 0 ? total : null
}

/**
 * Parse an MBLD score string like "4/5" into { solved, attempted }.
 */
function parseMBLDScore(value: string): { solved: number; attempted: number } | null {
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!match) return null
  const solved = Number(match[1])
  const attempted = Number(match[2])
  if (solved < 1 || attempted < 2 || solved > attempted) return null
  return { solved, attempted }
}

/**
 * Fuzzy-match an event name string to a WCA event ID.
 * Accepts: "3x3", "333", "3x3x3", "3x3 BLD", "megaminx", "OH", etc.
 */
function resolveEventId(raw: string): string | null {
  const input = raw.trim().toLowerCase()
  if (!input) return null

  // Direct ID match (e.g. "333", "333bf", "sq1")
  const directId = WCA_EVENTS.find((e) => e.id.toLowerCase() === input)
  if (directId) return directId.id

  // Label match (e.g. "3x3", "3x3 BLD", "Megaminx")
  const labelMatch = WCA_EVENTS.find((e) => e.label.toLowerCase() === input)
  if (labelMatch) return labelMatch.id

  // Common aliases
  const aliases: Record<string, string> = {
    "2x2x2": "222",
    "3x3x3": "333",
    "4x4x4": "444",
    "5x5x5": "555",
    "6x6x6": "666",
    "7x7x7": "777",
    "3bld": "333bf",
    "3x3 blind": "333bf",
    "3x3 blindfolded": "333bf",
    "4bld": "444bf",
    "4x4 bld": "444bf",
    "4x4 blind": "444bf",
    "4x4 blindfolded": "444bf",
    "5bld": "555bf",
    "5x5 bld": "555bf",
    "5x5 blind": "555bf",
    "5x5 blindfolded": "555bf",
    "mbld": "333mbf",
    "multi bld": "333mbf",
    "multi-blind": "333mbf",
    "multi blind": "333mbf",
    "multiblind": "333mbf",
    "one-handed": "333oh",
    "one handed": "333oh",
    "3x3 oh": "333oh",
    "3oh": "333oh",
    "mega": "minx",
    "megaminx": "minx",
    "pyra": "pyram",
    "pyraminx": "pyram",
    "square-1": "sq1",
    "square 1": "sq1",
    "squan": "sq1",
    "fmc": "333fm",
    "fewest moves": "333fm",
  }

  return aliases[input] ?? null
}

/**
 * Fuzzy-match a PB type string.
 * Accepts: "single", "ao5", "Ao12", "mo3", etc.
 */
function resolvePBType(raw: string): string | null {
  const input = raw.trim().toLowerCase()
  if (!input) return null

  const typeMap: Record<string, string> = {
    single: "Single",
    ao5: "Ao5",
    ao12: "Ao12",
    ao25: "Ao25",
    ao50: "Ao50",
    ao100: "Ao100",
    ao200: "Ao200",
    ao1000: "Ao1000",
    mo3: "Mo3",
  }

  return typeMap[input] ?? null
}

/**
 * Parse a date string flexibly. Accepts:
 * - YYYY-MM-DD
 * - MM/DD/YYYY
 * - M/D/YYYY
 */
function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-")
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // MM/DD/YYYY or M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [m, d, y] = trimmed.split("/")
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  return null
}

function parseCSVText(text: string): ParsedCSVRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim())
  if (lines.length === 0) return []

  // Check if the first line is a header row
  const firstLine = lines[0].toLowerCase()
  const startsWithHeader =
    firstLine.includes("event") || firstLine.includes("type") || firstLine.includes("time")
  const dataLines = startsWithHeader ? lines.slice(1) : lines

  return dataLines.map((line) => {
    // Split by comma or tab
    const parts = line.split(/[,\t]/).map((p) => p.trim())

    if (parts.length < 3) {
      return {
        event: "",
        eventRaw: parts[0] || "",
        pbType: "",
        time: "",
        date: getTodayPacific(),
        mbldScore: "",
        error: "Need at least 3 columns: Event, PB Type, Time",
      }
    }

    const eventId = resolveEventId(parts[0])
    const pbType = resolvePBType(parts[1])
    const isMBLD = eventId === "333mbf"

    const errors: string[] = []
    if (!eventId) errors.push(`Unknown event "${parts[0]}"`)
    if (!pbType) errors.push(`Unknown PB type "${parts[1]}"`)

    let time: string
    let date: string | null
    let mbldScore = ""

    if (isMBLD) {
      // MBLD format: Event, Type, Score (4/5), Time (19:31), Date
      mbldScore = parts[2]
      time = parts[3] || ""
      date = parts[4] ? parseDateInput(parts[4]) : getTodayPacific()

      const score = parseMBLDScore(mbldScore)
      if (!score) errors.push(`Invalid MBLD score "${parts[2]}" (use solved/attempted, e.g. "4/5")`)
      if (!time) {
        errors.push("Time is required for Multi-BLD")
      } else if (parseTimeInput(time) === null) {
        errors.push(`Invalid time "${parts[3]}"`)
      }
      if (parts[4] && !date) errors.push(`Invalid date "${parts[4]}"`)
    } else {
      // Standard format: Event, Type, Time, Date
      time = parts[2]
      date = parts[3] ? parseDateInput(parts[3]) : getTodayPacific()

      if (parseTimeInput(time) === null) errors.push(`Invalid time "${parts[2]}"`)
      if (parts[3] && !date) errors.push(`Invalid date "${parts[3]}"`)
    }

    // Validate PB type is valid for this event
    if (eventId && pbType) {
      const validTypes = getPBTypesForEvent(eventId)
      if (!validTypes.includes(pbType)) {
        errors.push(`${pbType} is not valid for ${parts[0]}`)
      }
    }

    return {
      event: eventId || "",
      eventRaw: parts[0],
      pbType: pbType || "",
      time,
      date: date || getTodayPacific(),
      mbldScore,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    }
  })
}

// ── Component ──

let nextId = 1

function createEmptyRow(): ImportRow {
  return { id: nextId++, event: "", pbType: "", time: "", date: getTodayPacific(), mbldScore: "" }
}

export function ImportPBsModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<"manual" | "csv">("manual")
  const [rows, setRows] = useState<ImportRow[]>(() => [
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ])
  const [csvText, setCsvText] = useState("")
  const [csvParsed, setCsvParsed] = useState<ParsedCSVRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    nextId = 1
    setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()])
    setCsvText("")
    setCsvParsed(null)
    setError(null)
    setResult(null)
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setMode("manual")
      resetForm()
    }
    onOpenChange(newOpen)
  }

  // ── Manual mode handlers ──

  function updateRow(id: number, field: keyof ImportRow, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }
        if (field === "event" && updated.pbType) {
          const validTypes = getPBTypesForEvent(value)
          if (!validTypes.includes(updated.pbType)) {
            updated.pbType = ""
          }
        }
        return updated
      })
    )
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()])
  }

  function removeRow(id: number) {
    setRows((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((r) => r.id !== id)
    })
  }

  function rowHasData(row: ImportRow): boolean {
    return !!(row.event || row.pbType || row.time)
  }

  // ── CSV mode handlers ──

  function handleParseCSV() {
    setError(null)
    const parsed = parseCSVText(csvText)
    if (parsed.length === 0) {
      setError("No data found. Paste CSV rows with: Event, PB Type, Time, Date (optional)")
      return
    }
    setCsvParsed(parsed)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      setError(null)
      setCsvParsed(null)
    }
    reader.readAsText(file)

    // Reset the input so the same file can be re-selected
    e.target.value = ""
  }

  // ── Shared import handler ──

  async function handleImport() {
    setError(null)
    setResult(null)

    let entries: {
      event: string
      pb_type: string
      time_seconds: number
      date_achieved: string
      mbld_solved?: number
      mbld_attempted?: number
    }[] = []

    if (mode === "manual") {
      const filledRows = rows.filter(rowHasData)
      if (filledRows.length === 0) {
        setError("Add at least one PB to import.")
        return
      }

      for (let i = 0; i < filledRows.length; i++) {
        const row = filledRows[i]
        if (!row.event) { setError(`Row ${i + 1}: Select an event.`); return }
        if (!row.pbType) { setError(`Row ${i + 1}: Select a PB type.`); return }

        const isMBLD = row.event === "333mbf"
        if (isMBLD) {
          const score = parseMBLDScore(row.mbldScore)
          if (!score) {
            setError(`Row ${i + 1}: Enter a valid MBLD score (e.g., "4/5").`)
            return
          }
          const parsed = parseTimeInput(row.time)
          if (parsed === null) {
            setError(`Row ${i + 1}: Enter a valid time (e.g., "19:31" or "1:05:30").`)
            return
          }
          if (!row.date) { setError(`Row ${i + 1}: Enter a date.`); return }
          entries.push({
            event: row.event,
            pb_type: row.pbType,
            time_seconds: parsed,
            date_achieved: row.date,
            mbld_solved: score.solved,
            mbld_attempted: score.attempted,
          })
        } else {
          const parsed = parseTimeInput(row.time)
          if (parsed === null) {
            setError(`Row ${i + 1}: Enter a valid time (e.g., "10.32" or "1:23.45").`)
            return
          }
          if (!row.date) { setError(`Row ${i + 1}: Enter a date.`); return }
          entries.push({
            event: row.event,
            pb_type: row.pbType,
            time_seconds: parsed,
            date_achieved: row.date,
          })
        }
      }
    } else {
      // CSV mode — use parsed rows
      if (!csvParsed || csvParsed.length === 0) {
        setError("Parse your CSV first before importing.")
        return
      }

      const rowsWithErrors = csvParsed.filter((r) => r.error)
      if (rowsWithErrors.length > 0) {
        setError(`Fix ${rowsWithErrors.length} row(s) with errors before importing.`)
        return
      }

      for (const row of csvParsed) {
        const parsed = parseTimeInput(row.time)
        if (parsed === null) continue

        const isMBLD = row.event === "333mbf"
        if (isMBLD) {
          const score = parseMBLDScore(row.mbldScore)
          if (!score) continue
          entries.push({
            event: row.event,
            pb_type: row.pbType,
            time_seconds: parsed,
            date_achieved: row.date,
            mbld_solved: score.solved,
            mbld_attempted: score.attempted,
          })
        } else {
          entries.push({
            event: row.event,
            pb_type: row.pbType,
            time_seconds: parsed,
            date_achieved: row.date,
          })
        }
      }

      if (entries.length === 0) {
        setError("No valid rows to import.")
        return
      }
    }

    setSubmitting(true)
    const res = await bulkImportPBs(entries)
    setSubmitting(false)

    if (!res.success) {
      setError(res.error ?? "Import failed.")
      return
    }

    setResult(`Imported ${res.imported} PB${res.imported === 1 ? "" : "s"} successfully!`)
    setTimeout(() => {
      onOpenChange(false)
      onSaved()
    }, 1200)
  }

  // ── Render ──

  const getEventLabel = (id: string) =>
    WCA_EVENTS.find((e) => e.id === id)?.label || id

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import PBs</DialogTitle>
          <DialogDescription>
            Add multiple personal bests at once using the form or by pasting CSV data.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          <button
            onClick={() => { setMode("manual"); setError(null); setResult(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition min-h-11 sm:min-h-9 ${
              mode === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="h-4 w-4" />
            Manual
          </button>
          <button
            onClick={() => { setMode("csv"); setError(null); setResult(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition min-h-11 sm:min-h-9 ${
              mode === "csv"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </button>
        </div>

        {/* Manual mode */}
        {mode === "manual" && (
          <div className="flex flex-col gap-3">
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Event</span>
              <span>PB Type</span>
              <span>Time</span>
              <span>Date</span>
              <span className="w-8" />
            </div>

            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto] sm:gap-2 rounded-lg border border-border/50 p-3 sm:border-0 sm:p-0"
              >
                <span className="text-xs font-medium text-muted-foreground sm:hidden">
                  PB #{idx + 1}
                </span>

                <Select
                  value={row.event}
                  onValueChange={(v) => updateRow(row.id, "event", v)}
                >
                  <SelectTrigger className="min-h-11 sm:min-h-9">
                    <SelectValue placeholder="Event" />
                  </SelectTrigger>
                  <SelectContent>
                    {WCA_EVENTS.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={row.pbType}
                  onValueChange={(v) => updateRow(row.id, "pbType", v)}
                  disabled={!row.event}
                >
                  <SelectTrigger className="min-h-11 sm:min-h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(row.event ? getPBTypesForEvent(row.event) : []).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {row.event === "333mbf" && (
                  <Input
                    type="text"
                    placeholder="4/5"
                    value={row.mbldScore}
                    onChange={(e) => updateRow(row.id, "mbldScore", e.target.value)}
                    className="font-mono min-h-11 sm:min-h-9"
                  />
                )}

                <Input
                  type="text"
                  placeholder={row.event === "333mbf" ? "19:31" : "10.32"}
                  value={row.time}
                  onChange={(e) => updateRow(row.id, "time", e.target.value)}
                  className="font-mono min-h-11 sm:min-h-9"
                />

                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.id, "date", e.target.value)}
                  className="min-h-11 sm:min-h-9"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 text-muted-foreground hover:text-destructive self-end sm:self-auto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="gap-1.5 self-start min-h-11 sm:min-h-9"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </Button>
          </div>
        )}

        {/* CSV mode */}
        {mode === "csv" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Paste CSV or upload a file. Columns: Event, PB Type, Time, Date (optional).
                For Multi-BLD: Event, PB Type, Score (4/5), Time (19:31), Date.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="/pb-import-template.csv"
                  download="pb-import-template.csv"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-secondary min-h-11 sm:min-h-9"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Template
                </a>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 min-h-11 sm:min-h-9"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Upload File
                  </Button>
                </div>
              </div>

              <Textarea
                placeholder={`3x3, Single, 7.82, 2025-01-15\n3x3, Ao5, 9.45, 2025-01-15\n4x4, Single, 32.10\nMulti-BLD, Single, 4/4, 19:31, 2018-10-31`}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value)
                  setCsvParsed(null)
                }}
                rows={6}
                className="font-mono text-sm"
              />

              <Button
                type="button"
                variant="outline"
                onClick={handleParseCSV}
                disabled={!csvText.trim()}
                className="self-start min-h-11 sm:min-h-9"
              >
                Preview Import
              </Button>
            </div>

            {/* Parsed preview */}
            {csvParsed && csvParsed.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">
                  Preview ({csvParsed.length} row{csvParsed.length !== 1 ? "s" : ""})
                </p>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Event</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Score</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvParsed.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-border/30 last:border-0 ${
                            row.error ? "bg-destructive/10" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2">
                            {row.event ? getEventLabel(row.event) : row.eventRaw}
                          </td>
                          <td className="px-3 py-2">{row.pbType || "—"}</td>
                          <td className="px-3 py-2 font-mono">{row.mbldScore || "—"}</td>
                          <td className="px-3 py-2 font-mono">{row.time || "—"}</td>
                          <td className="px-3 py-2 font-mono">{row.date}</td>
                          <td className="px-3 py-2">
                            {row.error ? (
                              <span className="text-xs text-destructive">{row.error}</span>
                            ) : (
                              <span className="text-xs text-green-500">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-green-500">{result}</p>}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={submitting || (mode === "csv" && !csvParsed)}
            className="flex-1 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? "Importing..." : "Import All"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
