"use client"

import { getScramble as cstimerGetScramble } from "cstimer_module"
import type { WcaEventId } from "@/lib/constants"

// Map WCA event IDs to cstimer_module scramble type strings
// (verified from csTimer source: src/js/scramble/scramble.js + src/lang/en-us.js)
const CSTIMER_TYPE_MAP: Record<string, string> = {
  "333": "333",
  "222": "222so",
  "444": "444wca",
  "555": "555wca",
  "666": "666wca",
  "777": "777wca",
  "333bf": "333ni",
  "444bf": "444bld",
  "555bf": "555bld",
  "333mbf": "333ni",
  "333oh": "333oh",
  "333fm": "333fm",
  pyram: "pyrso",
  skewb: "skbso",
  clock: "clkwca",
  sq1: "sqrs",
  minx: "mgmp",
}

// WCA regulation 4b3: 2x2 scrambles must require ≥4 moves to solve.
// csTimer's 2x2 scrambler occasionally generates easier states.
// We filter by scramble move count as a proxy (scrambles with <4 moves
// are trivially easy and violate the regulation).
const MIN_MOVES_222 = 4
const MAX_RETRIES = 10

function countMoves(scramble: string): number {
  return scramble.trim().split(/\s+/).length
}

/**
 * Generate a scramble for the given WCA event.
 * Uses cstimer_module (same engine as csTimer) for random-state scrambles.
 * Runs entirely client-side — no API calls needed.
 */
export function generateScramble(eventId: WcaEventId): string {
  const cstimerType = CSTIMER_TYPE_MAP[eventId]
  if (!cstimerType) return "Scramble not available for this event"

  try {
    // For 2x2, retry if scramble is too short (WCA requires ≥4 moves)
    if (eventId === "222") {
      for (let i = 0; i < MAX_RETRIES; i++) {
        const scramble = cstimerGetScramble(cstimerType)
        if (countMoves(scramble) >= MIN_MOVES_222) return scramble
      }
    }

    return cstimerGetScramble(cstimerType)
  } catch (err) {
    console.error("cstimer_module scramble generation failed:", err)
    return "Error generating scramble — try refreshing"
  }
}

/**
 * Pre-generate a scramble (for caching one ahead).
 */
export function preGenerateScramble(eventId: WcaEventId): string | null {
  try {
    return generateScramble(eventId)
  } catch {
    return null
  }
}
