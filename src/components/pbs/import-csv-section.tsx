import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileSpreadsheet, Download } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import type { ParsedCSVRow } from "@/lib/pbs/parse-import"
import { parseCSVText } from "@/lib/pbs/parse-import"

function getEventLabel(id: string) {
  return WCA_EVENTS.find((e) => e.id === id)?.label || id
}

export function ImportCSVSection({
  csvText,
  onCsvTextChange,
  csvParsed,
  onCsvParsedChange,
  error,
  onError,
}: {
  csvText: string
  onCsvTextChange: (text: string) => void
  csvParsed: ParsedCSVRow[] | null
  onCsvParsedChange: (parsed: ParsedCSVRow[] | null) => void
  error: string | null
  onError: (error: string | null) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleParseCSV() {
    onError(null)
    const parsed = parseCSVText(csvText)
    if (parsed.length === 0) {
      onError("No data found. Paste CSV rows with: Event, PB Type, Time, Date (optional)")
      return
    }
    onCsvParsedChange(parsed)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      onCsvTextChange(text)
      onError(null)
      onCsvParsedChange(null)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
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
            onCsvTextChange(e.target.value)
            onCsvParsedChange(null)
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
  )
}
