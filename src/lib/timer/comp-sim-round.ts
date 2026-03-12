import { formatTimeMsCentiseconds } from "@/lib/timer/averages"

export type CompSimFormat = "single" | "mo3" | "ao5"

export type CompSimScene =
  | "off"
  | "quiet_local"
  | "school_gym"
  | "regional_floor"
  | "finals_stage"
  | "championship_hall"

export type CompSimEndedReason = "completed" | "cutoff_failed" | "time_limit_reached"

export type CompSimCutoffRule = {
  attempt: 1 | 2
  cutoffMs: number
}

export type CompSimWaitTimeRange = {
  minMs: number
  maxMs: number
}

export type CompSimRoundConfig = {
  format: CompSimFormat
  plannedSolveCount: number
  scene: CompSimScene
  intensity: number
  randomReactionsEnabled: boolean
  waitTimeRangeMs: CompSimWaitTimeRange
  cumulativeTimeLimitMs: number | null
  cutoff: CompSimCutoffRule | null
}

export type CompSimSolve = {
  time_ms: number
  penalty: "+2" | "DNF" | null
  scramble: string
}

export type CompSimRoundResult = {
  format: CompSimFormat
  completed: boolean
  isDnf: boolean
  resultMs: number | null
  display: string
  bestIdx: number | null
  worstIdx: number | null
}

export type CompSimCheckpointResult = {
  attempt: 1 | 2
  resultMs: number | null
  isDnf: boolean
  display: string
}

export const COMP_SIM_FORMAT_LABELS: Record<CompSimFormat, string> = {
  single: "Single",
  mo3: "Mo3",
  ao5: "Ao5",
}

export const COMP_SIM_SCENE_LABELS: Record<CompSimScene, string> = {
  off: "Off",
  quiet_local: "Quiet Local",
  school_gym: "School Gym",
  regional_floor: "Regional Floor",
  finals_stage: "Finals Stage",
  championship_hall: "Championship Hall",
}

export const DEFAULT_COMP_SIM_ROUND_CONFIG: CompSimRoundConfig = {
  format: "ao5",
  plannedSolveCount: 5,
  scene: "regional_floor",
  intensity: 55,
  randomReactionsEnabled: true,
  waitTimeRangeMs: {
    minMs: 30_000,
    maxMs: 150_000,
  },
  cumulativeTimeLimitMs: null,
  cutoff: null,
}

export function getPlannedSolveCount(format: CompSimFormat): number {
  switch (format) {
    case "single":
      return 1
    case "mo3":
      return 3
    case "ao5":
      return 5
  }
}

export function normalizeCompSimIntensity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COMP_SIM_ROUND_CONFIG.intensity
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function normalizeCompSimConfig(
  config: Partial<CompSimRoundConfig> | null | undefined
): CompSimRoundConfig {
  const format =
    config?.format == null || config.format === "single"
      ? DEFAULT_COMP_SIM_ROUND_CONFIG.format
      : config.format
  const plannedSolveCount = getPlannedSolveCount(format)
  const cutoff =
    format === "single" || !config?.cutoff
      ? null
      : {
          attempt: (config.cutoff.attempt === 2 ? 2 : 1) as 1 | 2,
          cutoffMs: Math.max(1, Math.round(config.cutoff.cutoffMs)),
        }

  const rawWaitMin =
    config?.waitTimeRangeMs?.minMs ?? DEFAULT_COMP_SIM_ROUND_CONFIG.waitTimeRangeMs.minMs
  const rawWaitMax =
    config?.waitTimeRangeMs?.maxMs ?? DEFAULT_COMP_SIM_ROUND_CONFIG.waitTimeRangeMs.maxMs
  const waitMin = Math.max(5_000, Math.round(Math.min(rawWaitMin, rawWaitMax)))
  const waitMax = Math.max(5_000, Math.round(Math.max(rawWaitMin, rawWaitMax)))

  return {
    format,
    plannedSolveCount,
    scene: config?.scene ?? DEFAULT_COMP_SIM_ROUND_CONFIG.scene,
    intensity: normalizeCompSimIntensity(
      config?.intensity ?? DEFAULT_COMP_SIM_ROUND_CONFIG.intensity
    ),
    randomReactionsEnabled:
      config?.randomReactionsEnabled ?? DEFAULT_COMP_SIM_ROUND_CONFIG.randomReactionsEnabled,
    waitTimeRangeMs: {
      minMs: waitMin,
      maxMs: waitMax,
    },
    cumulativeTimeLimitMs:
      config?.cumulativeTimeLimitMs == null
        ? null
        : Math.max(1000, Math.round(config.cumulativeTimeLimitMs)),
    cutoff,
  }
}

export function getCompSimFormatLabel(format: CompSimFormat): string {
  return COMP_SIM_FORMAT_LABELS[format]
}

export function getCompSimSceneLabel(scene: CompSimScene): string {
  return COMP_SIM_SCENE_LABELS[scene]
}

export function getCompSimEndedReasonLabel(reason: CompSimEndedReason): string {
  switch (reason) {
    case "completed":
      return "Completed"
    case "cutoff_failed":
      return "Cutoff Missed"
    case "time_limit_reached":
      return "Time Limit Reached"
  }
}

export function getEffectiveTime(solve: CompSimSolve): number {
  if (solve.penalty === "DNF") return Number.POSITIVE_INFINITY
  return solve.penalty === "+2" ? solve.time_ms + 2000 : solve.time_ms
}

export function getOfficialElapsedTime(solve: CompSimSolve): number {
  if (solve.penalty === "DNF") {
    return Math.max(0, solve.time_ms)
  }
  return getEffectiveTime(solve)
}

