/**
 * Pyraminx Analyzer.
 *
 * Analyzes a pyraminx scramble for:
 * - Tip status (solved or needs rotation)
 * - V-shaped start analysis (which face has the most correct pieces)
 *
 * Pyraminx tips (U, L, R, B) are the small rotatable tips.
 * A "V" is two adjacent edges solved on one face.
 */

type TipState = { axis: string; solved: boolean }
type VAnalysis = { axis: string; score: number }

export type PyraminxResult = {
  tips: TipState[]
  solvedTipCount: number
  vAnalysis: VAnalysis[]
  bestV: string
  bestVScore: number
}

// Simplified pyraminx analysis based on scramble moves
// Pyraminx moves: U, U', R, R', L, L', B, B', u, u', r, r', l, l', b, b'
// Lowercase = tip only

function parsePyraminxMoves(scramble: string): string[] {
  return scramble.trim().split(/\s+/).filter(Boolean)
}

export function analyzePyraminx(scramble: string): PyraminxResult {
  const moves = parsePyraminxMoves(scramble)

  // Track tip states (lowercase moves only affect tips)
  // Each tip starts solved; each lowercase move toggles it
  const tipState: Record<string, number> = { u: 0, l: 0, r: 0, b: 0 }

  for (const move of moves) {
    const base = move.replace("'", "").toLowerCase()
    // Only lowercase moves affect tips exclusively
    if (base === move.replace("'", "") && ["u", "l", "r", "b"].includes(base)) {
      const turns = move.includes("'") ? 2 : 1
      tipState[base] = (tipState[base] + turns) % 3
    }
  }

  const tips: TipState[] = [
    { axis: "U", solved: tipState.u === 0 },
    { axis: "L", solved: tipState.l === 0 },
    { axis: "R", solved: tipState.r === 0 },
    { axis: "B", solved: tipState.b === 0 },
  ]
  const solvedTipCount = tips.filter((t) => t.solved).length

  // V analysis: count uppercase moves per face to estimate disruption
  // Fewer moves on a face = more likely to have a solvable V
  const faceMoves: Record<string, number> = { U: 0, L: 0, R: 0, B: 0 }
  for (const move of moves) {
    const face = move[0].toUpperCase()
    if (face === move[0] && ["U", "L", "R", "B"].includes(face)) {
      faceMoves[face]++
    }
  }

  // Score: max 4, fewer face-specific moves = better V starting position
  const maxMoves = Math.max(...Object.values(faceMoves), 1)
  const vAnalysis: VAnalysis[] = Object.entries(faceMoves).map(([axis, count]) => ({
    axis,
    score: Math.max(0, 4 - Math.round((count / maxMoves) * 4)),
  }))

  vAnalysis.sort((a, b) => b.score - a.score)
  const bestV = vAnalysis[0]?.axis ?? "U"
  const bestVScore = vAnalysis[0]?.score ?? 0

  return { tips, solvedTipCount, vAnalysis, bestV, bestVScore }
}
