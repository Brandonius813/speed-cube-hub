import { useRef, useState } from "react"
import {
  generateScramble,
  generateTrainingScramble,
  preGenerateScramble,
} from "@/lib/timer/scrambles"
import type { WcaEventId } from "@/lib/constants"

export function useTimerScramble() {
  const [currentScramble, setCurrentScramble] = useState<string | null>(null)
  const [isManualScramble, setIsManualScramble] = useState(false)
  const nextScrambleRef = useRef<string | null>(null)

  /**
   * Load a new scramble for the given event.
   * If trainingCstimerType is provided, generates a training scramble instead.
   */
  const loadScramble = (
    eventId: WcaEventId,
    trainingCstimerType?: string
  ) => {
    setIsManualScramble(false)

    // Use pre-generated scramble if available, otherwise generate instantly
    if (nextScrambleRef.current) {
      setCurrentScramble(nextScrambleRef.current)
      nextScrambleRef.current = null
    } else if (trainingCstimerType) {
      setCurrentScramble(generateTrainingScramble(trainingCstimerType))
    } else {
      setCurrentScramble(generateScramble(eventId))
    }

    // Pre-generate the next scramble (synchronous, <50ms)
    nextScrambleRef.current = preGenerateScramble(eventId, trainingCstimerType)
  }

  const setManualScramble = (scramble: string) => {
    setCurrentScramble(scramble)
    setIsManualScramble(true)
  }

  const clearNextScramble = () => {
    nextScrambleRef.current = null
  }

  return {
    currentScramble,
    isManualScramble,
    loadScramble,
    setManualScramble,
    clearNextScramble,
  }
}
