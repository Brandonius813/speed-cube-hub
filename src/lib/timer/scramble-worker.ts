// Web Worker for off-main-thread scramble generation.
// cstimer_module natively supports Worker context (isInWorker detection
// skips all window/document/DOM code via execMain guards).
import { generateScramble } from "./scrambles"

self.onmessage = (e: MessageEvent<{ eventId: string }>) => {
  try {
    const scramble = generateScramble(e.data.eventId)
    self.postMessage({ scramble })
  } catch {
    self.postMessage({ scramble: null })
  }
}
