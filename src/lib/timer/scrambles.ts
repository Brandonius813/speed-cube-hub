"use client"

import type { WcaEventId } from "@/lib/constants"

// Map our WCA event IDs to cubing.js event IDs
// Most are identical, but keeping the mapping explicit for safety
const EVENT_ID_MAP: Record<string, string> = {
  "222": "222",
  "333": "333",
  "444": "444",
  "555": "555",
  "666": "666",
  "777": "777",
  "333bf": "333bf",
  "444bf": "444bf",
  "555bf": "555bf",
  "333mbf": "333mbf",
  "333oh": "333oh",
  minx: "minx",
  pyram: "pyram",
  clock: "clock",
  skewb: "skewb",
  sq1: "sq1",
  "333fm": "333fm",
}

/**
 * Generate a scramble for the given WCA event.
 * Uses the `cubing` library (cubing.js) which runs scramble generation
 * in a Web Worker so it doesn't block the main thread.
 *
 * Returns the scramble as a string (e.g., "R U R' U' R' F R2 U' R' U' R U R' F'").
 */
export async function generateScramble(eventId: WcaEventId): Promise<string> {
  const cubingEventId = EVENT_ID_MAP[eventId]
  if (!cubingEventId) {
    throw new Error(`Unsupported event for scramble generation: ${eventId}`)
  }

  const { randomScrambleForEvent } = await import("cubing/scramble")
  const scramble = await randomScrambleForEvent(cubingEventId)
  return scramble.toString()
}

/**
 * Pre-generate a scramble and return it.
 * Useful for fetching the next scramble while the user is solving.
 * Returns null if generation fails (non-fatal).
 */
export async function preGenerateScramble(
  eventId: WcaEventId
): Promise<string | null> {
  try {
    return await generateScramble(eventId)
  } catch {
    console.error("Failed to pre-generate scramble")
    return null
  }
}
