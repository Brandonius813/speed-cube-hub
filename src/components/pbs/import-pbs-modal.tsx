"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { FileSpreadsheet, LayoutList } from "lucide-react"
import { getPBTypesForEvent } from "@/lib/constants"
import { bulkImportPBs } from "@/lib/actions/personal-bests"
import { getTodayPacific } from "@/lib/utils"
import {
  parseTimeInput,
  parseMBLDScore,
} from "@/lib/pbs/parse-import"
import type { ImportRow, ParsedCSVRow } from "@/lib/pbs/parse-import"
import { ImportManualSection } from "@/components/pbs/import-manual-section"
import { ImportCSVSection } from "@/components/pbs/import-csv-section"

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
          <ImportManualSection
            rows={rows}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        )}

        {/* CSV mode */}
        {mode === "csv" && (
          <ImportCSVSection
            csvText={csvText}
            onCsvTextChange={setCsvText}
            csvParsed={csvParsed}
            onCsvParsedChange={setCsvParsed}
            error={error}
            onError={setError}
          />
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
