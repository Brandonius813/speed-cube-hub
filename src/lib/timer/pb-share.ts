import type { TimerSolve } from "@/lib/timer/stats"

export type PbSingleCandidate = {
  solveId: string
  effectiveMs: number
  formattedTime: string
  scramble: string
}

function getEffectiveSingleMs(solve: TimerSolve): number | null {
  if (solve.penalty === "DNF") return null
  if (solve.penalty === "+2") return solve.time_ms + 2000
  return solve.time_ms
}

export function formatEffectiveTimeMs(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) return seconds.toFixed(2)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${(seconds % 60).toFixed(2).padStart(5, "0")}`
}

export function getLastSinglePbCandidate(
  solves: TimerSolve[]
): PbSingleCandidate | null {
  if (solves.length === 0) return null

  const last = solves[solves.length - 1]
  const lastEffective = getEffectiveSingleMs(last)
  if (lastEffective === null) return null

  let previousBest: number | null = null
  for (let i = 0; i < solves.length - 1; i++) {
    const candidate = getEffectiveSingleMs(solves[i])
    if (candidate === null) continue
    if (previousBest === null || candidate < previousBest) {
      previousBest = candidate
    }
  }

  if (previousBest !== null && lastEffective >= previousBest) return null

  return {
    solveId: last.id,
    effectiveMs: lastEffective,
    formattedTime: formatEffectiveTimeMs(lastEffective),
    scramble: last.scramble,
  }
}
