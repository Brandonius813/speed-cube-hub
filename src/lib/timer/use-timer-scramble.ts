import { useRef, useState } from "react"
import { generateScramble, preGenerateScramble } from "@/lib/timer/scrambles"
import type { WcaEventId } from "@/lib/constants"

export function useTimerScramble() {
  const [currentScramble, setCurrentScramble] = useState<string | null>(null)
  const [isLoadingScramble, setIsLoadingScramble] = useState(false)
  const nextScrambleRef = useRef<string | null>(null)

  const loadScramble = async (eventId: WcaEventId) => {
    setIsLoadingScramble(true)
    try {
      if (nextScrambleRef.current) {
        setCurrentScramble(nextScrambleRef.current)
        nextScrambleRef.current = null
      } else {
        const scramble = await generateScramble(eventId)
        setCurrentScramble(scramble)
      }
    } catch (err) {
      console.error("Failed to generate scramble:", err)
      setCurrentScramble("Error generating scramble — try refreshing")
    } finally {
      setIsLoadingScramble(false)
    }

    preGenerateScramble(eventId)
      .then((s) => {
        nextScrambleRef.current = s
      })
      .catch(() => {
        // Pre-generation is optional — next scramble will generate on-demand
      })
  }

  const clearNextScramble = () => {
    nextScrambleRef.current = null
  }

  return { currentScramble, isLoadingScramble, loadScramble, clearNextScramble }
}