function fmtMs(ms: number): string {
  return formatTimeMsCentiseconds(ms)
}

function findBestIndex(times: number[]): number | null {
  let bestIdx = -1
  for (let i = 0; i < times.length; i++) {
    if (bestIdx === -1 || times[i] < times[bestIdx]) {
      bestIdx = i
    }
  }
  return bestIdx === -1 ? null : bestIdx
}

function findWorstIndex(times: number[]): number | null {
  let worstIdx = -1
  for (let i = 0; i < times.length; i++) {
    if (worstIdx === -1 || times[i] > times[worstIdx]) {
      worstIdx = i
    }
  }
  return worstIdx === -1 ? null : worstIdx
}

export function computeCompSimRoundResult(
  format: CompSimFormat,
  solves: CompSimSolve[]
): CompSimRoundResult {
  const expected = getPlannedSolveCount(format)
  if (solves.length < expected) {
    return {
      format,
      completed: false,
      isDnf: false,
      resultMs: null,
      display: "No Result",
      bestIdx: null,
      worstIdx: null,
    }
  }

  const times = solves.slice(0, expected).map(getEffectiveTime)

  if (format === "single") {
    const value = times[0]
    return {
      format,
      completed: true,
      isDnf: !Number.isFinite(value),
      resultMs: Number.isFinite(value) ? value : null,
      display: Number.isFinite(value) ? fmtMs(value) : "DNF",
      bestIdx: 0,
      worstIdx: 0,
    }
  }

  if (format === "mo3") {
    if (times.some((time) => !Number.isFinite(time))) {
      return {
        format,
        completed: true,
        isDnf: true,
        resultMs: null,
        display: "DNF",
        bestIdx: findBestIndex(times),
        worstIdx: findWorstIndex(times),
      }
    }

    const mean = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
    return {
      format,
      completed: true,
      isDnf: false,
      resultMs: mean,
      display: fmtMs(mean),
      bestIdx: findBestIndex(times),
      worstIdx: findWorstIndex(times),
    }
  }

  const dnfCount = times.filter((time) => !Number.isFinite(time)).length
  const bestIdx = findBestIndex(times)
  const worstIdx = findWorstIndex(times)

  if (dnfCount >= 2 || bestIdx == null || worstIdx == null) {
    return {
      format,
      completed: true,
      isDnf: true,
      resultMs: null,
      display: "DNF",
      bestIdx,
      worstIdx,
    }
  }

  const trimmed = times.filter((_, index) => index !== bestIdx && index !== worstIdx)
  if (trimmed.some((time) => !Number.isFinite(time))) {
    return {
      format,
      completed: true,
      isDnf: true,
      resultMs: null,
      display: "DNF",
      bestIdx,
      worstIdx,
    }
  }

  const average = Math.round(trimmed.reduce((sum, time) => sum + time, 0) / trimmed.length)
  return {
    format,
    completed: true,
    isDnf: false,
    resultMs: average,
    display: fmtMs(average),
    bestIdx,
    worstIdx,
  }
}

export function computeCompSimCheckpoint(
  solves: CompSimSolve[],
  attempt: 1 | 2
): CompSimCheckpointResult | null {
  if (solves.length < attempt) return null

  if (attempt === 1) {
    const value = getEffectiveTime(solves[0])
    return {
      attempt,
      resultMs: Number.isFinite(value) ? value : null,
      isDnf: !Number.isFinite(value),
      display: Number.isFinite(value) ? fmtMs(value) : "DNF",
    }
  }

  const firstTwo = solves.slice(0, 2).map(getEffectiveTime)
  if (firstTwo.some((time) => !Number.isFinite(time))) {
    return {
      attempt,
      resultMs: null,
      isDnf: true,
      display: "DNF",
    }
  }

  const mean = Math.round((firstTwo[0] + firstTwo[1]) / 2)
  return {
    attempt,
    resultMs: mean,
    isDnf: false,
    display: fmtMs(mean),
  }
}

export function parseCompSimTimeInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => part.trim())
    if (parts.some((part) => part.length === 0)) return null
    const numbers = parts.map((part) => Number(part))
    if (numbers.some((part) => !Number.isFinite(part) || part < 0)) return null

    let totalSeconds = 0
    for (const value of numbers) {
      totalSeconds = totalSeconds * 60 + value
    }
    return Math.round(totalSeconds * 1000)
  }

  const seconds = Number(trimmed)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return Math.round(seconds * 1000)
}

export function formatCompSimTimeInput(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return ""
  const totalCentiseconds = Math.round(ms / 10)
  const minutes = Math.floor(totalCentiseconds / 6000)
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
  const centiseconds = totalCentiseconds % 100

  if (minutes > 0) {
    if (centiseconds === 0) {
      return `${minutes}:${String(seconds).padStart(2, "0")}`
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`
  }

  if (centiseconds === 0) return String(seconds)
  return `${seconds}.${String(centiseconds).padStart(2, "0")}`
}

export function formatCompSimConstraintSummary(config: CompSimRoundConfig): string[] {
  const pieces = [getCompSimFormatLabel(config.format)]
  pieces.push(
    `Wait ${fmtMs(config.waitTimeRangeMs.minMs)}-${fmtMs(config.waitTimeRangeMs.maxMs)}`
  )
  if (config.cumulativeTimeLimitMs != null) {
    pieces.push(`Time limit ${fmtMs(config.cumulativeTimeLimitMs)}`)
  }
  if (config.cutoff) {
    pieces.push(`Cutoff after ${config.cutoff.attempt}: ${fmtMs(config.cutoff.cutoffMs)}`)
  }
  return pieces
}
