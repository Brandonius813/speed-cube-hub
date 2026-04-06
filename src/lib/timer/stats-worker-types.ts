import type { TimerSolve } from "@/lib/timer/stats"

export type StatsSummary = {
  best: number | null
  mean: number | null
  milestoneRows: Array<{ key: string; cur: number | null; best: number | null }>
  rolling1: Array<number | null>
  rolling2: Array<number | null>
  pbSingle: boolean[]
  pbRolling1: boolean[]
  pbRolling2: boolean[]
}

export type StatsWorkerRequest =
  | {
      type: "init"
      sessionId: string
      solves: TimerSolve[]
      statCols: [string, string]
      milestones: number[]
    }
  | {
      type: "append"
      sessionId: string
      solve: TimerSolve
    }
  | {
      type: "update"
      sessionId: string
      id: string
      penalty: TimerSolve["penalty"]
    }
  | {
      type: "delete"
      sessionId: string
      id: string
    }
  | {
      type: "recompute"
      sessionId: string
      solves?: TimerSolve[]
      statCols?: [string, string]
      milestones?: number[]
    }

export type StatsWorkerResponse =
  | {
      type: "snapshot"
      sessionId: string
      version: number
      summary: StatsSummary
      statCols: [string, string]
      latencyMs: number
    }
  | {
      type: "error"
      sessionId: string
      message: string
    }

