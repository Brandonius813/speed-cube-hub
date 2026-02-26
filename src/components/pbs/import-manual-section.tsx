import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WCA_EVENTS, getPBTypesForEvent } from "@/lib/constants"
import { Plus, Trash2 } from "lucide-react"
import type { ImportRow } from "@/lib/pbs/parse-import"

export function ImportManualSection({
  rows,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: {
  rows: ImportRow[]
  onUpdateRow: (id: number, field: keyof ImportRow, value: string) => void
  onAddRow: () => void
  onRemoveRow: (id: number) => void
}) {
  return (
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
            onValueChange={(v) => onUpdateRow(row.id, "event", v)}
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
            onValueChange={(v) => onUpdateRow(row.id, "pbType", v)}
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
              onChange={(e) => onUpdateRow(row.id, "mbldScore", e.target.value)}
              className="font-mono min-h-11 sm:min-h-9"
            />
          )}

          <Input
            type="text"
            placeholder={row.event === "333mbf" ? "19:31" : "10.32"}
            value={row.time}
            onChange={(e) => onUpdateRow(row.id, "time", e.target.value)}
            className="font-mono min-h-11 sm:min-h-9"
          />

          <Input
            type="date"
            value={row.date}
            onChange={(e) => onUpdateRow(row.id, "date", e.target.value)}
            className="min-h-11 sm:min-h-9"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemoveRow(row.id)}
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
        onClick={onAddRow}
        className="gap-1.5 self-start min-h-11 sm:min-h-9"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Row
      </Button>
    </div>
  )
}
