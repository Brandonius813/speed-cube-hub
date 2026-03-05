// Web Worker for off-main-thread scramble generation.
import { fetchOfficialScramble, generateScramble } from "./scrambles"

type ScrambleWorkerRequest = {
  requestId: number
  eventId: string
}

type ScrambleWorkerResponse = {
  requestId: number
  eventId: string
  scramble: string | null
  error?: string
  warning?: string
}

self.onmessage = async (e: MessageEvent<ScrambleWorkerRequest>) => {
  const { requestId, eventId } = e.data

  try {
    const apiResult = await fetchOfficialScramble(eventId)
    if (apiResult.scramble) {
      const response: ScrambleWorkerResponse = {
        requestId,
        eventId,
        scramble: apiResult.scramble,
      }
      self.postMessage(response)
      return
    }

    const fallback = generateScramble(eventId)
    const response: ScrambleWorkerResponse = {
      requestId,
      eventId,
      scramble: fallback || null,
      warning: apiResult.error ?? "Using local fallback scramble generator",
    }
    self.postMessage(response)
  } catch (err) {
    const fallback = generateScramble(eventId)
    const response: ScrambleWorkerResponse = {
      requestId,
      eventId,
      scramble: fallback || null,
      warning: err instanceof Error ? err.message : "Scramble API failed, using fallback",
    }
    self.postMessage(response)
  }
}
