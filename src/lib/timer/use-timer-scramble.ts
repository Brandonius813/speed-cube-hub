import { useRef, useState } from "react"
import {
  generateScramble,
  generateTrainingScrambleWithCase,
  preGenerateScrambleWithCase,
  setScrambleSeed,
  type ScrambleWithCase,
} from "@/lib/timer/scrambles"
export function useTimerScramble() {
  const [currentScramble, setCurrentScramble] = useState<string | null>(null)
  const [currentCaseIndex, setCurrentCaseIndex] = useState<number | null>(null)
  const nextRef = useRef<ScrambleWithCase | null>(null)
  const seedRef = useRef<string | null>(null)
  const seedCounterRef = useRef(0)

  /**
   * Set the race seed. When set, scrambles are deterministic.
   * Call this before loadScramble to ensure the seed takes effect.
   */
  const setRaceSeed = (seed: string | null) => {
    seedRef.current = seed
    seedCounterRef.current = 0
    nextRef.current = null // Clear pre-generated scramble
    if (seed) {
      setScrambleSeed(seed)
    } else {
      setScrambleSeed(null)
    }
  }

  /**
   * Load a new scramble for the given event.
   * If trainingCstimerType is provided, generates a training scramble instead.
   * If caseFilter is provided, picks from selected cases only.
   */
  const loadScramble = (
    eventId: string,
    trainingCstimerType?: string,
    caseFilter?: number[] | null
  ) => {
    // When using a race seed, reset the seed state for deterministic generation.
    // Each scramble increments the counter so both players get the same Nth scramble.
    if (seedRef.current) {
      const counter = seedCounterRef.current++
      setScrambleSeed(`${seedRef.current}-${eventId}-${counter}`)
      nextRef.current = null // No pre-generation in seeded mode
    }

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

    // Pre-generate the next scramble (only when not in seeded mode)
    if (!seedRef.current) {
      nextRef.current = preGenerateScrambleWithCase(eventId, trainingCstimerType, caseFilter)
    }
  }

  const clearNextScramble = () => {
    nextRef.current = null
  }

  return {
    currentScramble,
    currentCaseIndex,
    loadScramble,
    clearNextScramble,
    setRaceSeed,
  }
}
