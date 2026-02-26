/**
 * 2x2 Face Analyzer.
 *
 * Checks how many corners of each face are correctly placed and oriented.
 * Corner indices: UFR=0 UFL=1 UBL=2 UBR=3 DFR=4 DFL=5 DBL=6 DBR=7
 */

type CornerMove = {
  cycle: readonly [number, number, number, number]
  twist: readonly [number, number, number, number]
}

const MOVES: CornerMove[] = [
  { cycle: [0, 1, 2, 3], twist: [0, 0, 0, 0] },   // U
  { cycle: [4, 5, 6, 7], twist: [0, 0, 0, 0] },   // D
  { cycle: [0, 4, 7, 3], twist: [1, 2, 1, 2] },   // R
  { cycle: [1, 2, 6, 5], twist: [2, 1, 2, 1] },   // L
  { cycle: [0, 1, 5, 4], twist: [2, 1, 2, 1] },   // F
  { cycle: [2, 3, 7, 6], twist: [1, 2, 1, 2] },   // B
]

type State = { perm: number[]; orient: number[] }

function solved(): State {
  return {
    perm: [0, 1, 2, 3, 4, 5, 6, 7],
    orient: [0, 0, 0, 0, 0, 0, 0, 0],
  }
}

function applyMove(s: State, moveIdx: number): State {
  const faceIdx = Math.floor(moveIdx / 3)
  const turnType = moveIdx % 3
  const m = MOVES[faceIdx]
  const p = [...s.perm], o = [...s.orient]

  if (turnType === 2) {
    const [a, b, c, d] = m.cycle
    ;[p[a], p[c]] = [p[c], p[a]]
    ;[p[b], p[d]] = [p[d], p[b]]
    ;[o[a], o[c]] = [o[c], o[a]]
    ;[o[b], o[d]] = [o[d], o[b]]
  } else {
    const [a, b, c, d] = m.cycle
    if (turnType === 0) {
      const tp = p[d], to2 = o[d]
      p[d] = p[c]; o[d] = o[c]
      p[c] = p[b]; o[c] = o[b]
      p[b] = p[a]; o[b] = o[a]
      p[a] = tp; o[a] = to2
    } else {
      const tp = p[a], to2 = o[a]
      p[a] = p[b]; o[a] = o[b]
      p[b] = p[c]; o[b] = o[c]
      p[c] = p[d]; o[c] = o[d]
      p[d] = tp; o[d] = to2
    }
    if (turnType !== 2) {
      const twists = turnType === 1
        ? [m.twist[1], m.twist[0], m.twist[3], m.twist[2]]
        : m.twist
      for (let i = 0; i < 4; i++) {
        o[m.cycle[i]] = (o[m.cycle[i]] + twists[i]) % 3
      }
    }
  }

  return { perm: p, orient: o }
}

function parseMove(token: string): number {
  const map: Record<string, number> = {
    U: 0, "U'": 1, U2: 2, D: 3, "D'": 4, D2: 5,
    R: 6, "R'": 7, R2: 8, L: 9, "L'": 10, L2: 11,
    F: 12, "F'": 13, F2: 14, B: 15, "B'": 16, B2: 17,
  }
  return map[token] ?? -1
}

// Which corners belong to each face
const FACE_CORNERS: Record<string, number[]> = {
  U: [0, 1, 2, 3],
  D: [4, 5, 6, 7],
  R: [0, 3, 4, 7],
  L: [1, 2, 5, 6],
  F: [0, 1, 4, 5],
  B: [2, 3, 6, 7],
}

const FACE_COLORS: Record<string, string> = {
  U: "White", D: "Yellow", R: "Red", L: "Orange", F: "Green", B: "Blue",
}

// Check if a corner has the face's color showing on the correct face
// orientation: 0=UD sticker on UD face, 1=CW twist, 2=CCW twist
function hasColorOnFace(cornerIdx: number, orient: number, face: string): boolean {
  const onU = [0, 1, 2, 3].includes(cornerIdx)
  const onD = [4, 5, 6, 7].includes(cornerIdx)

  if (face === "U" || face === "D") {
    // The UD sticker is on top/bottom when orient === 0
    return orient === 0 && (face === "U" ? onU : onD)
  }

  // For side faces, the corner needs to have its side sticker showing
  // This is a simplification — checks if the piece belongs to the face
  return FACE_CORNERS[face].includes(cornerIdx)
}

export type TwoByTwoResult = {
  faces: { face: string; color: string; correctCount: number }[]
  bestFace: string
}

export function analyze2x2(scramble: string): TwoByTwoResult {
  let state = solved()
  for (const token of scramble.trim().split(/\s+/)) {
    const idx = parseMove(token)
    if (idx >= 0) state = applyMove(state, idx)
  }

  const faces: { face: string; color: string; correctCount: number }[] = []

  for (const face of ["U", "D", "R", "L", "F", "B"]) {
    const slots = FACE_CORNERS[face]
    let correct = 0
    for (const slot of slots) {
      // A corner is "correct" for this face if the right piece is there with right orientation
      if (state.perm[slot] === slot && state.orient[slot] === 0) {
        correct++
      }
    }
    faces.push({ face, color: FACE_COLORS[face], correctCount: correct })
  }

  const bestFace = faces.reduce((a, b) => (b.correctCount > a.correctCount ? b : a)).face

  return { faces, bestFace }
}
