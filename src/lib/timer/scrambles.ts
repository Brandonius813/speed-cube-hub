"use client"

import type { WcaEventId } from "@/lib/constants"

// ─── Random-move scramble generator (fallback, always works) ─────────

type MoveSet = {
  faces: string[]
  modifiers: string[]
  length: number
}

const MOVE_SETS: Record<string, MoveSet> = {
  "222": { faces: ["R", "U", "F"], modifiers: ["", "'", "2"], length: 9 },
  "333": { faces: ["R", "U", "F", "L", "D", "B"], modifiers: ["", "'", "2"], length: 20 },
  "444": {
    faces: ["R", "U", "F", "L", "D", "B", "Rw", "Uw", "Fw"],
    modifiers: ["", "'", "2"],
    length: 44,
  },
  "555": {
    faces: ["R", "U", "F", "L", "D", "B", "Rw", "Uw", "Fw", "Lw", "Dw", "Bw"],
    modifiers: ["", "'", "2"],
    length: 60,
  },
  "666": {
    faces: ["R", "U", "F", "L", "D", "B", "Rw", "Uw", "Fw", "Lw", "Dw", "Bw", "3Rw", "3Uw", "3Fw"],
    modifiers: ["", "'", "2"],
    length: 80,
  },
  "777": {
    faces: ["R", "U", "F", "L", "D", "B", "Rw", "Uw", "Fw", "Lw", "Dw", "Bw", "3Rw", "3Uw", "3Fw"],
    modifiers: ["", "'", "2"],
    length: 100,
  },
  "333bf": { faces: ["R", "U", "F", "L", "D", "B"], modifiers: ["", "'", "2"], length: 20 },
  "444bf": {
    faces: ["R", "U", "F", "L", "D", "B", "Rw", "Uw", "Fw"],
    modifiers: ["", "'", "2"],
    length: 44,
  },
  "555bf": {
    faces: ["R", "U", "F", "L", "D", "B", "Rw", "Uw", "Fw", "Lw", "Dw", "Bw"],
    modifiers: ["", "'", "2"],
    length: 60,
  },
  "333mbf": { faces: ["R", "U", "F", "L", "D", "B"], modifiers: ["", "'", "2"], length: 20 },
  "333oh": { faces: ["R", "U", "F", "L", "D", "B"], modifiers: ["", "'", "2"], length: 20 },
  "333fm": { faces: ["R", "U", "F", "L", "D", "B"], modifiers: ["", "'", "2"], length: 20 },
  pyram: { faces: ["R", "U", "L", "B", "r", "u", "l", "b"], modifiers: ["", "'"], length: 11 },
  skewb: { faces: ["R", "U", "L", "B"], modifiers: ["", "'"], length: 9 },
  minx: {
    faces: ["R", "D"],
    modifiers: ["++", "--"],
    length: 77, // 7 rounds of 11 moves
  },
  clock: {
    faces: [],
    modifiers: [],
    length: 0, // special handling
  },
  sq1: {
    faces: [],
    modifiers: [],
    length: 0, // special handling
  },
}

// Opposite faces can't follow each other (e.g., R then L is redundant on 3x3)
const OPPOSITE_FACES: Record<string, string> = {
  R: "L", L: "R", U: "D", D: "U", F: "B", B: "F",
  Rw: "Lw", Lw: "Rw", Uw: "Dw", Dw: "Uw", Fw: "Bw", Bw: "Fw",
  "3Rw": "3Lw", "3Lw": "3Rw", "3Uw": "3Dw", "3Dw": "3Uw", "3Fw": "3Bw", "3Bw": "3Fw",
}

