"use client"

import { useCallback, useRef, useState } from "react"
import {
  type ChatMessage,
  type ChatAction,
  makeMessage,
} from "@/components/import/import-chat-actions"
import {
  GREETING,
  TIMER_INSTRUCTIONS,
  ANALYZING,
  AI_ANALYZING,
  eventSelectMessage,
  previewMessage,
  completeMessage,
  IMPORTING,
  PARSE_ERROR,
} from "@/lib/import/chat-scripts"
import { detectFormat } from "@/lib/import/detect-format"
import {
  parseCsTimer,
  parseCubeTime,
  parseTwistyTimer,
  parseGenericCsv,
} from "@/lib/import/parsers"
import type { RawSession } from "@/lib/import/parsers"
import {
  buildImportedPbs,
  solvesToSessions,
  rawSessionsToSummaries,
} from "@/lib/import/normalize"
import {
  buildRawSolvePreview,
  buildSessionOnlyPreview,
} from "@/lib/import/preview"
import type {
  ParseResult,
  SessionSummary,
  NormalizedPB,
  RawImportSolve,
} from "@/lib/import/types"
import { WCA_EVENTS, DEFAULT_SECONDS_PER_SOLVE } from "@/lib/constants"
import { createSolveStore } from "@/lib/timer/solve-store"
import { executeImport } from "@/lib/import/execute-import"

const TYPING_DELAY = 400

const WCA_EVENTS_MAP: Record<string, string> = Object.fromEntries(
  WCA_EVENTS.map((e) => [e.id, e.label])
)

