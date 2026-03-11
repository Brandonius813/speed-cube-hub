// Web Worker for off-main-thread scramble generation.
import { generateScramble } from "./scrambles"
import {
  generateSquare1Scramble,
  generateSquare1ScrambleSequence,
} from "./square1"

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

const CUBING_EVENT_MAP: Record<string, string> = {
  "222": "222",
  "333": "333",
  "444": "444",
  "555": "555",
  "666": "666",
  "777": "777",
  "333bf": "333bf",
  "444bf": "444bf",
  "555bf": "555bf",
  "333mbf": "333",
  "333oh": "333",
  "333fm": "333",
  minx: "minx",
  pyram: "pyram",
  clock: "clock",
  skewb: "skewb",
  sq1: "sq1",
}

let randomScrambleForEventFnPromise: Promise<((eventId: string) => Promise<{ toString(): string }>) | null> | null = null

function getRandomScrambleForEvent() {
  if (!randomScrambleForEventFnPromise) {
    randomScrambleForEventFnPromise = import("cubing/scramble")
      .then((module) => module.randomScrambleForEvent)
      .catch(() => null)
  }
  return randomScrambleForEventFnPromise
}

async function generateOfficialScrambleLocally(eventId: string): Promise<string | null> {
  const cubingEventId = CUBING_EVENT_MAP[eventId]
  if (!cubingEventId) return null
  const randomScrambleForEvent = await getRandomScrambleForEvent()
  if (!randomScrambleForEvent) return null
  const scramble = await randomScrambleForEvent(cubingEventId)
  const value = scramble.toString().trim()
  return value.length > 0 ? value : null
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      () => {
        clearTimeout(timeout)
        resolve(null)
      }
    )
  })
}

self.onmessage = async (e: MessageEvent<ScrambleWorkerRequest>) => {
  const { requestId, eventId, mode = "single", seed, count } = e.data

  try {
    if (eventId === "sq1") {
      if (mode === "sequence") {
        if (typeof seed !== "string" || !Number.isFinite(count) || (count ?? 0) < 1) {
          self.postMessage({
            requestId,
            eventId,
            scramble: null,
            error: "Square-1 sequence requests require a seed and positive count.",
          } satisfies ScrambleWorkerResponse)
          return
        }

        const sequenceCount = Math.floor(count ?? 0)
        self.postMessage({
          requestId,
          eventId,
          scramble: null,
          scrambles: generateSquare1ScrambleSequence({
            seed,
            count: sequenceCount,
          }),
        } satisfies ScrambleWorkerResponse)
        return
      }

      self.postMessage({
        requestId,
        eventId,
        scramble: generateSquare1Scramble(),
      } satisfies ScrambleWorkerResponse)
      return
    }

    // Primary path: generate official scramble locally in-worker (no API roundtrip).
    const official = await withTimeout(generateOfficialScrambleLocally(eventId), 1500)
    if (official) {
      const response: ScrambleWorkerResponse = {
        requestId,
        eventId,
        scramble: official,
      }
      self.postMessage(response)
      return
    }

    const fallback = generateScramble(eventId)
    const response: ScrambleWorkerResponse = {
      requestId,
      eventId,
      scramble: fallback || null,
      warning: fallback ? undefined : "Failed to generate scramble",
    }
    self.postMessage(response)
  } catch (err) {
    const fallback = generateScramble(eventId)
    const response: ScrambleWorkerResponse = {
      requestId,
      eventId,
      scramble: fallback || null,
      warning: fallback
        ? undefined
        : (err instanceof Error ? err.message : "Scramble API failed"),
    }
    self.postMessage(response)
  }
}
