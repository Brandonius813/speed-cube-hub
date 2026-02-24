"use client";

import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleX } from "lucide-react";
import type { ParsedRow } from "@/lib/csv/validate-csv-row";
import { formatDuration } from "@/lib/utils";

const MAX_PREVIEW_ROWS = 50;

type CsvPreviewTableProps = {
  rows: ParsedRow[];
};

export function CsvPreviewTable({ rows }: CsvPreviewTableProps) {
  const displayRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const hasMore = rows.length > MAX_PREVIEW_ROWS;

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile card layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {displayRows.map((row) => (
          <MobileCard key={row.rowNumber} row={row} />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="pb-3 pr-3 text-left text-sm font-medium text-muted-foreground">
                #
              </th>
              <th className="pb-3 pr-3 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="pb-3 pr-3 text-left text-sm font-medium text-muted-foreground">
                Date
              </th>
              <th className="pb-3 pr-3 text-left text-sm font-medium text-muted-foreground">
                Event
              </th>
              <th className="pb-3 pr-3 text-left text-sm font-medium text-muted-foreground">
                Type
              </th>
              <th className="pb-3 pr-3 text-right text-sm font-medium text-muted-foreground">
                Solves
              </th>
              <th className="pb-3 pr-3 text-right text-sm font-medium text-muted-foreground">
                Duration
              </th>
              <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                Avg Time
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <DesktopRow key={row.rowNumber} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <p className="text-center text-xs text-muted-foreground">
          Showing first {MAX_PREVIEW_ROWS} of {rows.length} rows
        </p>
      )}
    </div>
  );
}

function MobileCard({ row }: { row: ParsedRow }) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        row.isValid
          ? "border-border/30 bg-secondary/30"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            {row.isValid ? (
              <CircleCheck className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <CircleX className="h-4 w-4 shrink-0 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">
              Row {row.rowNumber}
            </span>
            {row.parsed.eventLabel && (
              <Badge variant="outline" className="text-xs">
                {row.parsed.eventLabel}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{row.parsed.session_date ?? row.raw.date ?? "--"}</span>
            <span>{row.parsed.practice_type ?? row.raw.practice_type ?? "--"}</span>
            <span>{row.parsed.num_solves ?? row.raw.num_solves ?? "--"} solves</span>
            <span>{row.parsed.duration_minutes != null ? formatDuration(row.parsed.duration_minutes) : `${row.raw.duration_minutes ?? "--"}m`}</span>
          </div>
        </div>
        {row.parsed.avg_time !== null && row.parsed.avg_time !== undefined && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-sm font-semibold text-foreground">
              {row.parsed.avg_time.toFixed(2)}s
            </div>
          </div>
        )}
      </div>
      {!row.isValid && (
        <div className="mt-2 flex flex-col gap-1">
          {row.errors.map((err, i) => (
            <p key={i} className="text-xs text-destructive">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopRow({ row }: { row: ParsedRow }) {
  return (
    <>
      <tr
        className={`border-b last:border-0 ${
          row.isValid
            ? "border-border/30 hover:bg-secondary/30"
            : "border-destructive/20 bg-destructive/5"
        }`}
      >
        <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
          {row.rowNumber}
        </td>
        <td className="py-3 pr-3">
          {row.isValid ? (
            <CircleCheck className="h-4 w-4 text-green-500" />
          ) : (
            <CircleX className="h-4 w-4 text-destructive" />
          )}
        </td>
        <td className="py-3 pr-3 text-sm text-muted-foreground">
          {row.parsed.session_date ?? (
            <span className="text-destructive">{row.raw.date || "--"}</span>
          )}
        </td>
        <td className="py-3 pr-3">
          {row.parsed.eventLabel ? (
            <Badge variant="outline">{row.parsed.eventLabel}</Badge>
          ) : (
            <span className="text-sm text-destructive">
              {row.raw.event || "--"}
            </span>
          )}
        </td>
        <td className="py-3 pr-3 text-sm text-foreground">
          {row.parsed.practice_type ?? (
            <span className="text-destructive">
              {row.raw.practice_type || "--"}
            </span>
          )}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm text-foreground">
          {row.parsed.num_solves ?? (
            <span className="text-destructive">
              {row.raw.num_solves || "--"}
            </span>
          )}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm text-foreground">
          {row.parsed.duration_minutes != null ? (
            formatDuration(row.parsed.duration_minutes)
          ) : (
            <span className="text-destructive">
              {row.raw.duration_minutes || "--"}
            </span>
          )}
        </td>
        <td className="py-3 text-right font-mono text-sm text-foreground">
          {row.parsed.avg_time != null ? `${row.parsed.avg_time.toFixed(2)}s` : "--"}
        </td>
      </tr>
      {!row.isValid && (
        <tr className="border-b border-destructive/20 last:border-0">
          <td colSpan={8} className="pb-3 pl-8 pt-0">
            {row.errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
