"use client"

import type { WcaEventId } from "@/lib/constants"

// ─── Random-move scramble generator (built-in, always works) ─────────

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

// ─── Main export (tries cubing.js, falls back to random-move) ───────

// Map WCA event IDs to cubing.js event IDs
const CUBING_EVENT_MAP: Record<string, string> = {
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

// Track whether cubing.js works in this environment
let cubingAvailable: boolean | null = null

/**
 * Generate a scramble for the given WCA event.
 * Tries cubing.js (random-state) first, falls back to random-move if it fails.
 */
export async function generateScramble(eventId: WcaEventId): Promise<string> {
  // If we already know cubing.js doesn't work, skip it
  if (cubingAvailable === false) {
    return generateRandomMoveScramble(eventId)
  }

  const cubingEventId = CUBING_EVENT_MAP[eventId]
  if (!cubingEventId) {
    return generateRandomMoveScramble(eventId)
  }

  try {
    const { randomScrambleForEvent } = await import("cubing/scramble")
    const scramble = await randomScrambleForEvent(cubingEventId)
    cubingAvailable = true
    return scramble.toString()
  } catch {
    // cubing.js failed (common in Next.js due to Web Worker issues)
    // Fall back to random-move scrambles permanently for this session
    cubingAvailable = false
    console.warn("cubing.js unavailable, using random-move scrambles")
    return generateRandomMoveScramble(eventId)
  }
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
