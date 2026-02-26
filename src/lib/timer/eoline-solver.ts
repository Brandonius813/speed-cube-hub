/**
 * EOLine analyzer and solver for the ZZ method.
 *
 * Analyzer: counts bad edges, checks DF/DB placement.
 * Solver: BFS pruning table finds optimal move sequence to solve EOLine.
 *
 * State space: EO (4096) × DF slot (12) × DB slot (12) = 589,824.
 * Table builds lazily in <200ms. Max solution depth: ~9 moves.
 *
 * Edge indices: UF=0 UR=1 UB=2 UL=3 DF=4 DR=5 DB=6 DL=7 FR=8 FL=9 BR=10 BL=11
 */

type FaceMove = {
  cycle: readonly [number, number, number, number]
  flip: boolean
}

const FACE_MOVES: FaceMove[] = [
  { cycle: [0, 1, 2, 3], flip: false },   // U
  { cycle: [4, 5, 6, 7], flip: false },   // D
  { cycle: [8, 1, 10, 5], flip: false },  // R
  { cycle: [3, 9, 7, 11], flip: false },  // L
  { cycle: [0, 8, 4, 9], flip: true },    // F
  { cycle: [2, 11, 6, 10], flip: true },  // B
]

type EdgeState = {
  perm: number[]
  orient: number[]
}

function createSolvedState(): EdgeState {
  return {
    perm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    orient: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }
}

function applyMove(state: EdgeState, moveIdx: number): EdgeState {
  const faceIdx = Math.floor(moveIdx / 3)
  const turnType = moveIdx % 3
  const move = FACE_MOVES[faceIdx]
  const perm = [...state.perm]
  const orient = [...state.orient]

  if (turnType === 2) {
    const [a, b, c, d] = move.cycle
    ;[perm[a], perm[c]] = [perm[c], perm[a]]
    ;[perm[b], perm[d]] = [perm[d], perm[b]]
    ;[orient[a], orient[c]] = [orient[c], orient[a]]
    ;[orient[b], orient[d]] = [orient[d], orient[b]]
  } else {
    const [a, b, c, d] = move.cycle
    if (turnType === 0) {
      const tmpP = perm[d], tmpO = orient[d]
      perm[d] = perm[c]; orient[d] = orient[c]
      perm[c] = perm[b]; orient[c] = orient[b]
      perm[b] = perm[a]; orient[b] = orient[a]
      perm[a] = tmpP; orient[a] = tmpO
    } else {
      const tmpP = perm[a], tmpO = orient[a]
      perm[a] = perm[b]; orient[a] = orient[b]
      perm[b] = perm[c]; orient[b] = orient[c]
      perm[c] = perm[d]; orient[c] = orient[d]
      perm[d] = tmpP; orient[d] = tmpO
    }
    if (move.flip) {
      for (const slot of move.cycle) {
        orient[slot] ^= 1
      }
    }
  }

  return { perm, orient }
}

function parseMove(token: string): number {
  const map: Record<string, number> = {
    U: 0, "U'": 1, U2: 2,
    D: 3, "D'": 4, D2: 5,
    R: 6, "R'": 7, R2: 8,
    L: 9, "L'": 10, L2: 11,
    F: 12, "F'": 13, F2: 14,
    B: 15, "B'": 16, B2: 17,
  }
  return map[token] ?? -1
}

function applyScramble(scramble: string): EdgeState {
  let current = createSolvedState()
  for (const token of scramble.trim().split(/\s+/)) {
    const idx = parseMove(token)
    if (idx >= 0) current = applyMove(current, idx)
  }
  return current
}

export type EOLineResult = {
  badEdgeCount: number
  badEdgeSlots: number[]
  badEdgeLabels: string[]
  dfSolved: boolean
  dbSolved: boolean
}

const EDGE_LABELS = ["UF", "UR", "UB", "UL", "DF", "DR", "DB", "DL", "FR", "FL", "BR", "BL"]

/**
 * Analyze a 3x3 scramble for ZZ EOLine:
 * - Count and locate bad (mis-oriented) edges
 * - Check if DF and DB edges are in place
 */
export function analyzeEOLine(scramble: string): EOLineResult {
  const state = applyScramble(scramble)

  const badEdgeSlots: number[] = []
  const badEdgeLabels: string[] = []
  for (let i = 0; i < 12; i++) {
    if (state.orient[i] !== 0) {
      badEdgeSlots.push(i)
      badEdgeLabels.push(EDGE_LABELS[i])
    }
  }

  const dfSolved = state.perm[4] === 4 && state.orient[4] === 0
  const dbSolved = state.perm[6] === 6 && state.orient[6] === 0

  return {
    badEdgeCount: badEdgeSlots.length,
    badEdgeSlots,
    badEdgeLabels,
    dfSolved,
    dbSolved,
  }
}

// ── BFS EOLine Solver ──────────────────────────────────────────

const MOVE_NAMES = [
  "U", "U'", "U2", "D", "D'", "D2",
  "R", "R'", "R2", "L", "L'", "L2",
  "F", "F'", "F2", "B", "B'", "B2",
]

const EOL_TABLE_SIZE = 4096 * 144

