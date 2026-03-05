"use client"

type Rng = () => number

type RandomMoveConfig = {
  faces: readonly string[]
  count: number
  mods?: readonly string[]
}

const QUARTER_TURN_MODS = ["", "'", "2"] as const
const TWO_WAY_MODS = ["", "'"] as const
const DEFAULT_EVENT_FALLBACK = "333"

const WCA_EVENTS_WITH_API = new Set([
  "222", "333", "444", "555", "666", "777",
  "333bf", "444bf", "555bf", "333mbf", "333oh", "333fm",
  "minx", "pyram", "clock", "skewb", "sq1",
])

const EVENT_RANDOM_MOVE_CONFIG: Record<string, RandomMoveConfig> = {
  "222": { faces: ["U", "D", "L", "R", "F", "B"], count: 11 },
  "333": { faces: ["U", "D", "L", "R", "F", "B"], count: 20 },
  "333bf": { faces: ["U", "D", "L", "R", "F", "B"], count: 20 },
  "333mbf": { faces: ["U", "D", "L", "R", "F", "B"], count: 20 },
  "333oh": { faces: ["U", "D", "L", "R", "F", "B"], count: 20 },
  "333fm": { faces: ["U", "D", "L", "R", "F", "B"], count: 20 },
  "444": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw"], count: 40 },
  "555": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw"], count: 60 },
  "666": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"], count: 80 },
  "777": { faces: ["U", "D", "L", "R", "F", "B", "Uw", "Dw", "Lw", "Rw", "Fw", "Bw", "3Uw", "3Dw", "3Lw", "3Rw", "3Fw", "3Bw"], count: 100 },
  pyram: { faces: ["U", "L", "R", "B"], count: 10, mods: TWO_WAY_MODS },
  skewb: { faces: ["U", "L", "R", "B"], count: 11, mods: TWO_WAY_MODS },
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

function generateMegaminxFallback(): string {
  const rows: string[] = []
  for (let r = 0; r < 7; r++) {
    const row: string[] = []
    for (let i = 0; i < 5; i++) {
      row.push(randomInt(2) === 0 ? "R++" : "R--")
      row.push(randomInt(2) === 0 ? "D++" : "D--")
    }
    row.push(randomInt(2) === 0 ? "U" : "U'")
    rows.push(row.join(" "))
  }
  return rows.join("\n")
}

function generateSquare1Fallback(): string {
  const turns: string[] = []
  for (let i = 0; i < 12; i++) {
    let top = randomInt(12) - 5
    const bottom = randomInt(12) - 5
    if (top === 0 && bottom === 0) top = 1
    turns.push(`(${top},${bottom})`)
    if (i < 11) turns.push("/")
  }
  return turns.join(" ")
}

function generateClockFallback(): string {
  const dials = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"]
  const oneSide = dials
    .map((dial) => {
      const shift = randomInt(12) - 5
      const sign = shift >= 0 ? "+" : ""
      return `${dial}${sign}${shift}`
    })
    .join(" ")
  const pinStates = ["UR", "DR", "DL", "UL"]
    .map((pin) => `${pin}${randomInt(2) === 0 ? "0" : "1"}`)
    .join(" ")
  return `${oneSide} ${pinStates} y2 ${oneSide}`
}

function normalizeMegaminxRows(scramble: string): string {
  if (scramble.includes("\n")) return scramble
  return scramble.replace(/\bU'?\s*/g, (match) => `${match.trimEnd()}\n`).trimEnd()
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
    .map((relayEvent, index) => `${index + 2}) ${generateFallbackScramble(relayEvent)}`)
    .join("\n")
}

function generateFallbackScramble(eventId: string): string {
  if (eventId === "minx") return generateMegaminxFallback()
  if (eventId === "sq1") return generateSquare1Fallback()
  if (eventId === "clock") return generateClockFallback()
  if (eventId.startsWith("relay")) return generateRelayFallback(eventId)

  const config = EVENT_RANDOM_MOVE_CONFIG[eventId]
  if (config) return randomMovesScramble(config)

  const defaultConfig = EVENT_RANDOM_MOVE_CONFIG[DEFAULT_EVENT_FALLBACK]
  return defaultConfig ? randomMovesScramble(defaultConfig) : "Scramble not available for this event"
}

/**
 * Fetches a scramble from the server-side cubing.js generator.
 * This is the preferred path for the timer worker.
 */
export async function fetchOfficialScramble(
  eventId: string,
  signal?: AbortSignal
): Promise<{ scramble: string | null; error?: string }> {
  if (!WCA_EVENTS_WITH_API.has(eventId)) {
    return { scramble: null, error: `No API scramble for ${eventId}` }
  }

  try {
    const response = await fetch(`/api/scramble?event=${encodeURIComponent(eventId)}`, {
      method: "GET",
      cache: "no-store",
      signal,
    })

    if (!response.ok) {
      return { scramble: null, error: `API status ${response.status}` }
    }

    const payload = (await response.json()) as { scramble?: unknown }
    if (typeof payload.scramble !== "string" || payload.scramble.trim().length === 0) {
      return { scramble: null, error: "API returned empty scramble" }
    }

    const raw = payload.scramble.trim()
    const normalized = eventId === "minx" ? normalizeMegaminxRows(raw) : raw
    return { scramble: normalized }
  } catch (err) {
    return {
      scramble: null,
      error: err instanceof Error ? err.message : "Failed to fetch scramble",
    }
  }
}

/**
 * Synchronous fallback scramble generator.
 * Non-timer tools use this path directly.
 */
export function generateScramble(eventId: string): string {
  try {
    return generateFallbackScramble(eventId)
  } catch {
    return "Error generating scramble — try refreshing"
  }
}

/**
 * Sets a global seed for deterministic local scramble generation.
 */
export function setScrambleSeed(seed: string | null): void {
  seededRng = seed ? createSeededRng(seed) : null
}

/**
 * Deterministically generates a scramble sequence from a seed.
 */
export function generateSeededScrambles(
  eventId: string,
  seed: string,
  count: number
): string[] {
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
