"use client"

import { useCallback, useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImportDropZone } from "@/components/import/import-drop-zone"
import { SessionPreview, PBPreview } from "@/components/import/import-preview"
import { detectFormat } from "@/lib/import/detect-format"
import {
  parseCsTimer,
  parseCubeTime,
  parseTwistyTimer,
  parseGenericCsv,
} from "@/lib/import/parsers"
import type { RawSession } from "@/lib/import/parsers"
import {
  solvesToSessions,
  rawSessionsToSummaries,
  extractPBsFromSolves,
} from "@/lib/import/normalize"
import type {
  ParseResult,
  SessionSummary,
  NormalizedPB,
} from "@/lib/import/types"
import {
  WCA_EVENTS,
  DEFAULT_SECONDS_PER_SOLVE,
} from "@/lib/constants"
import { createSessionsBulk } from "@/lib/actions/sessions"
import { bulkImportPBs } from "@/lib/actions/personal-bests"

type State =
  | "idle"
  | "detecting"
  | "event_select"
  | "ai_parsing"
  | "previewing"
  | "importing"
  | "complete"

export function ImportContent() {
  const [state, setState] = useState<State>("idle")
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState("")

  // Data in flight
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [rawSessions, setRawSessions] = useState<RawSession[]>([])
  const [rawTotalSolves, setRawTotalSolves] = useState(0)

  // Event selection
  const [selectedEvent, setSelectedEvent] = useState("333")
  const [secondsPerSolve, setSecondsPerSolve] = useState(30)

  // Final preview data
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [pbs, setPbs] = useState<NormalizedPB[]>([])
  const [totalSolves, setTotalSolves] = useState(0)

  // Import result
  const [importedCount, setImportedCount] = useState(0)

  const reset = useCallback(() => {
    setState("idle")
    setError(null)
    setSource("")
    setParseResult(null)
    setRawSessions([])
    setRawTotalSolves(0)
    setSessions([])
    setPbs([])
    setTotalSolves(0)
    setImportedCount(0)
  }, [])

  // -- Main entry point --

  const handleData = useCallback(
    async (text: string, fileName?: string) => {
      setError(null)
      setState("detecting")

      try {
        const detection = detectFormat(text)

        if (detection.format === "cstimer") {
          const result = parseCsTimer(text)
          if (result.errors.length > 0 && result._rawSessions.length === 0) {
            setError(result.errors.join("\n"))
            setState("idle")
            return
          }
          setParseResult(result)
          setRawSessions(result._rawSessions)
          setRawTotalSolves(result._totalSolves)
          setSource("csTimer")
          setState("event_select")
          return
        }

        if (detection.format === "cubetime") {
          const result = parseCubeTime(text)
          if (result.errors.length > 0 && result._rawSessions.length === 0) {
            setError(result.errors.join("\n"))
            setState("idle")
            return
          }
          setParseResult(result)
          setRawSessions(result._rawSessions)
          setRawTotalSolves(result._totalSolves)
          setSource("CubeTime")
          setState("event_select")
          return
        }

        if (detection.format === "twistytimer") {
          const result = parseTwistyTimer(text)
          if (result.errors.length > 0 && result.solves.length === 0) {
            setError(result.errors.join("\n"))
            setState("idle")
            return
          }
          setParseResult(result)
          setSource("Twisty Timer")
          if (result.needsEventSelection) {
            setState("event_select")
          } else {
            finalizeParse(result, result.detectedEvent!)
          }
          return
        }

        if (detection.format === "generic_csv") {
          const result = parseGenericCsv(text)
          if (result.errors.length > 0 && result._csvRows.length === 0) {
            setError(result.errors.join("\n"))
            setState("idle")
            return
          }
          // Generic CSV rows already have event/date/duration
          const csvSessions = result._csvRows.map((row) => ({
            session_date: row.date ?? "",
            event: row.event ?? "333",
            practice_type: row.practice_type ?? "Solves",
            num_solves: parseInt(row.num_solves ?? "0", 10) || 0,
            num_dnf: 0,
            duration_minutes: parseInt(row.duration_minutes ?? "0", 10) || 1,
            avg_time: row.avg_time ? parseFloat(row.avg_time) : null,
            best_time: row.best_time ? parseFloat(row.best_time) : null,
            notes: row.notes ?? null,
          }))
          setSessions(csvSessions)
          setTotalSolves(csvSessions.reduce((sum, s) => sum + s.num_solves, 0))
          setSource("CSV")
          setState("previewing")
          return
        }

        // Unknown format -> AI
        setState("ai_parsing")
        const resp = await fetch("/api/import/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.slice(0, 50_000),
            fileName: fileName ?? null,
          }),
        })

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}))
          setError(body.error ?? "AI parsing failed. Please try again.")
          setState("idle")
          return
        }

        const aiResult: ParseResult = await resp.json()
        setParseResult(aiResult)
        setSource(aiResult.source)

        if (aiResult.needsEventSelection) {
          setState("event_select")
        } else {
          finalizeParse(aiResult, aiResult.detectedEvent ?? "333")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.")
        setState("idle")
      }
    },
    []
  )

  // -- Finalize: convert parse result -> preview data --

  function finalizeParse(
    result: ParseResult,
    event: string,
    perSolve?: number
  ) {
    if (result.pbs.length > 0) {
      setPbs(result.pbs)
    }

    if (result.solves.length > 0) {
      const sessionSummaries = solvesToSessions(
        result.solves,
        event,
        perSolve
      )
      setSessions(sessionSummaries)
      setTotalSolves(result.solves.length)

      // Also extract best single as a PB candidate
      const bestPBs = extractPBsFromSolves(result.solves, event)
      if (bestPBs.length > 0) setPbs((prev) => [...prev, ...bestPBs])
    }

    setState("previewing")
  }

  // -- Event select -> finalize --

  function handleEventConfirm() {
    const perSolve =
      secondsPerSolve || DEFAULT_SECONDS_PER_SOLVE[selectedEvent] || 30

    // If we have raw sessions (csTimer/CubeTime), convert them
    if (rawSessions.length > 0) {
      const sessionSummaries = rawSessionsToSummaries(
        rawSessions,
        selectedEvent,
        perSolve
      )
      setSessions(sessionSummaries)
      setTotalSolves(rawTotalSolves)
      setState("previewing")
      return
    }

    // If we have solves (Twisty Timer, AI)
    if (parseResult && parseResult.solves.length > 0) {
      finalizeParse(parseResult, selectedEvent, perSolve)
      return
    }

    // Fallback
    setError("No data to import.")
    setState("idle")
  }

  // -- Import --

  async function handleImport() {
    setState("importing")
    setError(null)

    try {
      let count = 0

      if (sessions.length > 0) {
        const result = await createSessionsBulk(sessions)
        if (result.error) {
          setError(result.error)
          setState("previewing")
          return
        }
        count += result.inserted ?? sessions.length
      }

      if (pbs.length > 0) {
        const result = await bulkImportPBs(pbs)
        if (result.error) {
          setError(result.error)
          setState("previewing")
          return
        }
        count += result.imported ?? pbs.length
      }

      setImportedCount(count)
      setState("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.")
      setState("previewing")
    }
  }

  // -- Render --

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Import Data
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a file or paste data from any timer app. Known formats are
          detected automatically \u2014 everything else is parsed by AI.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Idle: show drop zone */}
      {state === "idle" && <ImportDropZone onData={handleData} />}

      {/* Detecting / AI parsing: spinner */}
      {(state === "detecting" || state === "ai_parsing") && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {state === "ai_parsing"
              ? "AI is analyzing your data..."
              : "Analyzing your data..."}
          </p>
        </div>
      )}

      {/* Event selection */}
      {state === "event_select" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {source} data detected. Which event are these solves for?
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Event
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => {
                setSelectedEvent(e.target.value)
                setSecondsPerSolve(
                  DEFAULT_SECONDS_PER_SOLVE[e.target.value] ?? 30
                )
              }}
              className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground"
            >
              {WCA_EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Seconds per solve (for duration estimate)
            </label>
            <input
              type="number"
              value={secondsPerSolve}
              onChange={(e) =>
                setSecondsPerSolve(Math.max(1, parseInt(e.target.value) || 30))
              }
              className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground"
              min={1}
              max={7200}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Includes inspection + scrambling + rest between solves
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleEventConfirm} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Preview */}
      {state === "previewing" && (
        <div className="space-y-4">
          {sessions.length > 0 && (
            <SessionPreview
              sessions={sessions}
              totalSolves={totalSolves}
              source={source}
            />
          )}

          {pbs.length > 0 && <PBPreview pbs={pbs} />}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Start Over
            </Button>
            <Button onClick={handleImport} className="flex-1">
              Import {sessions.length > 0 ? `${sessions.length} Session${sessions.length !== 1 ? "s" : ""}` : ""}
              {sessions.length > 0 && pbs.length > 0 ? " + " : ""}
              {pbs.length > 0 ? `${pbs.length} PB${pbs.length !== 1 ? "s" : ""}` : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Importing: spinner */}
      {state === "importing" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Importing your data...</p>
        </div>
      )}

      {/* Complete */}
      {state === "complete" && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <div>
            <p className="text-lg font-semibold text-foreground">
              Import Complete!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Successfully imported {importedCount} record{importedCount !== 1 ? "s" : ""}.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Import More
            </Button>
            <Button asChild>
              <a href="/profile?tab=stats">View Stats</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
