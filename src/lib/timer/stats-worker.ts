import {
  computeStat,
  computeAllMilestonesSliding,
  buildRollingArraySliding,
  type Penalty,
  type TimerSolve,
} from "@/lib/timer/stats"
import type {
  StatsSummary,
  StatsWorkerRequest,
  StatsWorkerResponse,
} from "@/lib/timer/stats-worker-types"

let currentSessionId = ""
let currentSolves: TimerSolve[] = []
let currentStatCols: [string, string] = ["ao5", "ao12"]
let currentMilestones: number[] = [5, 12, 25, 50, 100, 200, 500, 1000]
let version = 0

// Incremental caches — cleared on init/recompute/delete/update
let cachedRolling1: (number | null)[] = []
let cachedRolling2: (number | null)[] = []
let cachedBestSingle: number | null = null
let cachedValidSum = 0
let cachedValidCount = 0
let cachedBestByMilestone: Map<string, number | null> = new Map()
let cacheValid = false

function effectiveTime(solve: TimerSolve): number | null {
  if (solve.penalty === "DNF") return null
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

function clearCache(): void {
  cachedRolling1 = []
  cachedRolling2 = []
  cachedBestSingle = null
  cachedValidSum = 0
  cachedValidCount = 0
  cachedBestByMilestone = new Map()
  cacheValid = false
}

/** Full recomputation using O(n log k) sliding windows. */
function computeSummaryFull(
  solves: TimerSolve[],
  statCols: [string, string],
  milestones: number[]
): StatsSummary {
  cachedValidSum = 0
  cachedValidCount = 0
  cachedBestSingle = null

  for (const solve of solves) {
    const value = effectiveTime(solve)
    if (value !== null) {
      cachedValidSum += value
      cachedValidCount++
      if (cachedBestSingle === null || value < cachedBestSingle) {
        cachedBestSingle = value
      }
    }
  }

  const mean = cachedValidCount > 0
    ? Math.round(cachedValidSum / cachedValidCount)
    : null

  // Use single-pass sliding window for all milestones — O(n * sum(log k_i))
  const milestoneRows = computeAllMilestonesSliding(solves, milestones)
  cachedBestByMilestone = new Map()
  for (const row of milestoneRows) {
    cachedBestByMilestone.set(row.key, row.best)
  }

  // Use sliding window for rolling arrays — O(n log k) per column
  cachedRolling1 = buildRollingArraySliding(solves, statCols[0])
  cachedRolling2 = buildRollingArraySliding(solves, statCols[1])

  cacheValid = true
  return { best: cachedBestSingle, mean, milestoneRows, rolling1: cachedRolling1, rolling2: cachedRolling2 }
}

/** Incremental append — O(k log k) per milestone instead of O(n * k log k). */
function computeSummaryAppend(
  solves: TimerSolve[],
  newSolve: TimerSolve,
  statCols: [string, string],
  milestones: number[]
): StatsSummary {
  // Update best single and mean incrementally
  const newTime = effectiveTime(newSolve)
  if (newTime !== null) {
    cachedValidSum += newTime
    cachedValidCount++
    if (cachedBestSingle === null || newTime < cachedBestSingle) {
      cachedBestSingle = newTime
    }
  }

  const mean = cachedValidCount > 0
    ? Math.round(cachedValidSum / cachedValidCount)
    : null

  // Rolling arrays — only compute the new tail entry
  const n1 = parseInt(statCols[0].slice(2), 10)
  const n2 = parseInt(statCols[1].slice(2), 10)

  const newRolling1 = solves.length >= n1
    ? computeStat(solves.slice(-n1), statCols[0])
    : null
  cachedRolling1.push(newRolling1)

  const newRolling2 = solves.length >= n2
    ? computeStat(solves.slice(-n2), statCols[1])
    : null
  cachedRolling2.push(newRolling2)

  // Milestone rows — only compute the newest trailing window per milestone
  const milestoneRows = milestones
    .filter((n) => solves.length >= n)
    .map((n) => {
      const key = `ao${n}`

      // cur = newest trailing window (same as computeStat on full array)
      const cur = solves.length >= n
        ? computeStat(solves.slice(-n), key)
        : null

      // For best: compare newest window with cached best
      let best = cachedBestByMilestone.get(key) ?? null
      if (cur !== null && (best === null || cur < best)) {
        best = cur
      }
      cachedBestByMilestone.set(key, best)

      return { key, cur, best }
    })

  return { best: cachedBestSingle, mean, milestoneRows, rolling1: cachedRolling1, rolling2: cachedRolling2 }
}

function postSnapshot(summary: StatsSummary, startMs: number): void {
  version += 1
  const message: StatsWorkerResponse = {
    type: "snapshot",
    sessionId: currentSessionId,
    version,
    summary,
    statCols: currentStatCols,
    latencyMs: Math.round((performance.now() - startMs) * 100) / 100,
  }
  self.postMessage(message)
}

function updatePenalty(id: string, penalty: Penalty): void {
  currentSolves = currentSolves.map((solve) =>
    solve.id === id ? { ...solve, penalty } : solve
  )
}

function deleteSolve(id: string): void {
  currentSolves = currentSolves.filter((solve) => solve.id !== id)
}

function handleMessage(message: StatsWorkerRequest): void {
  const startMs = performance.now()

  switch (message.type) {
    case "init":
      currentSessionId = message.sessionId
      currentSolves = [...message.solves]
      currentStatCols = message.statCols
      currentMilestones = [...message.milestones]
      clearCache()
      postSnapshot(
        computeSummaryFull(currentSolves, currentStatCols, currentMilestones),
        startMs
      )
      return

    case "append": {
      if (message.sessionId !== currentSessionId) return
      currentSolves = [...currentSolves, message.solve]
      const summary = cacheValid
        ? computeSummaryAppend(currentSolves, message.solve, currentStatCols, currentMilestones)
        : computeSummaryFull(currentSolves, currentStatCols, currentMilestones)
      postSnapshot(summary, startMs)
      return
    }

    case "update":
      if (message.sessionId !== currentSessionId) return
      updatePenalty(message.id, message.penalty)
      clearCache()
      postSnapshot(
        computeSummaryFull(currentSolves, currentStatCols, currentMilestones),
        startMs
      )
      return

    case "delete":
      if (message.sessionId !== currentSessionId) return
      deleteSolve(message.id)
      clearCache()
      postSnapshot(
        computeSummaryFull(currentSolves, currentStatCols, currentMilestones),
        startMs
      )
      return

    case "recompute":
      if (message.sessionId !== currentSessionId && !message.solves) {
        return
      }
      if (message.solves) {
        currentSolves = [...message.solves]
        currentSessionId = message.sessionId
      }
      if (message.statCols) currentStatCols = message.statCols
      if (message.milestones) currentMilestones = [...message.milestones]
      clearCache()
      postSnapshot(
        computeSummaryFull(currentSolves, currentStatCols, currentMilestones),
        startMs
      )
      return

    default: {
      const neverMessage: never = message
      throw new Error(`Unhandled stats worker message: ${JSON.stringify(neverMessage)}`)
    }
  }
}

self.onmessage = (event: MessageEvent<StatsWorkerRequest>) => {
  try {
    handleMessage(event.data)
  } catch (error) {
    const message: StatsWorkerResponse = {
      type: "error",
      sessionId: currentSessionId,
      message: error instanceof Error ? error.message : "Unknown stats worker error",
    }
    self.postMessage(message)
  }
}
