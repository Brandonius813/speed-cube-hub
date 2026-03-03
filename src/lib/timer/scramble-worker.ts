// Web Worker for off-main-thread scramble generation.
// cstimer_module natively supports Worker context (isInWorker detection
// skips all window/document/DOM code via execMain guards).
import { generateScramble } from "./scrambles"

type ScrambleWorkerRequest = {
  requestId: number
  eventId: string
}

type ScrambleWorkerResponse = {
  requestId: number
  eventId: string
  scramble: string | null
  error?: string
}

self.onmessage = (e: MessageEvent<ScrambleWorkerRequest>) => {
  const { requestId, eventId } = e.data
  try {
    const scramble = generateScramble(eventId)
    const response: ScrambleWorkerResponse = { requestId, eventId, scramble }
    self.postMessage(response)
  } catch (err) {
    const response: ScrambleWorkerResponse = {
      requestId,
      eventId,
      scramble: null,
      error: err instanceof Error ? err.message : "unknown",
    }
    self.postMessage(response)
  }
}
