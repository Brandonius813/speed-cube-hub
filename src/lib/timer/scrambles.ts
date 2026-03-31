"use client"

import {
  getScramble as cstimerGetScramble,
  setSeed as cstimerSetSeed,
} from "cstimer_module"
import { generateSquare1Scramble } from "./square1"

type Rng = () => number

type RandomMoveConfig = {
  faces: readonly string[]
  count: number
  mods?: readonly string[]
}

const QUARTER_TURN_MODS = ["", "'", "2"] as const

/** Maps our event IDs to [cstimerType, length] for WCA random-state generation. */
const CSTIMER_EVENT_MAP: Record<string, [string, number]> = {
  "222": ["222so", 0],
  "333": ["333", 0],
  "444": ["444wca", 0],
  "555": ["555wca", 60],
  "666": ["666wca", 80],
  "777": ["777wca", 100],
  "333bf": ["333ni", 0],
  "444bf": ["444bld", 40],
  "555bf": ["555bld", 60],
  "333mbf": ["r3ni", 5],
  "333oh": ["333", 0],
  "333fm": ["333fm", 0],
  minx: ["mgmp", 70],
  pyram: ["pyrso", 10],
  clock: ["clkwca", 0],
  skewb: ["skbso", 0],
}

// --- Random-move fallback configs (non-WCA events only) ---

const EVENT_RANDOM_MOVE_CONFIG: Record<string, RandomMoveConfig> = {
  "888": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"], count: 120 },
  "999": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"], count: 140 },
  "101010": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"], count: 160 },
  "111111": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"], count: 180 },
}

let seededRng: Rng | null = null

function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(initialSeed: number): Rng {
  return () => {
    let t = (initialSeed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createSeededRng(seed: string): Rng {
  const hash = xmur3(seed)
  return mulberry32(hash())
}

function secureRandom(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0] / 4294967296
  }
  return Math.random()
}

function randomFloat(): number {
  if (seededRng) return seededRng()
  return secureRandom()
}

function randomInt(max: number): number {
  return Math.floor(randomFloat() * max)
}

function randomChoice<T>(values: readonly T[]): T {
  return values[randomInt(values.length)]
}

function axisOf(face: string): number {
  const base = face.replace(/^3/, "").replace(/w$/, "")
  if ("UD".includes(base)) return 0
  if ("LR".includes(base)) return 1
  return 2
}

function randomMovesScramble(config: RandomMoveConfig): string {
  const mods = config.mods ?? QUARTER_TURN_MODS
  const moves: string[] = []
  let lastAxis = -1

  for (let i = 0; i < config.count; i++) {
    let face = randomChoice(config.faces)
    while (axisOf(face) === lastAxis) {
      face = randomChoice(config.faces)
    }
    lastAxis = axisOf(face)
    moves.push(face + randomChoice(mods))
  }

  return moves.join(" ")
}

function generateFallbackScramble(eventId: string): string {
  if (eventId.startsWith("relay")) return generateRelayFallback(eventId)
  if (eventId === "sq1") return generateSquare1Scramble()

  const config = EVENT_RANDOM_MOVE_CONFIG[eventId]
  if (config) return randomMovesScramble(config)

  // Default: try as 333 random-move for truly unknown events
  return randomMovesScramble({ faces: ["U", "D", "L", "R", "F", "B"], count: 20 })
}

function generateRelayFallback(eventId: string): string {
  const chain: Record<string, string[]> = {
    relay234: ["222", "333", "444"],
    relay2345: ["222", "333", "444", "555"],
    relay23456: ["222", "333", "444", "555", "666"],
    relay234567: ["222", "333", "444", "555", "666", "777"],
  }
  const relayEvents = chain[eventId]
  if (!relayEvents) return ""
  return relayEvents
    .map((relayEvent, index) => `${index + 2}) ${generateScramble(relayEvent)}`)
    .join("\n")
}

/**
 * Generates a scramble for the given event.
 * WCA events use cstimer_module (random-state, WCA-compliant).
 * Non-WCA events use random-move fallback.
 */
export function generateScramble(eventId: string): string {
  if (eventId === "sq1") {
    return generateSquare1Scramble()
  }

  try {
    const mapping = CSTIMER_EVENT_MAP[eventId]
    if (mapping) {
      const [type, length] = mapping
      const result = cstimerGetScramble(type, length)
      if (typeof result === "string" && result.trim().length > 0) {
        return result.trim()
      }
    }
    return generateFallbackScramble(eventId)
  } catch {
    return generateFallbackScramble(eventId)
  }
}

/**
 * Sets a global seed for deterministic scramble generation.
 */
export function setScrambleSeed(seed: string | null): void {
  if (seed) {
    cstimerSetSeed(seed)
    seededRng = createSeededRng(seed)
  } else {
    seededRng = null
  }
}

/**
 * Deterministically generates a scramble sequence from a seed.
 */
export function generateSeededScrambles(
  eventId: string,
  seed: string,
  count: number
): string[] {
  cstimerSetSeed(seed)
  const previousRng = seededRng
  seededRng = createSeededRng(seed)

  try {
    const scrambles: string[] = []
    for (let i = 0; i < count; i++) {
      scrambles.push(generateScramble(eventId))
    }
    return scrambles
  } finally {
    seededRng = previousRng
  }
}
