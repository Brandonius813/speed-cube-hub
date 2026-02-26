import { useRef, useState } from "react"
import {
  generateScramble,
  generateTrainingScrambleWithCase,
  preGenerateScrambleWithCase,
  type ScrambleWithCase,
} from "@/lib/timer/scrambles"
import type { WcaEventId } from "@/lib/constants"

export function useTimerScramble() {
  const [currentScramble, setCurrentScramble] = useState<string | null>(null)
  const [currentCaseIndex, setCurrentCaseIndex] = useState<number | null>(null)
  const [isManualScramble, setIsManualScramble] = useState(false)
  const nextRef = useRef<ScrambleWithCase | null>(null)

  /**
   * Load a new scramble for the given event.
   * If trainingCstimerType is provided, generates a training scramble instead.
   * If caseFilter is provided, picks from selected cases only.
   */
  const loadScramble = (
    eventId: WcaEventId,
    trainingCstimerType?: string,
    caseFilter?: number[] | null
  ) => {
    setIsManualScramble(false)

    // Use pre-generated scramble if available, otherwise generate instantly
    if (nextRef.current) {
      setCurrentScramble(nextRef.current.scramble)
      setCurrentCaseIndex(nextRef.current.caseIndex)
      nextRef.current = null
    } else if (trainingCstimerType) {
      const result = generateTrainingScrambleWithCase(trainingCstimerType, caseFilter)
      setCurrentScramble(result.scramble)
      setCurrentCaseIndex(result.caseIndex)
    } else {
      setCurrentScramble(generateScramble(eventId))
      setCurrentCaseIndex(null)
    }

    // Pre-generate the next scramble (synchronous, <50ms)
    nextRef.current = preGenerateScrambleWithCase(eventId, trainingCstimerType, caseFilter)
  }

  const setManualScramble = (scramble: string) => {
    setCurrentScramble(scramble)
    setCurrentCaseIndex(null)
    setIsManualScramble(true)
  }

  const clearNextScramble = () => {
    nextRef.current = null
  }

  return {
    currentScramble,
    currentCaseIndex,
    isManualScramble,
    loadScramble,
    setManualScramble,
    clearNextScramble,
  }
}
