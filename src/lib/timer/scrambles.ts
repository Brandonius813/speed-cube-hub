"use client"

import { getScramble as cstimerGetScramble, setSeed as cstimerSetSeed } from "cstimer_module"
import type { WcaEventId } from "@/lib/constants"

// Map WCA event IDs to cstimer_module scramble type strings
// (verified from csTimer source: src/js/scramble/scramble.js + src/lang/en-us.js)
const CSTIMER_TYPE_MAP: Record<string, string> = {
  // WCA events
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
  // Big cubes (T139)
  "888": "888",
  "999": "999",
  "101010": "101010",
  "111111": "111111",
  // Non-WCA puzzles (T140/T141)
  gear: "gearso",
  redi: "rediso",
  ivy: "ivyso",
  fto: "ftoso",
  mpyr: "mpyrso",
  heli: "heli",
  curvycop: "helicv",
  sq2: "sq2",
  "223": "223",
  "233": "233",
  "334": "334",
  "335": "335",
  giga: "giga",
  icosamate: "ctico",
  ufo: "ufo",
  "15puzzle": "15prp",
  // Relay events (T142)
  relay234: "r234w",
  relay2345: "r2345w",
  relay23456: "r23456w",
  relay234567: "r234567w",
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

// cstimer_module returns "" for 5x5, 6x6, 7x7, and Megaminx (not implemented in the npm package).
// WCA uses random-move scrambles for these events anyway, so we generate our own.
const rnd = (n: number) => Math.floor(Math.random() * n)
const MODS = ["", "'", "2"]

function randomMovesScramble(faces: string[], count: number): string {
  // Track axis to avoid consecutive moves on the same axis
  const axisOf = (f: string) => {
    const base = f.replace(/^3/, "").replace(/w$/, "")
    if ("UD".includes(base)) return 0
    if ("LR".includes(base)) return 1
    return 2
  }
  const moves: string[] = []
  let lastAxis = -1
  for (let i = 0; i < count; i++) {
    let face: string
    do { face = faces[rnd(faces.length)] } while (axisOf(face) === lastAxis)
    lastAxis = axisOf(face)
    moves.push(face + MODS[rnd(3)])
  }
  return moves.join(" ")
}

function generateFallbackScramble(eventId: string): string {
  if (eventId === "555") {
    return randomMovesScramble(
      ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw"],
      60
    )
  }
  if (eventId === "666") {
    return randomMovesScramble(
      ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"],
      80
    )
  }
  if (eventId === "777") {
    return randomMovesScramble(
      ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"],
      100
    )
  }
  if (eventId === "minx") {
    // WCA Megaminx format: 7 rows of 5 R/D pairs + 1 U move
    const rows: string[] = []
    for (let r = 0; r < 7; r++) {
      const row: string[] = []
      for (let i = 0; i < 5; i++) {
        row.push(rnd(2) === 0 ? "R++" : "R--")
        row.push(rnd(2) === 0 ? "D++" : "D--")
      }
      row.push(rnd(2) === 0 ? "U" : "U'")
      rows.push(row.join(" "))
    }
    return rows.join("\n")
  }
  return ""
}

/**
 * Generate a scramble for the given WCA event.
 * Uses cstimer_module (same engine as csTimer) for random-state scrambles.
 * Falls back to random-move generation for events the npm package doesn't support
 * (5x5, 6x6, 7x7, Megaminx) — WCA uses random-move for these anyway.
 * Runs entirely client-side — no API calls needed.
 */
export function generateScramble(eventId: string): string {
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

    const result = cstimerGetScramble(cstimerType)
    // cstimer_module returns "" for some events (5x5, 6x6, 7x7, Megaminx) — use fallback
    return result || generateFallbackScramble(eventId)
  } catch (err) {
    console.error("cstimer_module scramble generation failed:", err)
    return generateFallbackScramble(eventId) || "Error generating scramble — try refreshing"
  }
}