function generateRandomMoveScramble(eventId: string): string {
  const moveSet = MOVE_SETS[eventId]
  if (!moveSet) return "Scramble not available for this event"

  // Special handling for clock
  if (eventId === "clock") return generateClockScramble()
  // Special handling for square-1
  if (eventId === "sq1") return generateSq1Scramble()
  // Special handling for megaminx
  if (eventId === "minx") return generateMinxScramble()

  const moves: string[] = []
  let lastFace = ""
  let secondLastFace = ""

  for (let i = 0; i < moveSet.length; i++) {
    let face: string
    do {
      face = moveSet.faces[Math.floor(Math.random() * moveSet.faces.length)]
    } while (
      face === lastFace ||
      (face === OPPOSITE_FACES[lastFace] && secondLastFace === face)
    )

    const modifier = moveSet.modifiers[Math.floor(Math.random() * moveSet.modifiers.length)]
    moves.push(face + modifier)
    secondLastFace = lastFace
    lastFace = face
  }

  return moves.join(" ")
}

function generateClockScramble(): string {
  const pins = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"]
  const moves: string[] = []

  for (const pin of pins) {
    const turns = Math.floor(Math.random() * 12) - 5 // -5 to 6
    if (turns !== 0) {
      moves.push(`${pin}${turns > 0 ? turns + "+" : Math.abs(turns) + "-"}`)
    }
  }

  // Random pin states
  const pinStates = ["y2"]
  for (let i = 0; i < 4; i++) {
    if (Math.random() > 0.5) pinStates.push(["UR", "DR", "DL", "UL"][i])
  }

  return moves.join(" ") + " " + pinStates.join(" ")
}

function generateSq1Scramble(): string {
  const moves: string[] = []
  for (let i = 0; i < 13; i++) {
    const top = Math.floor(Math.random() * 12) - 5
    const bottom = Math.floor(Math.random() * 12) - 5
    moves.push(`(${top},${bottom})`)
  }
  return moves.join(" / ")
}

function generateMinxScramble(): string {
  const lines: string[] = []
  for (let round = 0; round < 7; round++) {
    const line: string[] = []
    for (let i = 0; i < 5; i++) {
      line.push(Math.random() > 0.5 ? "R++" : "R--")
      line.push(Math.random() > 0.5 ? "D++" : "D--")
    }
    line.push(Math.random() > 0.5 ? "U" : "U'")
    lines.push(line.join(" "))
  }
  return lines.join("\n")
}

// ─── API-based scramble generation (WCA random-state via cubing.js on server) ─

// Track whether the API route is available
let apiAvailable: boolean | null = null

/**
 * Fetch a WCA-standard random-state scramble from the server API.
 * cubing.js runs on the server side where Web Workers work correctly.
 * Returns null if the API is unavailable or fails.
 */
async function fetchScrambleFromApi(eventId: string): Promise<string | null> {
  // If we already know the API doesn't work, skip it
  if (apiAvailable === false) return null

  try {
    const res = await fetch(`/api/scramble?event=${eventId}`, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    })

    if (!res.ok) {
      apiAvailable = false
      return null
    }

    const data = await res.json()
    if (data.scramble && typeof data.scramble === "string") {
      apiAvailable = true
      return data.scramble
    }

    apiAvailable = false
    return null
  } catch {
    // Network error, timeout, or other failure
    apiAvailable = false
    console.warn("Scramble API unavailable, using random-move scrambles")
    return null
  }
}

// ─── Main export ─────────────────────────────────────────────────────

/**
 * Generate a scramble for the given WCA event.
 * Tries the server API (cubing.js random-state) first, falls back to
 * random-move scrambles if the API is unavailable.
 */
export async function generateScramble(eventId: WcaEventId): Promise<string> {
  // Try the API route first (WCA-standard random-state scrambles)
  const apiScramble = await fetchScrambleFromApi(eventId)
  if (apiScramble) return apiScramble

  // Fall back to random-move scrambles
  return generateRandomMoveScramble(eventId)
}

/**
 * Pre-generate a scramble. Returns null on failure.
 */
export async function preGenerateScramble(
  eventId: WcaEventId
): Promise<string | null> {
  try {
    return await generateScramble(eventId)
  } catch {
    return null
  }
}
