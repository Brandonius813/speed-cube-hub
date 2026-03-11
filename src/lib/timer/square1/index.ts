import { FullCube, Search, type Square1Rng, initSquare1Search } from "./search"
import {
  Square1State,
  applySquare1Algorithm,
  formatSquare1Algorithm,
  parseSquare1Algorithm,
  renderSquare1Svg,
  renderSquare1SvgFromScramble,
  splitSquare1Tokens,
  type Square1Move,
} from "./state"

function xmur3(seed: string): () => number {
  let hash = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507)
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909)
    hash ^= hash >>> 16
    return hash >>> 0
  }
}

function mulberry32(seed: number): Square1Rng {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createSquare1SeededRng(seed: string): Square1Rng {
  const hash = xmur3(seed)
  return mulberry32(hash())
}

export function initSquare1Tnoodle(): void {
  initSquare1Search()
}

export function generateSquare1Scramble(rng?: Square1Rng): string {
  initSquare1Tnoodle()
  const search = new Search()
  const randomState = FullCube.randomCube(rng)
  const scramble = search.solution(randomState, Search.INVERSE_SOLUTION)
  if (!scramble) {
    throw new Error("Failed to generate Square-1 scramble.")
  }
  return scramble.trim()
}

export function generateSquare1ScrambleSequence({
  seed,
  count,
}: {
  seed: string
  count: number
}): string[] {
  const rng = createSquare1SeededRng(seed)
  return Array.from({ length: count }, () => generateSquare1Scramble(rng))
}

export {
  Square1State,
  applySquare1Algorithm,
  formatSquare1Algorithm,
  parseSquare1Algorithm,
  renderSquare1Svg,
  renderSquare1SvgFromScramble,
  splitSquare1Tokens,
}

export type {
  Square1Move,
  Square1Rng,
}