/**
 * Generate a training scramble using a cstimer_module type string directly.
 * Training types (PLL, OLL, F2L, etc.) use different scramble generators
 * than the standard event scrambles.
 *
 * @param cstimerType - The cstimer scramble type (e.g., "pll", "oll")
 * @param caseFilter - Optional array of case indices to pick from.
 *                     If provided, picks a random case from the array.
 *                     If null/undefined, generates a random case.
 */
export function generateTrainingScramble(
  cstimerType: string,
  caseFilter?: number[] | null
): string {
  try {
    if (caseFilter && caseFilter.length > 0) {
      const caseIndex = caseFilter[Math.floor(Math.random() * caseFilter.length)]
      return cstimerGetScramble(cstimerType, 0, caseIndex)
    }
    return cstimerGetScramble(cstimerType)
  } catch (err) {
    console.error("Training scramble generation failed:", err)
    return "Error generating scramble — try refreshing"
  }
}

export type ScrambleWithCase = {
  scramble: string
  caseIndex: number | null
}

/**
 * Generate a training scramble and return both the scramble text and case index.
 * Used by the timer to track which algorithm case each solve was for.
 */
export function generateTrainingScrambleWithCase(
  cstimerType: string,
  caseFilter?: number[] | null
): ScrambleWithCase {
  try {
    if (caseFilter && caseFilter.length > 0) {
      const caseIndex = caseFilter[Math.floor(Math.random() * caseFilter.length)]
      return { scramble: cstimerGetScramble(cstimerType, 0, caseIndex), caseIndex }
    }
    return { scramble: cstimerGetScramble(cstimerType), caseIndex: null }
  } catch (err) {
    console.error("Training scramble generation failed:", err)
    return { scramble: "Error generating scramble — try refreshing", caseIndex: null }
  }
}

/**
 * Pre-generate a scramble (for caching one ahead).
 * Accepts an optional cstimer type override for training scrambles.
 */
export function preGenerateScramble(
  eventId: string,
  trainingCstimerType?: string,
  caseFilter?: number[] | null
): string | null {
  try {
    if (trainingCstimerType) {
      return generateTrainingScramble(trainingCstimerType, caseFilter)
    }
    return generateScramble(eventId)
  } catch {
    return null
  }
}

/**
 * Pre-generate a scramble with case index tracking.
 */
export function preGenerateScrambleWithCase(
  eventId: string,
  trainingCstimerType?: string,
  caseFilter?: number[] | null
): ScrambleWithCase | null {
  try {
    if (trainingCstimerType) {
      return generateTrainingScrambleWithCase(trainingCstimerType, caseFilter)
    }
    return { scramble: generateScramble(eventId), caseIndex: null }
  } catch {
    return null
  }
}

// ---- Seeded scramble generation (for race mode) ----

/**
 * Set the scramble generator seed for deterministic scrambles.
 * Same seed → same scramble sequence. Call before generating scrambles.
 * Pass null to reset to random (crypto) seed.
 */
export function setScrambleSeed(seed: string | null): void {
  if (seed) {
    cstimerSetSeed(seed)
  } else {
    // Reset to crypto-random by setting a unique seed based on timestamp + random
    cstimerSetSeed(`${Date.now()}-${Math.random()}`)
  }
}

/**
 * Generate a batch of seeded scrambles for a given event.
 * Used for race mode: both players get the same scrambles from the same seed.
 *
 * @param eventId - WCA event ID
 * @param seed - Seed string (same seed = same scrambles)
 * @param count - Number of scrambles to generate
 */
export function generateSeededScrambles(
  eventId: string,
  seed: string,
  count: number
): string[] {
  cstimerSetSeed(seed)
  const scrambles: string[] = []
  for (let i = 0; i < count; i++) {
    scrambles.push(generateScramble(eventId))
  }
  // Reset to random seed after generating
  cstimerSetSeed(`${Date.now()}-${Math.random()}`)
  return scrambles
}
