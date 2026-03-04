"use client"

import { useCallback, useRef, useState } from "react"
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
  RawImportSolve,
} from "@/lib/import/types"
import {
  WCA_EVENTS,
  DEFAULT_SECONDS_PER_SOLVE,
} from "@/lib/constants"
import { createSessionsBulk } from "@/lib/actions/sessions"
import { bulkImportPBs } from "@/lib/actions/personal-bests"
import { bulkImportSolves } from "@/lib/actions/timer"
import { getOrCreateDefaultSession, updateSolveSessionActiveFrom } from "@/lib/actions/solve-sessions"
import { createSolveStore } from "@/lib/timer/solve-store"

type State =
  | "idle"
  | "detecting"
  | "event_select"
  | "ai_parsing"
  | "previewing"
  | "importing"
  | "complete"

export function ImportContent({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [state, setState] = useState<State>("idle")
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState("")
  const [importProgress, setImportProgress] = useState("")

  // Data in flight
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [rawSessions, setRawSessions] = useState<RawSession[]>([])
  const [rawTotalSolves, setRawTotalSolves] = useState(0)
  const [rawSolves, setRawSolves] = useState<RawImportSolve[]>([])

  // Event selection
  const [selectedEvent, setSelectedEvent] = useState("333")
  const [secondsPerSolve, setSecondsPerSolve] = useState(30)

  // Final preview data
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [pbs, setPbs] = useState<NormalizedPB[]>([])
  const [totalSolves, setTotalSolves] = useState(0)

  // Import result
  const [importedCount, setImportedCount] = useState(0)

  // Solve store for writing to IndexedDB
  const solveStoreRef = useRef(createSolveStore())

  const reset = useCallback(() => {
    setState("idle")
    setError(null)
    setSource("")
    setParseResult(null)
    setRawSessions([])
    setRawTotalSolves(0)
    setRawSolves([])
    setSessions([])
    setPbs([])
    setTotalSolves(0)
    setImportedCount(0)
    setImportProgress("")
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
          setRawSolves(result._rawSolves)
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
          setRawSolves(result._rawSolves)
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
          setRawSolves(result._rawSolves)
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
          // Generic CSV rows already have event/date/duration — no raw solves
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
    setImportProgress("")

    try {
      let count = 0
      const event = sessions[0]?.event ?? selectedEvent

      // Step 1: Save individual solves to DB + IndexedDB (if we have raw solves)
      if (rawSolves.length > 0) {
        setImportProgress("Preparing solve session...")

        // Get or create a solve_session for this event
        const { data: solveSession, error: ssError } = await getOrCreateDefaultSession(event)
        if (ssError || !solveSession) {
          setError(ssError ?? "Failed to create solve session.")
          setState("previewing")
          return
        }

        // Save individual solves to the database
        setImportProgress(`Saving ${rawSolves.length.toLocaleString()} solves to your account...`)
        const { imported, error: importError } = await bulkImportSolves(
          solveSession.id,
          event,
          rawSolves,
          { skipSessionEntry: true }
        )
        if (importError) {
          setError(importError)
          setState("previewing")
          return
        }

        // Update active_from so imported solves are visible
        const earliestDate = rawSolves.reduce(
          (min, s) => (s.date < min ? s.date : min),
          rawSolves[0].date
        )
        await updateSolveSessionActiveFrom(
          solveSession.id,
          `${earliestDate}T00:00:00.000Z`
        )

        // Write to IndexedDB for instant timer access
        setImportProgress("Writing to local storage for instant timer access...")
        const timerSolves = rawSolves.map((s) => ({
          id: crypto.randomUUID(),
          time_ms: s.time_ms,
          penalty: s.penalty,
          scramble: s.scramble,
        }))
        await solveStoreRef.current.importSolves(event, timerSolves)

        count += imported
      }

      // Step 2: Save per-day session summaries for feed/stats
      if (sessions.length > 0) {
        setImportProgress(`Saving ${sessions.length} session summaries...`)
        const result = await createSessionsBulk(sessions)
        if (result.error) {
          setError(result.error)
          setState("previewing")
          return
        }
        // Only count sessions if we didn't already count raw solves
        if (rawSolves.length === 0) {
          count += result.inserted ?? sessions.length
        }
      }

      // Step 3: Import PBs
      if (pbs.length > 0) {
        setImportProgress("Importing personal bests...")
        const result = await bulkImportPBs(pbs)
        if (result.error) {
          setError(result.error)
          setState("previewing")
          return
        }
        count += result.imported ?? pbs.length
      }

      setImportedCount(rawSolves.length > 0 ? rawSolves.length : count)
      setState("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.")
      setState("previewing")
    }
  }

  // -- Render --

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Import Data
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a file or paste data from any timer app. Known formats are
            detected automatically — everything else is parsed by AI.
          </p>
        </div>
      )}

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

          {rawSolves.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
              {rawSolves.length.toLocaleString()} individual solves will be
              saved to your timer history.
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Start Over
            </Button>
            <Button onClick={handleImport} className="flex-1">
              Import{" "}
              {rawSolves.length > 0
                ? `${rawSolves.length.toLocaleString()} Solves`
                : sessions.length > 0
                  ? `${sessions.length} Session${sessions.length !== 1 ? "s" : ""}`
                  : ""}
              {pbs.length > 0
                ? ` + ${pbs.length} PB${pbs.length !== 1 ? "s" : ""}`
                : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Importing: spinner with progress */}
      {state === "importing" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {importProgress || "Importing your data..."}
          </p>
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
              Successfully imported{" "}
              {importedCount.toLocaleString()} solve
              {importedCount !== 1 ? "s" : ""}.
              {rawSolves.length > 0 &&
                " Open the timer to see your full solve history."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Import More
            </Button>
            <Button asChild>
              <a
                href={rawSolves.length > 0 ? "/timer" : "/profile?tab=stats"}
              >
                {rawSolves.length > 0 ? "Open Timer" : "View Stats"}
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
