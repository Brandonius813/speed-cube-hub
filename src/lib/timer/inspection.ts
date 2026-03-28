"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { resolveInputTimestamp } from "@/lib/timer/input-timestamp"
import { getInspectionSnapshot } from "@/lib/timer/timing-core"

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
  startInspection: (timestamp?: number | null) => void
  /** Cancel inspection (e.g., user presses escape) */
  cancelInspection: () => void
  /** Mark inspection as done (timer started) — returns penalty if any */
  finishInspection: (timestamp?: number | null) => "+2" | "DNF" | null
}

/**
 * React hook for WCA inspection countdown.
 *
 * WCA rules:
 * - 15 seconds of inspection time
 * - Judge says "8 seconds" at 8 seconds elapsed (7s remaining)
 * - Judge says "12 seconds" at 12 seconds elapsed (3s remaining)
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
  const frameRef = useRef<number | null>(null)
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
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const startInspection = useCallback((timestamp?: number | null) => {
    cleanup()
    // Clear any stale queued speech from a previous inspection run.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      // Prime voice loading on browsers that lazily initialize voice lists.
      window.speechSynthesis.getVoices()
    }
    setState("inspecting")
    setSecondsLeft(15)
    startTimeRef.current = resolveInputTimestamp(timestamp)
    has8sWarned.current = false
    has12sWarned.current = false

    const tick = (ts: number) => {
      const snapshot = getInspectionSnapshot(startTimeRef.current, ts)
      setSecondsLeft(snapshot.secondsLeft)
      setState(snapshot.state)

      // Pre-fire ~300ms early to compensate for TTS startup latency.
      // WCA calls happen at 8s and 12s elapsed.
      if (snapshot.elapsedMs >= 7700 && !has8sWarned.current) {
        has8sWarned.current = true
        if (voiceEnabled) speak("8 seconds")
      }
      if (snapshot.elapsedMs >= 11700 && !has12sWarned.current) {
        has12sWarned.current = true
        if (voiceEnabled) speak("12 seconds")
      }

      if (snapshot.shouldAutoDnf) {
        cleanup()
        return
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [cleanup, speak, voiceEnabled])

  const cancelInspection = useCallback(() => {
    cleanup()
    setState("idle")
    setSecondsLeft(15)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
  }, [cleanup])

  const finishInspection = useCallback((timestamp?: number | null): "+2" | "DNF" | null => {
    cleanup()
    const snapshot = getInspectionSnapshot(
      startTimeRef.current,
      resolveInputTimestamp(timestamp)
    )
    setSecondsLeft(snapshot.secondsLeft)
    setState("done")

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }

    return snapshot.penalty
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
