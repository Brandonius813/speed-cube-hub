"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Timer,
  Upload,
  Check,
  AlertTriangle,
  RotateCcw,
  PlayCircle,
} from "lucide-react";
import { WCA_EVENTS, DEFAULT_SECONDS_PER_SOLVE } from "@/lib/constants";
import {
  parseCsTimerCsv,
  type CsTimerParsedSession,
} from "@/lib/cstimer/parse-cstimer";
import { createSessionsBulk } from "@/lib/actions/sessions";
import { formatDuration, formatSolveTime, parseSolveTime } from "@/lib/utils";
import { CsTimerPreviewTable } from "./cstimer-preview-table";

type ImportState = "idle" | "previewing" | "importing" | "complete";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — csTimer exports can be large

export function CsTimerImport() {
  const [state, setState] = useState<ImportState>("idle");
  const [event, setEvent] = useState("333");
  const [secondsPerSolve, setSecondsPerSolve] = useState(
    DEFAULT_SECONDS_PER_SOLVE["333"] ?? 30
  );
  const [timePerSolveInput, setTimePerSolveInput] = useState(
    formatSolveTime(DEFAULT_SECONDS_PER_SOLVE["333"] ?? 30)
  );
  const [sessions, setSessions] = useState<CsTimerParsedSession[]>([]);
  const [totalSolves, setTotalSolves] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  function handleEventChange(newEvent: string) {
    setEvent(newEvent);
    const defaultSec = DEFAULT_SECONDS_PER_SOLVE[newEvent] ?? 30;
    setSecondsPerSolve(defaultSec);
    setTimePerSolveInput(formatSolveTime(defaultSec));
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFileSelected(file: File) {
    setFileError(null);
    setImportError(null);

    // Validate file type
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv")) {
      setFileError("Please select a CSV file exported from csTimer.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 5MB.");
      return;
    }

    const text = await file.text();
    const result = parseCsTimerCsv(text);

    if (result.sessions.length === 0) {
      setFileError(
        result.errors.length > 0
          ? result.errors.join(" ")
          : "No solves found in file."
      );
      return;
    }

    setSessions(result.sessions);
    setTotalSolves(result.totalSolves);
    setState("previewing");
  }

  async function handleImport() {
    setImportError(null);
    setState("importing");

    const rows = sessions.map((s) => ({
      session_date: s.session_date,
      event,
      practice_type: "Solves",
      num_solves: s.num_solves ?? 0,
      num_dnf: s.num_dnf ?? 0,
      duration_minutes: Math.min(1440, Math.max(1, Math.ceil((s.num_solves * secondsPerSolve) / 60))),
      avg_time: s.avg_time,
      best_time: s.best_time,
      notes: "csTimer import",
    }));

    try {
      const result = await createSessionsBulk(rows, { source: "csTimer" });

      if (result.error) {
        setImportError(result.error);
        setState("previewing");
        return;
      }

      setImportedCount(result.inserted);
      setState("complete");
    } catch {
      setImportError("Something went wrong. Check your internet connection and try again.");
      setState("previewing");
    }
  }

  function handleReset() {
    setState("idle");
    setSessions([]);
    setTotalSolves(0);
    setFileError(null);
    setImportError(null);
    setImportedCount(0);
  }

  const eventLabel =
    WCA_EVENTS.find((e) => e.id === event)?.label ?? event;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Timer className="h-5 w-5 text-primary" />
          Import from csTimer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state === "idle" && (
          <div className="flex flex-col gap-4">
            <a
              href="https://youtu.be/eDWnIDWC2ag"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors w-fit"
            >
              <PlayCircle className="h-4 w-4" />
              Watch the tutorial
            </a>

            {/* Event picker */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cstimer-event"
                className="text-sm font-medium text-foreground"
              >
                Event
              </label>
              <select
                id="cstimer-event"
                value={event}
                onChange={(e) => handleEventChange(e.target.value)}
                className="h-10 w-full max-w-xs rounded-md border border-border/50 bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                {WCA_EVENTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                csTimer exports don&apos;t include the puzzle type &mdash;
                select which event these solves are for.
              </p>
            </div>

            {/* Time per solve */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cstimer-sps"
                className="text-sm font-medium text-foreground"
              >
                Time per solve
              </label>
              <input
                id="cstimer-sps"
                type="text"
                value={timePerSolveInput}
                onChange={(e) => {
                  setTimePerSolveInput(e.target.value);
                  const parsed = parseSolveTime(e.target.value);
                  if (parsed !== null) setSecondsPerSolve(parsed);
                }}
                placeholder="0:30 or 30.00"
                className="h-10 w-32 rounded-md border border-border/50 bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Includes inspection, scrambling, and rest. Use m:ss or seconds
                format.
              </p>
            </div>

            {/* Drop zone */}
            <DropZone
              isDragging={isDragging}
              inputRef={inputRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelected(file);
              }}
              onInputChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
                e.target.value = "";
              }}
            />

            {fileError && (
              <p className="text-sm text-destructive">{fileError}</p>
            )}
          </div>
        )}

        {(state === "previewing" || state === "importing") && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3">
              <Check className="h-4 w-4 shrink-0 text-green-500" />
              <p className="text-sm text-green-500">
                Found {totalSolves} solve{totalSolves !== 1 ? "s" : ""} across{" "}
                {sessions.length} day{sessions.length !== 1 ? "s" : ""} ({eventLabel}
                {" "}&mdash;{" "}
                {formatDuration(
                  sessions.reduce(
                    (sum, s) =>
                      sum +
                      Math.max(1, Math.ceil((s.num_solves * secondsPerSolve) / 60)),
                    0
                  )
                )}{" "}
                estimated)
              </p>
            </div>

            {sessions.some((s) => s.num_dnf > 0) && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm text-amber-500">
                  {sessions.reduce((sum, s) => sum + s.num_dnf, 0)} DNF
                  {sessions.reduce((sum, s) => sum + s.num_dnf, 0) !== 1
                    ? "s"
                    : ""}{" "}
                  detected &mdash; excluded from averages.
                </p>
              </div>
            )}

            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}

            <CsTimerPreviewTable sessions={sessions} secondsPerSolve={secondsPerSolve} />

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
                disabled={state === "importing"}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {state === "importing"
                  ? "Importing..."
                  : `Import ${sessions.length} Session${sessions.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {state === "complete" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Import Complete
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Successfully imported {importedCount} session
                {importedCount !== 1 ? "s" : ""} from csTimer.
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

function DropZone({
  isDragging,
  inputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
}: {
  isDragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
        }`}
      >
        <Upload
          className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drop your csTimer export here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepts .csv files, max 5MB
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={onInputChange}
        className="hidden"
      />
    </>
  );
}
