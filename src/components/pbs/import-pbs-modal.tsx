"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Trash2 } from "lucide-react"

type ImportRow = {
  id: number
  event: string
  pbType: string
  time: string
  date: string
}

function getTodayPacific(): string {
  const now = new Date()
  const pacific = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  )
  const y = pacific.getFullYear()
  const m = String(pacific.getMonth() + 1).padStart(2, "0")
  const d = String(pacific.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseTimeInput(value: string): number | null {
  if (!value.trim()) return null
  if (!value.includes(":")) {
    const num = Number(value)
    return !isNaN(num) && num > 0 ? num : null
  }
  const parts = value.split(":")
  if (parts.length !== 2) return null
  const minutes = Number(parts[0])
  const seconds = Number(parts[1])
  if (isNaN(minutes) || isNaN(seconds)) return null
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null
  const total = minutes * 60 + seconds
  return total > 0 ? total : null
}

let nextId = 1

function createEmptyRow(): ImportRow {
  return { id: nextId++, event: "", pbType: "", time: "", date: getTodayPacific() }
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
  const [rows, setRows] = useState<ImportRow[]>(() => [
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function resetForm() {
    nextId = 1
    setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()])
    setError(null)
    setResult(null)
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) resetForm()
    onOpenChange(newOpen)
  }

  function updateRow(id: number, field: keyof ImportRow, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }
        // Reset PB type if event changes and the type is no longer valid
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

  // Check if a row has any data entered
  function rowHasData(row: ImportRow): boolean {
    return !!(row.event || row.pbType || row.time)
  }

  async function handleImport() {
    setError(null)
    setResult(null)

    // Only process rows that have data
    const filledRows = rows.filter(rowHasData)

    if (filledRows.length === 0) {
      setError("Add at least one PB to import.")
      return
    }

    // Validate and parse each row
    const entries: {
      event: string
      pb_type: string
      time_seconds: number
      date_achieved: string
    }[] = []

    for (let i = 0; i < filledRows.length; i++) {
      const row = filledRows[i]
      if (!row.event) {
        setError(`Row ${i + 1}: Select an event.`)
        return
      }
      if (!row.pbType) {
        setError(`Row ${i + 1}: Select a PB type.`)
        return
      }
      const parsed = parseTimeInput(row.time)
      if (parsed === null) {
        setError(`Row ${i + 1}: Enter a valid time (e.g., "10.32" or "1:23.45").`)
        return
      }
      if (!row.date) {
        setError(`Row ${i + 1}: Enter a date.`)
        return
      }
      entries.push({
        event: row.event,
        pb_type: row.pbType,
        time_seconds: parsed,
        date_achieved: row.date,
      })
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import PBs</DialogTitle>
          <DialogDescription>
            Add multiple personal bests at once. Fill in each row and click Import All.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Column headers - desktop only */}
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
              {/* Mobile label */}
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

              <Input
                type="text"
                placeholder="10.32"
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
            disabled={submitting}
            className="flex-1 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? "Importing..." : "Import All"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
