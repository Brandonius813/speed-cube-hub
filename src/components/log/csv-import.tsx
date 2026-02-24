"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { parseCsv } from "@/lib/csv/parse-csv";
import { validateAllRows, type ParsedRow } from "@/lib/csv/validate-csv-row";
import { createSessionsBulk } from "@/lib/actions/sessions";
import { CsvDropZone } from "./csv-drop-zone";
import { CsvPreviewTable } from "./csv-preview-table";

type ImportState = "idle" | "previewing" | "importing" | "complete";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function CsvImport() {
  const [state, setState] = useState<ImportState>("idle");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  async function handleFileSelected(file: File) {
    setFileError(null);
    setImportError(null);

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please select a CSV file (.csv).");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 1MB.");
      return;
    }

    const text = await file.text();

    // Parse CSV
    const { rows: rawRows, errors } = parseCsv(text);

    if (errors.length > 0) {
      setFileError(errors.join(" "));
      return;
    }

    // Validate each row
    const parsed = validateAllRows(rawRows);
    setRows(parsed);
    setState("previewing");
  }

  async function handleImport() {
    setImportError(null);
    setState("importing");

    const sessionsToImport = validRows.map((r) => ({
      session_date: r.parsed.session_date!,
      event: r.parsed.event!,
      practice_type: r.parsed.practice_type!,
      num_solves: r.parsed.num_solves!,
      duration_minutes: r.parsed.duration_minutes!,
      avg_time: r.parsed.avg_time,
      best_time: r.parsed.best_time,
      notes: r.parsed.notes,
    }));

    const result = await createSessionsBulk(sessionsToImport);

    if (result.error) {
      setImportError(result.error);
      setState("previewing");
      return;
    }

    setImportResult({
      imported: result.inserted,
      skipped: invalidRows.length,
    });
    setState("complete");
  }

  function handleReset() {
    setState("idle");
    setRows([]);
    setFileError(null);
    setImportError(null);
    setImportResult(null);
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Import Sessions from CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state === "idle" && (
          <CsvDropZone
            onFileSelected={handleFileSelected}
            error={fileError}
          />
        )}

        {(state === "previewing" || state === "importing") && (
          <div className="flex flex-col gap-4">
            {/* Validation summary */}
            <ValidationSummary
              validCount={validRows.length}
              invalidCount={invalidRows.length}
              totalCount={rows.length}
            />

            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}

            {/* Preview table */}
            <CsvPreviewTable rows={rows} />

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={state === "importing"}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Start Over
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={state === "importing" || validRows.length === 0}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {state === "importing" ? (
                  "Importing..."
                ) : (
                  <>
                    Import {validRows.length} Session
                    {validRows.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {state === "complete" && importResult && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Import Complete
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Successfully imported {importResult.imported} session
                {importResult.imported !== 1 ? "s" : ""}.
                {importResult.skipped > 0 && (
                  <> {importResult.skipped} row{importResult.skipped !== 1 ? "s" : ""} skipped due to errors.</>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              Import More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ValidationSummary({
  validCount,
  invalidCount,
  totalCount,
}: {
  validCount: number;
  invalidCount: number;
  totalCount: number;
}) {
  if (invalidCount === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3">
        <Check className="h-4 w-4 shrink-0 text-green-500" />
        <p className="text-sm text-green-500">
          All {totalCount} row{totalCount !== 1 ? "s" : ""} valid and ready to
          import.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-sm text-amber-500">
        {validCount} of {totalCount} row{totalCount !== 1 ? "s" : ""} valid.{" "}
        {invalidCount} row{invalidCount !== 1 ? "s" : ""} will be skipped.
      </p>
    </div>
  );
}