function encodeEOL(eo: number, df: number, db: number): number {
  return eo * 144 + df * 12 + db
}

/**
 * Apply a move to the compact EOLine state (eo bitmap + DF/DB positions).
 * EO bitmap: bit i = orientation of piece at slot i.
 * When a move cycles slots [a,b,c,d], pieces shift: a→b, b→c, c→d, d→a.
 * F and B quarter-turns flip edge orientations.
 */
function applyMoveCompact(
  eo: number, df: number, db: number, moveIdx: number
): [number, number, number] {
  const faceIdx = Math.floor(moveIdx / 3)
  const variant = moveIdx % 3
  const { cycle, flip } = FACE_MOVES[faceIdx]
  const [a, b, c, d] = cycle

  const bA = (eo >> a) & 1
  const bB = (eo >> b) & 1
  const bC = (eo >> c) & 1
  const bD = (eo >> d) & 1
  const mask = ~((1 << a) | (1 << b) | (1 << c) | (1 << d))
  let newEO = eo & mask
  let newDF = df
  let newDB = db

  if (variant === 2) {
    // 180°: swap opposite pairs, no flip
    newEO |= (bC << a) | (bD << b) | (bA << c) | (bB << d)
    if (df === a) newDF = c; else if (df === c) newDF = a
    else if (df === b) newDF = d; else if (df === d) newDF = b
    if (db === a) newDB = c; else if (db === c) newDB = a
    else if (db === b) newDB = d; else if (db === d) newDB = b
  } else {
    const f = flip ? 1 : 0
    if (variant === 0) {
      // CW: piece at a→b, b→c, c→d, d→a
      newEO |= ((bD ^ f) << a) | ((bA ^ f) << b) | ((bB ^ f) << c) | ((bC ^ f) << d)
      if (df === a) newDF = b; else if (df === b) newDF = c
      else if (df === c) newDF = d; else if (df === d) newDF = a
      if (db === a) newDB = b; else if (db === b) newDB = c
      else if (db === c) newDB = d; else if (db === d) newDB = a
    } else {
      // CCW: piece at a→d, b→a, c→b, d→c
      newEO |= ((bB ^ f) << a) | ((bC ^ f) << b) | ((bD ^ f) << c) | ((bA ^ f) << d)
      if (df === a) newDF = d; else if (df === b) newDF = a
      else if (df === c) newDF = b; else if (df === d) newDF = c
      if (db === a) newDB = d; else if (db === b) newDB = a
      else if (db === c) newDB = b; else if (db === d) newDB = c
    }
  }

  return [newEO, newDF, newDB]
}

let eoLineTable: Uint8Array | null = null

function getEOLineTable(): Uint8Array {
  if (eoLineTable) return eoLineTable

  const table = new Uint8Array(EOL_TABLE_SIZE).fill(255)
  // Goal: all edges oriented (eo=0), DF piece in slot 4, DB piece in slot 6
  const goalKey = encodeEOL(0, 4, 6)
  table[goalKey] = 0

  let frontier = [goalKey]
  let depth = 0

  while (frontier.length > 0 && depth < 9) {
    const next: number[] = []
    depth++
    for (const key of frontier) {
      const db = key % 12
      const df = Math.floor(key / 12) % 12
      const eo = Math.floor(key / 144)
      for (let move = 0; move < 18; move++) {
        const [nEO, nDF, nDB] = applyMoveCompact(eo, df, db, move)
        const nKey = encodeEOL(nEO, nDF, nDB)
        if (table[nKey] === 255) {
          table[nKey] = depth
          next.push(nKey)
        }
      }
    }
    frontier = next
  }

  eoLineTable = table
  return table
}

export type EOLineSolution = {
  moves: string[]
  moveCount: number
}

/**
 * Find optimal solution to solve EOLine (edge orientation + DF/DB line).
 * Returns the move sequence. moveCount = -1 if no solution found (depth > 9).
 */
export function solveEOLine(scramble: string): EOLineSolution {
  const state = applyScramble(scramble)

  // Extract compact state from full edge state
  let eo = 0
  for (let i = 0; i < 12; i++) {
    if (state.orient[i]) eo |= (1 << i)
  }
  let df = -1
  let db = -1
  for (let i = 0; i < 12; i++) {
    if (state.perm[i] === 4) df = i
    if (state.perm[i] === 6) db = i
  }

  const table = getEOLineTable()
  const startKey = encodeEOL(eo, df, db)
  let dist = table[startKey]

  if (dist === 255) return { moves: [], moveCount: -1 }
  if (dist === 0) return { moves: [], moveCount: 0 }

  // Follow decreasing distances to find optimal path
  const moves: number[] = []
  while (dist > 0) {
    for (let move = 0; move < 18; move++) {
      const [nEO, nDF, nDB] = applyMoveCompact(eo, df, db, move)
      if (table[encodeEOL(nEO, nDF, nDB)] === dist - 1) {
        moves.push(move)
        eo = nEO
        df = nDF
        db = nDB
        dist--
        break
      }
    }
  }

  return {
    moves: moves.map((m) => MOVE_NAMES[m]),
    moveCount: moves.length,
  }
}
