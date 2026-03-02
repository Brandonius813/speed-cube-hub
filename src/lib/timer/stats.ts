export type Penalty = "+2" | "DNF" | null
export type TimerSolve = { id: string; time_ms: number; penalty: Penalty; scramble: string }

export const STAT_OPTIONS = ["mo3", "ao5", "ao10", "ao12", "ao25", "ao50", "ao100"]

function computeAo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  const times = solves.slice(-n).map((s) => s.penalty === "DNF" ? Infinity : s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms)
  if (times.filter((t) => t === Infinity).length > 1) return null
  const trimmed = [...times].sort((a, b) => a - b).slice(1, -1)
  if (trimmed.some((t) => t === Infinity)) return null
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
}

function bestAo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  let best: number | null = null
  for (let i = n; i <= solves.length; i++) {
    const r = computeAo(solves.slice(0, i), n)
    if (r !== null && (best === null || r < best)) best = r
  }
  return best
}

function computeMo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  const times = solves.slice(-n).map((s) => s.penalty === "DNF" ? Infinity : s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms)
  if (times.some((t) => t === Infinity)) return null
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

function bestMo(solves: TimerSolve[], n: number): number | null {
  if (solves.length < n) return null
  let best: number | null = null
  for (let i = n; i <= solves.length; i++) {
    const r = computeMo(solves.slice(0, i), n)
    if (r !== null && (best === null || r < best)) best = r
  }
  return best
}

export function computeStat(solves: TimerSolve[], key: string): number | null {
  const n = parseInt(key.slice(2))
  return key.startsWith("mo") ? computeMo(solves, n) : computeAo(solves, n)
}

export function bestStat(solves: TimerSolve[], key: string): number | null {
  const n = parseInt(key.slice(2))
  return key.startsWith("mo") ? bestMo(solves, n) : bestAo(solves, n)
}
