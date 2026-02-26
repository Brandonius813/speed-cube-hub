/**
 * Optimal 2x2 face solver using BFS pruning tables.
 *
 * Finds the shortest move sequence to solve any face on a 2x2 cube.
 * Each table maps a 4-corner state to minimum moves. Tables are ~330KB each
 * and build lazily in <100ms per face.
 *
 * Corners: 0=UFR 1=UBR 2=UBL 3=UFL 4=DFR 5=DBR 6=DBL 7=DFL
 */

// ── Move definitions ────────────────────────────────────────────────

const CORNER_CYCLES = [
  [0, 1, 2, 3] as const,  // U
  [4, 5, 6, 7] as const,  // D
  [0, 4, 5, 1] as const,  // R
  [3, 2, 6, 7] as const,  // L
  [0, 3, 7, 4] as const,  // F
  [1, 5, 6, 2] as const,  // B
]

const CORNER_TWIST = [
  [0, 0, 0, 0],  // U — no twist
  [0, 0, 0, 0],  // D — no twist
  [2, 1, 2, 1],  // R — alternating
  [2, 1, 2, 1],  // L
  [1, 2, 1, 2],  // F
  [1, 2, 1, 2],  // B
]

const MOVE_NAMES = [
  "U", "U'", "U2", "D", "D'", "D2",
  "R", "R'", "R2", "L", "L'", "L2",
  "F", "F'", "F2", "B", "B'", "B2",
]

// ── Face definitions ────────────────────────────────────────────────

/** Which 4 corner pieces form each face */
const FACE_CORNERS: Record<string, readonly [number, number, number, number]> = {
  U: [0, 1, 2, 3],
  D: [4, 5, 6, 7],
  R: [0, 1, 4, 5],
  L: [2, 3, 6, 7],
  F: [0, 3, 4, 7],
  B: [1, 2, 5, 6],
}

/** Which 4 corner slots belong to each face */
const FACE_SLOTS: Record<string, number[]> = {
  U: [0, 1, 2, 3],
  D: [4, 5, 6, 7],
  R: [0, 1, 4, 5],
  L: [2, 3, 6, 7],
  F: [0, 3, 4, 7],
  B: [1, 2, 5, 6],
}

const FACE_COLORS: Record<string, string> = {
  U: "White", D: "Yellow", R: "Red", L: "Orange", F: "Green", B: "Blue",
}

const FACE_ORDER = ["U", "D", "R", "L", "F", "B"]

// ── State encoding ──────────────────────────────────────────────────
// 4 corners tracked. Each: slot * 3 + orientation = 0-23
// State = c0 * 24^3 + c1 * 24^2 + c2 * 24 + c3

const P3 = 13824 // 24^3
const P2 = 576   // 24^2
const P1 = 24
const TABLE_SIZE = 331776 // 24^4

type CornerState = [number, number, number, number]

function encodeState(c: CornerState): number {
  return c[0] * P3 + c[1] * P2 + c[2] * P1 + c[3]
}

function decodeState(key: number): CornerState {
  return [
    Math.floor(key / P3),
    Math.floor((key % P3) / P2),
    Math.floor((key % P2) / P1),
    key % P1,
  ]
}

// ── Move application ────────────────────────────────────────────────

function applyMove(state: CornerState, moveIdx: number): CornerState {
  const faceIdx = Math.floor(moveIdx / 3)
  const variant = moveIdx % 3
  const cycle = CORNER_CYCLES[faceIdx]
  const twist = CORNER_TWIST[faceIdx]
  const result: CornerState = [state[0], state[1], state[2], state[3]]

  for (let i = 0; i < 4; i++) {
    const pos = Math.floor(result[i] / 3)
    const ori = result[i] % 3
    const idx = cycle.indexOf(pos)
    if (idx === -1) continue

    if (variant === 2) {
      // 180°: swap to opposite, no twist
      result[i] = cycle[(idx + 2) % 4] * 3 + ori
    } else if (variant === 0) {
      // CW: move to next position, apply twist
      result[i] = cycle[(idx + 1) % 4] * 3 + (ori + twist[idx]) % 3
    } else {
      // CCW: move to previous position, apply twist
      result[i] = cycle[(idx + 3) % 4] * 3 + (ori + twist[idx]) % 3
    }
  }

  return result
}

// ── BFS table builder ───────────────────────────────────────────────

const tables = new Map<string, Uint8Array>()

/** All 24 permutations of indices 0-3 */
const PERMS_4 = (() => {
  const result: number[][] = []
  const perm = [0, 1, 2, 3]
  const generate = (k: number) => {
    if (k === 1) { result.push([...perm]); return }
    for (let i = 0; i < k; i++) {
      generate(k - 1)
      const j = k % 2 === 0 ? i : 0
      ;[perm[j], perm[k - 1]] = [perm[k - 1], perm[j]]
    }
  }
  generate(4)
  return result
})()