export function useImportChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage("bot", GREETING, { type: "timer-select" }),
  ])
  const [isTyping, setIsTyping] = useState(false)

  // Data refs (not rendered, just used by import logic)
  const parseResultRef = useRef<ParseResult | null>(null)
  const rawSessionsRef = useRef<RawSession[]>([])
  const rawTotalSolvesRef = useRef(0)
  const rawSolvesRef = useRef<RawImportSolve[]>([])
  const sessionsRef = useRef<SessionSummary[]>([])
  const pbsRef = useRef<NormalizedPB[]>([])
  const parserPbsRef = useRef<NormalizedPB[]>([])
  const selectedEventRef = useRef("333")
  const secondsPerSolveRef = useRef(DEFAULT_SECONDS_PER_SOLVE["333"] ?? 30)
  const excludedSolveIndexesRef = useRef<Set<number>>(new Set())
  const sourceRef = useRef("")
  const solveStoreRef = useRef(createSolveStore())

  const syncPreviewRefs = useCallback((result: ParseResult) => {
    rawSessionsRef.current = result.preview?.rawSessions ?? []
    rawSolvesRef.current = result.preview?.rawSolves ?? []
    rawTotalSolvesRef.current =
      result.preview?.totalSolves ?? result.preview?.rawSolves.length ?? 0
  }, [])

  const hasImportData = useCallback((result: ParseResult) => {
    return (
      result.solves.length > 0 ||
      (result.preview?.rawSessions?.length ?? 0) > 0 ||
      (result.preview?.rawSolves.length ?? 0) > 0
    )
  }, [])

  // ---- Message helpers ----

  const addBotMessage = useCallback(
    (content: string, action?: ChatAction): Promise<void> => {
      return new Promise((resolve) => {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          setMessages((prev) => [...prev, makeMessage("bot", content, action)])
          resolve()
        }, TYPING_DELAY)
      })
    },
    []
  )

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, makeMessage("user", content)])
  }, [])

  const addBotMessageImmediate = useCallback(
    (content: string, action?: ChatAction) => {
      setMessages((prev) => [...prev, makeMessage("bot", content, action)])
    },
    []
  )

  const updateLastBotAction = useCallback((action: ChatAction) => {
    setMessages((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "bot" && copy[i].action) {
          copy[i] = { ...copy[i], action }
          break
        }
      }
      return copy
    })
  }, [])

  const resetChat = useCallback(() => {
    parseResultRef.current = null
    rawSessionsRef.current = []
    rawTotalSolvesRef.current = 0
    rawSolvesRef.current = []
    sessionsRef.current = []
    pbsRef.current = []
    parserPbsRef.current = []
    selectedEventRef.current = "333"
    secondsPerSolveRef.current = DEFAULT_SECONDS_PER_SOLVE["333"] ?? 30
    excludedSolveIndexesRef.current = new Set()
    sourceRef.current = ""
    setMessages([makeMessage("bot", GREETING, { type: "timer-select" })])
  }, [])

  // ---- Finalize + preview helpers ----

  const syncPbsForCurrentSelection = useCallback((event: string) => {
    const parsedSolves = parseResultRef.current?.solves ?? []

    if (parsedSolves.length === 0) {
      pbsRef.current = [...parserPbsRef.current]
      return pbsRef.current.length
    }

    pbsRef.current = buildImportedPbs({
      explicitPbs: parserPbsRef.current,
      solves: parsedSolves,
      event,
      excludedSolveIndexes: excludedSolveIndexesRef.current,
    })

    return pbsRef.current.length
  }, [])

  const buildPreviewData = useCallback((
    sessions: SessionSummary[],
    solveCount: number,
    pbCount: number
  ) => {
    if (rawSolvesRef.current.length > 0) {
      const preview = buildRawSolvePreview({
        source: sourceRef.current,
        rawSolves: rawSolvesRef.current,
        event: selectedEventRef.current,
        secondsPerSolve: secondsPerSolveRef.current,
        excludedSolveIndexes: excludedSolveIndexesRef.current,
        pbCount,
      })
      sessionsRef.current = preview.sessions
      return preview
    }

    sessionsRef.current = sessions
    return buildSessionOnlyPreview({
      source: sourceRef.current,
      sessions,
      totalSolveCount: solveCount,
      pbCount,
    })
  }, [])

  const showPreview = useCallback((
    sessions: SessionSummary[],
    solveCount: number,
    pbCount: number
  ) => {
    const preview = buildPreviewData(sessions, solveCount, pbCount)
    void addBotMessage(previewMessage(), {
      type: "preview-confirm",
      preview,
    })
  }, [addBotMessage, buildPreviewData])

  const refreshPreviewAction = useCallback(() => {
    const pbCount = syncPbsForCurrentSelection(selectedEventRef.current)
    const preview = buildPreviewData(
      sessionsRef.current,
      rawSolvesRef.current.length > 0
        ? rawSolvesRef.current.length
        : sessionsRef.current.reduce((sum, session) => sum + session.num_solves, 0),
      pbCount
    )

    updateLastBotAction({
      type: "preview-confirm",
      preview,
    })
  }, [buildPreviewData, syncPbsForCurrentSelection, updateLastBotAction])

  const finalizeParse = useCallback((
    result: ParseResult,
    event: string,
    perSolve?: number
  ) => {
    parserPbsRef.current = result.pbs

    if (result.solves.length > 0) {
      const sessionSummaries = solvesToSessions(result.solves, event, perSolve)
      sessionsRef.current = sessionSummaries
      const pbCount = syncPbsForCurrentSelection(event)

      showPreview(sessionSummaries, result.solves.length, pbCount)
    }
  }, [showPreview, syncPbsForCurrentSelection])

  // ---- Step 1: Timer selection ----

  const handleTimerSelect = useCallback(
    async (timerId: string) => {
      const labels: Record<string, string> = {
        cstimer: "csTimer",
        cubetime: "CubeTime",
        twistytimer: "Twisty Timer",
        other: "Other",
      }
      addUserMessage(labels[timerId] ?? timerId)

      const instructions = TIMER_INSTRUCTIONS[timerId]
      if (!instructions) return

      await addBotMessage(instructions.intro)
      await addBotMessage(instructions.steps, { type: "file-upload" })
    },
    [addBotMessage, addUserMessage]
  )

  // ---- Step 2: File uploaded → parse ----

  const handleData = useCallback(
    async (text: string, fileName?: string) => {
      addUserMessage(fileName ? `Uploaded ${fileName}` : "Pasted data")
      addBotMessageImmediate(ANALYZING)
      parseResultRef.current = null
      rawSessionsRef.current = []
      rawTotalSolvesRef.current = 0
      rawSolvesRef.current = []
      sessionsRef.current = []
      excludedSolveIndexesRef.current = new Set()
      pbsRef.current = []
      parserPbsRef.current = []

      try {
        const detection = detectFormat(text)

        if (detection.format === "cstimer") {
          const result = parseCsTimer(text)
          if (result.errors.length > 0 && !hasImportData(result)) {
            await addBotMessage(PARSE_ERROR, { type: "error", message: result.errors.join("\n"), canRetry: true })
            return
          }
          parseResultRef.current = result
          syncPreviewRefs(result)
          sourceRef.current = result.source
          await addBotMessage(eventSelectMessage(result.source), { type: "event-select", source: result.source })
          return
        }

        if (detection.format === "cubetime") {
          const result = parseCubeTime(text)
          if (result.errors.length > 0 && !hasImportData(result)) {
            await addBotMessage(PARSE_ERROR, { type: "error", message: result.errors.join("\n"), canRetry: true })
            return
          }
          parseResultRef.current = result
          syncPreviewRefs(result)
          sourceRef.current = result.source
          await addBotMessage(eventSelectMessage(result.source), { type: "event-select", source: result.source })
          return
        }

        if (detection.format === "twistytimer") {
          const result = parseTwistyTimer(text)
          if (result.errors.length > 0 && !hasImportData(result)) {
            await addBotMessage(PARSE_ERROR, { type: "error", message: result.errors.join("\n"), canRetry: true })
            return
          }
          parseResultRef.current = result
          syncPreviewRefs(result)
          sourceRef.current = result.source
          if (result.needsEventSelection) {
            await addBotMessage(eventSelectMessage(result.source), { type: "event-select", source: result.source })
          } else {
            selectedEventRef.current = result.detectedEvent!
            finalizeParse(result, result.detectedEvent!)
          }
          return
        }

        if (detection.format === "generic_csv") {
          const result = parseGenericCsv(text)
          if (result.errors.length > 0 && result._csvRows.length === 0) {
            await addBotMessage(PARSE_ERROR, { type: "error", message: result.errors.join("\n"), canRetry: true })
            return
          }
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
          sessionsRef.current = csvSessions
          sourceRef.current = "CSV"
          showPreview(
            csvSessions,
            csvSessions.reduce((sum, s) => sum + s.num_solves, 0),
            0
          )
          return
        }

        // Unknown format → AI
        setMessages((prev) => {
          const copy = [...prev]
          if (copy.length > 0 && copy[copy.length - 1].content === ANALYZING) {
            copy[copy.length - 1] = makeMessage("bot", AI_ANALYZING)
          }
          return copy
        })

        const resp = await fetch("/api/import/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.slice(0, 50_000), fileName: fileName ?? null }),
        })

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}))
          await addBotMessage(PARSE_ERROR, { type: "error", message: body.error ?? "AI parsing failed.", canRetry: true })
          return
        }

        const aiResult: ParseResult = await resp.json()
        parseResultRef.current = aiResult
        sourceRef.current = aiResult.source

        if (aiResult.needsEventSelection) {
          await addBotMessage(eventSelectMessage(aiResult.source), { type: "event-select", source: aiResult.source })
        } else {
          selectedEventRef.current = aiResult.detectedEvent ?? "333"
          finalizeParse(aiResult, aiResult.detectedEvent ?? "333")
        }
      } catch (err) {
        await addBotMessage(PARSE_ERROR, { type: "error", message: err instanceof Error ? err.message : "Something went wrong.", canRetry: true })
      }
    },
    [
      addBotMessage,
      addBotMessageImmediate,
      addUserMessage,
      finalizeParse,
      hasImportData,
      showPreview,
      syncPreviewRefs,
    ]
  )

  // ---- Step 3: Event confirmed → preview ----

  const handleEventConfirm = useCallback(
    (event: string, secondsPerSolve: number) => {
      selectedEventRef.current = event
      secondsPerSolveRef.current =
        secondsPerSolve || DEFAULT_SECONDS_PER_SOLVE[event] || 30
      addUserMessage(WCA_EVENTS_MAP[event] ?? event)

      const perSolve = secondsPerSolveRef.current

      if (rawSolvesRef.current.length > 0) {
        if (parseResultRef.current && parseResultRef.current.solves.length > 0) {
          finalizeParse(parseResultRef.current, event, perSolve)
          return
        }

        const sessionSummaries =
          rawSessionsRef.current.length > 0
            ? rawSessionsToSummaries(rawSessionsRef.current, event, perSolve)
            : []
        sessionsRef.current = sessionSummaries
        showPreview(
          sessionSummaries,
          rawTotalSolvesRef.current || rawSolvesRef.current.length,
          pbsRef.current.length
        )
        return
      }

      if (parseResultRef.current && parseResultRef.current.solves.length > 0) {
        finalizeParse(parseResultRef.current, event, perSolve)
        return
      }

      addBotMessage("No data to import. Want to try a different file?", { type: "file-upload" })
    },
    [addBotMessage, addUserMessage, finalizeParse, showPreview]
  )

  // ---- Step 4: Import ----

  const handleImport = useCallback(async () => {
    addBotMessageImmediate(IMPORTING, { type: "importing", progress: "Preparing..." })

    const event = sessionsRef.current[0]?.event ?? selectedEventRef.current
    syncPbsForCurrentSelection(event)
    const includedRawSolves = rawSolvesRef.current.filter(
      (_, index) => !excludedSolveIndexesRef.current.has(index)
    )

    const result = await executeImport(
      event,
      includedRawSolves,
      sessionsRef.current,
      pbsRef.current,
      sourceRef.current,
      solveStoreRef.current,
      (progress) => updateLastBotAction({ type: "importing", progress })
    )

    if (result.success) {
      setMessages((prev) => {
        const copy = [...prev]
        if (copy[copy.length - 1]?.action?.type === "importing") copy.pop()
        copy.push(makeMessage("bot", completeMessage(result.count, result.hasRawSolves), { type: "complete", solveCount: result.count, hasRawSolves: result.hasRawSolves }))
        return copy
      })
    } else {
      await addBotMessage("", { type: "error", message: result.error })
    }
  }, [addBotMessage, addBotMessageImmediate, syncPbsForCurrentSelection, updateLastBotAction])

  const handleToggleSolveIncluded = useCallback(
    (solveIndex: number) => {
      const nextExcluded = new Set(excludedSolveIndexesRef.current)
      if (nextExcluded.has(solveIndex)) {
        nextExcluded.delete(solveIndex)
      } else {
        nextExcluded.add(solveIndex)
      }
      excludedSolveIndexesRef.current = nextExcluded
      refreshPreviewAction()
    },
    [refreshPreviewAction]
  )

  return {
    messages,
    isTyping,
    handleTimerSelect,
    handleData,
    handleEventConfirm,
    handleImport,
    handleToggleSolveIncluded,
    resetChat,
  }
}
