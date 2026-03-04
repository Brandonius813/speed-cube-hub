/**
 * Optimal cross solver for 3x3 Rubik's cube.
 *
 * Uses BFS pruning tables to find optimal cross solutions for all 6 faces.
 * Each table maps a 4-edge state to the minimum number of moves to solve.
 * Tables are ~330KB each and built lazily on first use (<100ms per face).
 *
 * Edge slots: UF=0 UR=1 UB=2 UL=3 DF=4 DR=5 DB=6 DL=7 FR=8 FL=9 BR=10 BL=11
 */

// ── Move definitions ────────────────────────────────────────────────

type FaceMove = {
  cycle: readonly [number, number, number, number]
  flip: boolean // F and B quarter-turns flip edge orientation
}

/** The 6 basic face moves. Index: U=0 D=1 R=2 L=3 F=4 B=5 */
const FACE_MOVES: FaceMove[] = [
  { cycle: [0, 1, 2, 3], flip: false }, // U
  { cycle: [4, 5, 6, 7], flip: false }, // D
  { cycle: [8, 1, 10, 5], flip: false }, // R
  { cycle: [3, 9, 7, 11], flip: false }, // L
  { cycle: [0, 8, 4, 9], flip: true }, // F
  { cycle: [2, 11, 6, 10], flip: true }, // B
]

/** 18 move names: CW, CCW, 180 for each face */
const MOVE_NAMES = [
  "U", "U'", "U2",
  "D", "D'", "D2",
  "R", "R'", "R2",
  "L", "L'", "L2",
  "F", "F'", "F2",
  "B", "B'", "B2",
]

// ── Cross edge definitions per face ─────────────────────────────────

/** Which 4 edge pieces form the cross for each face */
const CROSS_EDGES: Record<string, readonly [number, number, number, number]> = {
  U: [0, 1, 2, 3],
  D: [4, 5, 6, 7],
  R: [1, 8, 5, 10],
  L: [3, 9, 7, 11],
  F: [0, 8, 4, 9],
  B: [2, 11, 6, 10],
}

const FACE_COLORS: Record<string, string> = {
  U: "White",
  D: "Yellow",
  R: "Red",
  L: "Orange",
  F: "Green",
  B: "Blue",
}

const FACE_ORDER = ["D", "U", "F", "B", "R", "L"]

// ── State encoding ──────────────────────────────────────────────────
// Each of 4 cross edges encoded as: slot * 2 + orientation (0-23)
// Total state = e0 * 24^3 + e1 * 24^2 + e2 * 24 + e3

const P3 = 13824 // 24^3
const P2 = 576 // 24^2
const P1 = 24
const TABLE_SIZE = 331776 // 24^4

type EdgeState = [number, number, number, number]

function encodeState(e: EdgeState): number {
  return e[0] * P3 + e[1] * P2 + e[2] * P1 + e[3]
}

function decodeState(key: number): EdgeState {
  return [
    Math.floor(key / P3),
    Math.floor((key % P3) / P2),
    Math.floor((key % P2) / P1),
    key % P1,
  ]
}

// ── Move application ────────────────────────────────────────────────

function applyMove(state: EdgeState, moveIdx: number): EdgeState {
  const result: EdgeState = [state[0], state[1], state[2], state[3]]
  const base = Math.floor(moveIdx / 3)
  const variant = moveIdx % 3
  const { cycle, flip } = FACE_MOVES[base]

  for (let i = 0; i < 4; i++) {
    const slot = result[i] >> 1
    const ori = result[i] & 1
    const pos = cycle.indexOf(slot)
    if (pos === -1) continue

    let newSlot: number
    let newOri = ori

    if (variant === 0) {
      // CW: next in cycle
      newSlot = cycle[(pos + 1) % 4]
      if (flip) newOri ^= 1
    } else if (variant === 1) {
      // CCW: previous in cycle
      newSlot = cycle[(pos + 3) % 4]
      if (flip) newOri ^= 1
    } else {
      // 180: skip one in cycle (no orientation change)
      newSlot = cycle[(pos + 2) % 4]
    }

    result[i] = (newSlot << 1) | newOri
  }

  return result
}

// ── BFS table builder ───────────────────────────────────────────────

const tables = new Map<string, Uint8Array>()

function buildTable(crossEdges: readonly [number, number, number, number]): Uint8Array {
  const table = new Uint8Array(TABLE_SIZE).fill(255)

  // Solved: each cross edge in its home slot with ori 0
  const solved: EdgeState = [
    crossEdges[0] << 1,
    crossEdges[1] << 1,
    crossEdges[2] << 1,
    crossEdges[3] << 1,
  ]
  const solvedKey = encodeState(solved)
  table[solvedKey] = 0

  let frontier = [solvedKey]
  let depth = 0

  while (frontier.length > 0 && depth < 8) {
    const next: number[] = []
    depth++

    for (const key of frontier) {
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

    frontier = next
  }

  return table
}

function getTable(face: string): Uint8Array {
  if (!tables.has(face)) {
    tables.set(face, buildTable(CROSS_EDGES[face]))
  }
  return tables.get(face)!
}

// ── Scramble parser ─────────────────────────────────────────────────

function parseScramble(scramble: string): Array<{ slot: number; ori: number }> {
  const positions = Array.from({ length: 12 }, (_, i) => ({ slot: i, ori: 0 }))

  if (!scramble.trim()) return positions

  const faceMap: Record<string, number> = {
    U: 0, D: 1, R: 2, L: 3, F: 4, B: 5,
  }

  for (const token of scramble.trim().split(/\s+/)) {
    const faceChar = token[0]
    const face = faceMap[faceChar]
    if (face === undefined) continue

    let variant = 0
    if (token.includes("'")) variant = 1
    else if (token.includes("2")) variant = 2

    const { cycle, flip } = FACE_MOVES[face]

    for (let p = 0; p < 12; p++) {
      const pos = cycle.indexOf(positions[p].slot)
      if (pos === -1) continue

      if (variant === 0) {
        positions[p].slot = cycle[(pos + 1) % 4]
        if (flip) positions[p].ori ^= 1
      } else if (variant === 1) {
        positions[p].slot = cycle[(pos + 3) % 4]
        if (flip) positions[p].ori ^= 1
      } else {
        positions[p].slot = cycle[(pos + 2) % 4]
      }
    }
  }

  return positions
}

// ── Solution finder ─────────────────────────────────────────────────

function extractCrossState(
  positions: Array<{ slot: number; ori: number }>,
  crossEdges: readonly [number, number, number, number]
): EdgeState {
  return [
    (positions[crossEdges[0]].slot << 1) | positions[crossEdges[0]].ori,
    (positions[crossEdges[1]].slot << 1) | positions[crossEdges[1]].ori,
    (positions[crossEdges[2]].slot << 1) | positions[crossEdges[2]].ori,
    (positions[crossEdges[3]].slot << 1) | positions[crossEdges[3]].ori,
  ]
}

function findSolution(table: Uint8Array, startState: EdgeState): number[] {
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

export type CrossSolution = {
  face: string
  color: string
  moves: string[]
  moveCount: number
}

export function solveCross(scramble: string): CrossSolution[] {
  const positions = parseScramble(scramble)

  const solutions: CrossSolution[] = FACE_ORDER.map((face) => {
    const crossEdges = CROSS_EDGES[face]
    const table = getTable(face)
    const state = extractCrossState(positions, crossEdges)
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

/** Warm up the BFS tables for D and U (most commonly used faces) */
export function warmUpTables(): void {
  getTable("D")
  getTable("U")
}
