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
  type PreviewStats,
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
import { WCA_EVENTS, DEFAULT_SECONDS_PER_SOLVE } from "@/lib/constants"
import { createSolveStore } from "@/lib/timer/solve-store"
import { executeImport } from "@/lib/import/execute-import"

const TYPING_DELAY = 400

const WCA_EVENTS_MAP: Record<string, string> = Object.fromEntries(
  WCA_EVENTS.map((e) => [e.id, e.label])
)

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(2)}s`
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(2).padStart(5, "0")
  return `${m}:${s}`
}

function getDateRange(sessions: SessionSummary[]): string {
  if (sessions.length === 0) return ""
  const dates = sessions.map((s) => s.session_date).sort()
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (first === last) return first
  return `${first} to ${last}`
}

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
  const selectedEventRef = useRef("333")
  const sourceRef = useRef("")
  const solveStoreRef = useRef(createSolveStore())

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
    selectedEventRef.current = "333"
    sourceRef.current = ""
    setMessages([makeMessage("bot", GREETING, { type: "timer-select" })])
  }, [])

  // ---- Finalize + preview helpers ----

  function showPreview(
    sessions: SessionSummary[],
    solveCount: number,
    pbCount: number,
    hasRawSolves: boolean
  ) {
    const bestTime = sessions.reduce<number | null>((best, s) => {
      if (s.best_time == null) return best
      if (best == null) return s.best_time
      return s.best_time < best ? s.best_time : best
    }, null)

    const stats: PreviewStats = {
      source: sourceRef.current,
      sessionCount: sessions.length,
      solveCount: hasRawSolves ? rawSolvesRef.current.length : solveCount,
      pbCount,
      hasRawSolves,
      dateRange: getDateRange(sessions),
      bestTime: bestTime != null ? formatTime(bestTime) : null,
    }

    addBotMessage(previewMessage(stats), {
      type: "preview-confirm",
      stats,
    })
  }

  function finalizeParse(
    result: ParseResult,
    event: string,
    perSolve?: number
  ) {
    if (result.pbs.length > 0) {
      pbsRef.current = result.pbs
    }

    if (result.solves.length > 0) {
      const sessionSummaries = solvesToSessions(result.solves, event, perSolve)
      sessionsRef.current = sessionSummaries

      const bestPBs = extractPBsFromSolves(result.solves, event)
      if (bestPBs.length > 0) {
        pbsRef.current = [...pbsRef.current, ...bestPBs]
      }

      showPreview(
        sessionSummaries,
        result.solves.length,
        pbsRef.current.length,
        rawSolvesRef.current.length > 0
      )
    }
  }

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

      try {
        const detection = detectFormat(text)

        if (detection.format === "cstimer") {
          const result = parseCsTimer(text)
          if (result.errors.length > 0 && result._rawSessions.length === 0) {
            await addBotMessage(PARSE_ERROR, { type: "error", message: result.errors.join("\n"), canRetry: true })
            return
          }
          parseResultRef.current = result
          rawSessionsRef.current = result._rawSessions
          rawTotalSolvesRef.current = result._totalSolves
          rawSolvesRef.current = result._rawSolves
          sourceRef.current = "csTimer"
          await addBotMessage(eventSelectMessage("csTimer"), { type: "event-select", source: "csTimer" })
          return
        }

        if (detection.format === "cubetime") {
          const result = parseCubeTime(text)
          if (result.errors.length > 0 && result._rawSessions.length === 0) {
            await addBotMessage(PARSE_ERROR, { type: "error", message: result.errors.join("\n"), canRetry: true })
            return
          }
          parseResultRef.current = result
          rawSessionsRef.current = result._rawSessions
          rawTotalSolvesRef.current = result._totalSolves
          rawSolvesRef.current = result._rawSolves
          sourceRef.current = "CubeTime"
          await addBotMessage(eventSelectMessage("CubeTime"), { type: "event-select", source: "CubeTime" })
          return
        }

        if (detection.format === "twistytimer") {
          const result = parseTwistyTimer(text)
          if (result.errors.length > 0 && result.solves.length === 0) {
            await addBotMessage(PARSE_ERROR, { type: "error", message: result.errors.join("\n"), canRetry: true })
            return
          }
          parseResultRef.current = result
          rawSolvesRef.current = result._rawSolves
          sourceRef.current = "Twisty Timer"
          if (result.needsEventSelection) {
            await addBotMessage(eventSelectMessage("Twisty Timer"), { type: "event-select", source: "Twisty Timer" })
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
          showPreview(csvSessions, csvSessions.reduce((sum, s) => sum + s.num_solves, 0), 0, false)
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
    [addBotMessage, addBotMessageImmediate, addUserMessage]
  )

  // ---- Step 3: Event confirmed → preview ----

  const handleEventConfirm = useCallback(
    (event: string, secondsPerSolve: number) => {
      selectedEventRef.current = event
      addUserMessage(WCA_EVENTS_MAP[event] ?? event)

      const perSolve = secondsPerSolve || DEFAULT_SECONDS_PER_SOLVE[event] || 30

      if (rawSessionsRef.current.length > 0) {
        const sessionSummaries = rawSessionsToSummaries(rawSessionsRef.current, event, perSolve)
        sessionsRef.current = sessionSummaries
        showPreview(sessionSummaries, rawTotalSolvesRef.current, 0, rawSolvesRef.current.length > 0)
        return
      }

      if (parseResultRef.current && parseResultRef.current.solves.length > 0) {
        finalizeParse(parseResultRef.current, event, perSolve)
        return
      }

      addBotMessage("No data to import. Want to try a different file?", { type: "file-upload" })
    },
    [addBotMessage, addUserMessage]
  )

  // ---- Step 4: Import ----

  const handleImport = useCallback(async () => {
    addBotMessageImmediate(IMPORTING, { type: "importing", progress: "Preparing..." })

    const event = sessionsRef.current[0]?.event ?? selectedEventRef.current

    const result = await executeImport(
      event,
      rawSolvesRef.current,
      sessionsRef.current,
      pbsRef.current,
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
  }, [addBotMessage, addBotMessageImmediate, updateLastBotAction])

  return {
    messages,
    isTyping,
    handleTimerSelect,
    handleData,
    handleEventConfirm,
    handleImport,
    resetChat,
  }
}