function buildTable(face: string): Uint8Array {
  const table = new Uint8Array(TABLE_SIZE).fill(255)
  const faceCorners = FACE_CORNERS[face]
  const faceSlots = FACE_SLOTS[face]

  // Goal: face corners in any arrangement within face slots, all ori=0
  const frontier: number[] = []
  for (const perm of PERMS_4) {
    const state: CornerState = [
      faceSlots[perm[0]] * 3,
      faceSlots[perm[1]] * 3,
      faceSlots[perm[2]] * 3,
      faceSlots[perm[3]] * 3,
    ]
    const key = encodeState(state)
    if (table[key] === 255) {
      table[key] = 0
      frontier.push(key)
    }
  }

  let current = frontier
  let depth = 0

  while (current.length > 0 && depth < 8) {
    const next: number[] = []
    depth++
    for (const key of current) {
      const state = decodeState(key)
      for (let move = 0; move < 18; move++) {
        const newState = applyMove(state, move)
        const newKey = encodeState(newState)
        if (table[newKey] === 255) {
          table[newKey] = depth
          next.push(newKey)
        }
      }
    }
    current = next
  }

  return table
}

function getTable(face: string): Uint8Array {
  if (!tables.has(face)) {
    tables.set(face, buildTable(face))
  }
  return tables.get(face)!
}

// ── Scramble parser ─────────────────────────────────────────────────

function parseScramble(scramble: string): { perm: number[]; orient: number[] } {
  const perm = [0, 1, 2, 3, 4, 5, 6, 7]
  const orient = [0, 0, 0, 0, 0, 0, 0, 0]

  if (!scramble.trim()) return { perm, orient }

  const faceMap: Record<string, number> = { U: 0, D: 1, R: 2, L: 3, F: 4, B: 5 }

  for (const token of scramble.trim().split(/\s+/)) {
    const face = faceMap[token[0]]
    if (face === undefined) continue

    let variant = 0
    if (token.includes("'")) variant = 1
    else if (token.includes("2")) variant = 2

    const cycle = CORNER_CYCLES[face]
    const twist = CORNER_TWIST[face]
    const sp = cycle.map((s) => perm[s])
    const so = cycle.map((s) => orient[s])

    if (variant === 2) {
      for (let i = 0; i < 4; i++) {
        perm[cycle[(i + 2) % 4]] = sp[i]
        orient[cycle[(i + 2) % 4]] = so[i]
      }
    } else {
      const shift = variant === 0 ? 1 : 3
      for (let i = 0; i < 4; i++) {
        perm[cycle[(i + shift) % 4]] = sp[i]
        orient[cycle[(i + shift) % 4]] = (so[i] + twist[i]) % 3
      }
    }
  }

  return { perm, orient }
}

// ── Solution finder ─────────────────────────────────────────────────

function extractFaceState(
  perm: number[],
  orient: number[],
  faceCorners: readonly [number, number, number, number]
): CornerState {
  const result: CornerState = [0, 0, 0, 0]
  for (let ci = 0; ci < 4; ci++) {
    const piece = faceCorners[ci]
    for (let s = 0; s < 8; s++) {
      if (perm[s] === piece) {
        result[ci] = s * 3 + orient[s]
        break
      }
    }
  }
  return result
}

function findSolution(table: Uint8Array, startState: CornerState): number[] {
  const moves: number[] = []
  let state = startState
  let dist = table[encodeState(state)]

  if (dist === 255 || dist === 0) return moves

  while (dist > 0) {
    for (let move = 0; move < 18; move++) {
      const newState = applyMove(state, move)
      if (table[encodeState(newState)] === dist - 1) {
        moves.push(move)
        state = newState
        dist--
        break
      }
    }
  }

  return moves
}

// ── Public API ──────────────────────────────────────────────────────

export type FaceSolution = {
  face: string
  color: string
  moves: string[]
  moveCount: number
}

export function solve2x2Face(scramble: string): FaceSolution[] {
  const { perm, orient } = parseScramble(scramble)

  const solutions: FaceSolution[] = FACE_ORDER.map((face) => {
    const faceCorners = FACE_CORNERS[face]
    const table = getTable(face)
    const state = extractFaceState(perm, orient, faceCorners)
    const moveIndices = findSolution(table, state)

    return {
      face,
      color: FACE_COLORS[face],
      moves: moveIndices.map((i) => MOVE_NAMES[i]),
      moveCount: moveIndices.length,
    }
  })

  solutions.sort((a, b) => a.moveCount - b.moveCount)
  return solutions
}
