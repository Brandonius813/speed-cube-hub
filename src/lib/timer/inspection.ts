"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type InspectionState = "idle" | "inspecting" | "overtime" | "done"
export type InspectionVoiceGender = "female" | "male"

type InspectionOptions = {
  voice?: boolean
  voiceGender?: InspectionVoiceGender
}

type InspectionResult = {
  /** Seconds remaining (15 → 0, then negative for overtime) */
  secondsLeft: number
  /** Current inspection state */
  state: InspectionState
  /** Whether inspection is actively counting down */
  isInspecting: boolean
  /** Start the 15-second inspection countdown */
  startInspection: () => void
  /** Cancel inspection (e.g., user presses escape) */
  cancelInspection: () => void
  /** Mark inspection as done (timer started) — returns penalty if any */
  finishInspection: () => "+2" | "DNF" | null
}

/**
 * React hook for WCA inspection countdown.
 *
 * WCA rules:
 * - 15 seconds of inspection time
 * - Judge says "8 seconds" at 8s remaining (7 seconds elapsed)
 * - Judge says "12 seconds" at 12s remaining (3 seconds remaining)
 * - Starting after 15s but before 17s = +2 penalty
 * - Starting after 17s = DNF
 *
 * @param options.voice - Whether to play WCA voice warnings (default: true)
 * @param options.voiceGender - Preferred voice profile for alerts (default: "female")
 */
export function useInspection(options?: InspectionOptions): InspectionResult {
  const voiceEnabled = options?.voice !== false
  const voiceGender = options?.voiceGender ?? "female"

  const [state, setState] = useState<InspectionState>("idle")
  const [secondsLeft, setSecondsLeft] = useState(15)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const has8sWarned = useRef(false)
  const has12sWarned = useRef(false)

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return
    if (!("speechSynthesis" in window)) return

    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const voice = pickPreferredVoice(voices, voiceGender)
    if (voice) {
      utterance.voice = voice
    } else {
      // Fallback when browser voice metadata is sparse.
      utterance.pitch = voiceGender === "male" ? 0.85 : 1.15
    }
    utterance.rate = 1.2
    utterance.volume = 1.0
    window.speechSynthesis.speak(utterance)
  }, [voiceGender])

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startInspection = useCallback(() => {
    cleanup()
    // Clear any stale queued speech from a previous inspection run.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      // Prime voice loading on browsers that lazily initialize voice lists.
      window.speechSynthesis.getVoices()
    }
    setState("inspecting")
    setSecondsLeft(15)
    startTimeRef.current = Date.now()
    has8sWarned.current = false
    has12sWarned.current = false

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = 15 - elapsed

      setSecondsLeft(Math.ceil(remaining))

      // Voice warnings
      if (remaining <= 7 && !has8sWarned.current) {
        has8sWarned.current = true
        if (voiceEnabled) speak("8 seconds")
      }
      if (remaining <= 3 && !has12sWarned.current) {
        has12sWarned.current = true
        if (voiceEnabled) speak("12 seconds")
      }

      // Overtime (past 15s)
      if (remaining <= 0) {
        setState("overtime")
      }

      // Auto-DNF past 17s
      if (remaining <= -2) {
        cleanup()
        setState("done")
      }
    }, 100)
  }, [cleanup, speak, voiceEnabled])

  const cancelInspection = useCallback(() => {
    cleanup()
    setState("idle")
    setSecondsLeft(15)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
  }, [cleanup])

  const finishInspection = useCallback((): "+2" | "DNF" | null => {
    cleanup()
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    setState("done")

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }

    if (elapsed > 17) return "DNF"
    if (elapsed > 15) return "+2"
    return null
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    secondsLeft,
    state,
    isInspecting: state === "inspecting" || state === "overtime",
    startInspection,
    cancelInspection,
    finishInspection,
  }
}

const FEMALE_VOICE_HINTS = [
  "female",
  "woman",
  "samantha",
  "victoria",
  "zira",
  "hazel",
  "aria",
  "jenny",
  "allison",
  "ava",
  "emma",
  "karen",
  "susan",
  "zoe",
]

const MALE_VOICE_HINTS = [
  "male",
  "man",
  "david",
  "mark",
  "george",
  "james",
  "john",
  "alex",
  "fred",
  "daniel",
  "matthew",
  "thomas",
  "arthur",
  "richard",
]

function pickPreferredVoice(
  voices: SpeechSynthesisVoice[],
  voiceGender: InspectionVoiceGender
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"))
  const pool = englishVoices.length > 0 ? englishVoices : voices
  const hints = voiceGender === "male" ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS

  for (const hint of hints) {
    const match = pool.find((voice) => voice.name.toLowerCase().includes(hint))
    if (match) return match
  }

  return null
}
