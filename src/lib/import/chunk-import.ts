import type { RawImportSolve } from "@/lib/import/types"

export const RAW_SOLVE_IMPORT_CHUNK_SIZE = 2000

export type ImportedSolveChunkRow = {
  solve_number: number
  time_ms: number
  penalty: "+2" | "DNF" | null
  scramble: string
  solved_at: string
}

function buildSolvedAt(date: string, daySolveNumber: number): string {
  const seconds = String(daySolveNumber % 60).padStart(2, "0")
  const minutes = String(Math.floor(daySolveNumber / 60) % 60).padStart(2, "0")
  const hours = String(Math.floor(daySolveNumber / 3600) % 24).padStart(2, "0")

  return `${date}T${hours}:${minutes}:${seconds}.000Z`
}

export function prepareImportedSolveChunks(
  rawSolves: RawImportSolve[],
  chunkSize = RAW_SOLVE_IMPORT_CHUNK_SIZE
): ImportedSolveChunkRow[][] {
  if (rawSolves.length === 0) {
    return []
  }

  const dayCounts = new Map<string, number>()
  const prepared = rawSolves.map((solve, index) => {
    const daySolveNumber = (dayCounts.get(solve.date) ?? 0) + 1
    dayCounts.set(solve.date, daySolveNumber)

    return {
      solve_number: index + 1,
      time_ms: solve.time_ms,
      penalty: solve.penalty,
      scramble: solve.scramble ?? "",
      solved_at: buildSolvedAt(solve.date, daySolveNumber),
    }
  })

  const chunks: ImportedSolveChunkRow[][] = []
  for (let i = 0; i < prepared.length; i += chunkSize) {
    chunks.push(prepared.slice(i, i + chunkSize))
  }

  return chunks
}
