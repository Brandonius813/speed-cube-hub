// Web Worker for off-main-thread scramble generation using cstimer_module.
// All WCA events use csTimer's random-state generators (same engine as csTimer.net).
import { getScramble, setSeed } from "cstimer_module"
import { generateScramble } from "./scrambles"
import { generateSquare1Scramble } from "./square1"

type ScrambleWorkerRequest = {
  requestId: number
  eventId: string
  mode?: "single" | "sequence"
  seed?: string
  count?: number
}

type ScrambleWorkerResponse = {
  requestId: number
  eventId: string
  scramble: string | null
  scrambles?: string[]
  error?: string
  warning?: string
}

/** Maps our event IDs to [cstimerType, length] for WCA random-state generation. */
const CSTIMER_EVENT_MAP: Record<string, [string, number]> = {
  "222": ["222so", 0],
  "333": ["333", 0],
  "444": ["444wca", 0],
  "555": ["555wca", 60],
  "666": ["666wca", 80],
  "777": ["777wca", 100],
  "333bf": ["333ni", 0],
  "444bf": ["444bld", 40],
  "555bf": ["555bld", 60],
  "333mbf": ["r3ni", 5],
  "333oh": ["333", 0],
  "333fm": ["333fm", 0],
  minx: ["mgmp", 70],
  pyram: ["pyrso", 10],
  clock: ["clkwca", 0],
  skewb: ["skbso", 0],
}

function generateCstimerScramble(eventId: string): string | null {
  const mapping = CSTIMER_EVENT_MAP[eventId]
  if (!mapping) return null
  const [type, length] = mapping
  const result = getScramble(type, length)
  return typeof result === "string" && result.trim().length > 0 ? result.trim() : null
}

self.onmessage = (e: MessageEvent<ScrambleWorkerRequest>) => {
  const { requestId, eventId, mode = "single", seed, count } = e.data

  try {
    // Square-1: use dedicated TNoodle solver (pure JS, no csTimer dependency)
    if (eventId === "sq1") {
      if (mode === "sequence") {
        const sequenceCount = Math.floor(count ?? 0)
        const scrambles: string[] = []
        for (let i = 0; i < sequenceCount; i++) {
          scrambles.push(generateSquare1Scramble())
        }
        self.postMessage({
          requestId,
          eventId,
          scramble: null,
          scrambles,
        } satisfies ScrambleWorkerResponse)
        return
      }

      const scramble = generateSquare1Scramble()
      self.postMessage({
        requestId,
        eventId,
        scramble,
      } satisfies ScrambleWorkerResponse)
      return
    }

    // Seeded sequence mode (used by comp sim)
    if (mode === "sequence") {
      if (typeof seed !== "string" || !Number.isFinite(count) || (count ?? 0) < 1) {
        self.postMessage({
          requestId,
          eventId,
          scramble: null,
          error: "Sequence requests require a seed and positive count.",
        } satisfies ScrambleWorkerResponse)
        return
      }

      setSeed(seed)
      const sequenceCount = Math.floor(count ?? 0)
      const scrambles: string[] = []
      for (let i = 0; i < sequenceCount; i++) {
        const s = generateCstimerScramble(eventId)
        scrambles.push(s ?? generateScramble(eventId))
      }

      self.postMessage({
        requestId,
        eventId,
        scramble: null,
        scrambles,
      } satisfies ScrambleWorkerResponse)
      return
    }

    // Single scramble: try cstimer_module first (WCA random-state), then fallback for non-WCA events
    const scramble = generateCstimerScramble(eventId) ?? generateScramble(eventId)

    self.postMessage({
      requestId,
      eventId,
      scramble: scramble || null,
      warning: scramble ? undefined : "Failed to generate scramble",
    } satisfies ScrambleWorkerResponse)
  } catch (err) {
    // If cstimer_module throws, fall back to local generator
    const fallback = generateScramble(eventId)
    self.postMessage({
      requestId,
      eventId,
      scramble: fallback || null,
      warning: fallback
        ? undefined
        : (err instanceof Error ? err.message : "Scramble generation failed"),
    } satisfies ScrambleWorkerResponse)
  }
}
