/**
 * Roux First Block (FB) analyzer.
 *
 * Checks which pieces of the DL-centered 1x2x3 block are solved after a scramble.
 * FB pieces: DL edge, FL edge, BL edge, DFL corner, DBL corner
 *
 * Edge indices: UF=0 UR=1 UB=2 UL=3 DF=4 DR=5 DB=6 DL=7 FR=8 FL=9 BR=10 BL=11
 * Corner indices: UFR=0 UFL=1 UBL=2 UBR=3 DFR=4 DFL=5 DBL=6 DBR=7
 */

type FaceMove = {
  edgeCycle: readonly [number, number, number, number]
  edgeFlip: boolean
  cornerCycle: readonly [number, number, number, number]
  cornerTwist: readonly [number, number, number, number] // 0=none, 1=CW, 2=CCW
}

const FACE_MOVES: FaceMove[] = [
  { edgeCycle: [0, 1, 2, 3], edgeFlip: false, cornerCycle: [0, 1, 2, 3], cornerTwist: [0, 0, 0, 0] },   // U
  { edgeCycle: [4, 5, 6, 7], edgeFlip: false, cornerCycle: [4, 5, 6, 7], cornerTwist: [0, 0, 0, 0] },   // D
  { edgeCycle: [8, 1, 10, 5], edgeFlip: false, cornerCycle: [0, 4, 7, 3], cornerTwist: [1, 2, 1, 2] },  // R
  { edgeCycle: [3, 9, 7, 11], edgeFlip: false, cornerCycle: [1, 2, 6, 5], cornerTwist: [2, 1, 2, 1] },  // L
  { edgeCycle: [0, 8, 4, 9], edgeFlip: true, cornerCycle: [0, 1, 5, 4], cornerTwist: [2, 1, 2, 1] },    // F
  { edgeCycle: [2, 11, 6, 10], edgeFlip: true, cornerCycle: [2, 3, 7, 6], cornerTwist: [1, 2, 1, 2] },  // B
]

type State = {
  edgePerm: number[]
  edgeOrient: number[]
  cornerPerm: number[]
  cornerOrient: number[]
}

function solved(): State {
  return {
    edgePerm: Array.from({ length: 12 }, (_, i) => i),
    edgeOrient: new Array(12).fill(0),
    cornerPerm: Array.from({ length: 8 }, (_, i) => i),
    cornerOrient: new Array(8).fill(0),
  }
}

function applyMove(s: State, moveIdx: number): State {
  const faceIdx = Math.floor(moveIdx / 3)
  const turnType = moveIdx % 3
  const m = FACE_MOVES[faceIdx]
  const ep = [...s.edgePerm], eo = [...s.edgeOrient]
  const cp = [...s.cornerPerm], co = [...s.cornerOrient]

  const applyCycle = (arr: number[], cycle: readonly number[], times: number) => {
    for (let t = 0; t < times; t++) {
      const tmp = arr[cycle[3]]
      arr[cycle[3]] = arr[cycle[2]]
      arr[cycle[2]] = arr[cycle[1]]
      arr[cycle[1]] = arr[cycle[0]]
      arr[cycle[0]] = tmp
    }
  }

  const times = turnType === 2 ? 2 : 1
  const reverse = turnType === 1

  if (reverse) {
    applyCycle(ep, m.edgeCycle, 3)
    applyCycle(eo, m.edgeCycle, 3)
    applyCycle(cp, m.cornerCycle, 3)
    applyCycle(co, m.cornerCycle, 3)
  } else {
    applyCycle(ep, m.edgeCycle, times)
    applyCycle(eo, m.edgeCycle, times)
    applyCycle(cp, m.cornerCycle, times)
    applyCycle(co, m.cornerCycle, times)
  }

  // Edge orientation
  if (m.edgeFlip && turnType !== 2) {
    for (const slot of m.edgeCycle) eo[slot] ^= 1
  }

  // Corner orientation
  if (turnType !== 2) {
    const twists = reverse
      ? [m.cornerTwist[1], m.cornerTwist[0], m.cornerTwist[3], m.cornerTwist[2]]
      : m.cornerTwist
    for (let i = 0; i < 4; i++) {
      co[m.cornerCycle[i]] = (co[m.cornerCycle[i]] + twists[i]) % 3
    }
  }

  return { edgePerm: ep, edgeOrient: eo, cornerPerm: cp, cornerOrient: co }
}

function parseMove(token: string): number {
  const map: Record<string, number> = {
    U: 0, "U'": 1, U2: 2, D: 3, "D'": 4, D2: 5,
    R: 6, "R'": 7, R2: 8, L: 9, "L'": 10, L2: 11,
    F: 12, "F'": 13, F2: 14, B: 15, "B'": 16, B2: 17,
  }
  return map[token] ?? -1
}

export type RouxFBResult = {
  pieces: { name: string; solved: boolean }[]
  solvedCount: number
  totalCount: number
}

// FB pieces: DL(edge 7), FL(edge 9), BL(edge 11), DFL(corner 5), DBL(corner 6)
const FB_EDGES = [
  { slot: 7, name: "DL" },
  { slot: 9, name: "FL" },
  { slot: 11, name: "BL" },
]
const FB_CORNERS = [
  { slot: 5, name: "DFL" },
  { slot: 6, name: "DBL" },
]

export function analyzeRouxFB(scramble: string): RouxFBResult {
  let state = solved()
  for (const token of scramble.trim().split(/\s+/)) {
    const idx = parseMove(token)
    if (idx >= 0) state = applyMove(state, idx)
  }

  const pieces: { name: string; solved: boolean }[] = []

  for (const { slot, name } of FB_EDGES) {
    const isSolved = state.edgePerm[slot] === slot && state.edgeOrient[slot] === 0
    pieces.push({ name, solved: isSolved })
  }
  for (const { slot, name } of FB_CORNERS) {
    const isSolved = state.cornerPerm[slot] === slot && state.cornerOrient[slot] === 0
    pieces.push({ name, solved: isSolved })
  }

  const solvedCount = pieces.filter((p) => p.solved).length

  return { pieces, solvedCount, totalCount: pieces.length }
}
