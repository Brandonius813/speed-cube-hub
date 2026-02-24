"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export type SorKinchCategory = "sor" | "kinch"
export type SorKinchType = "single" | "average"
export type RegionLevel = "world" | "continent" | "country"

export type Region = {
  level: RegionLevel
  id?: string // continent_id or country_id
}

export type WcaLeaderboardEntry = {
  rank: number
  wca_id: string
  name: string
  country_id: string
  stat_value: number
}

export type WcaLeaderboardPage = {
  entries: WcaLeaderboardEntry[]
  totalCount: number
}

export type WcaCountry = {
  id: string
  name: string
  continent_id: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

const PAGE_SIZE = 50
const FIND_ME_WINDOW = 25

/**
 * Get the correct SOR column name based on type and region level.
 */
function getSorColumn(type: SorKinchType, region: Region): string {
  const suffix = type === "single" ? "single" : "average"
  switch (region.level) {
    case "continent":
      return `sor_${suffix}_cr`
    case "country":
      return `sor_${suffix}_nr`
    default:
      return `sor_${suffix}`
  }
}

/**
 * Get the correct Kinch column name based on type.
 */
function getKinchColumn(type: SorKinchType): string {
  return type === "single" ? "kinch_single" : "kinch_average"
}

/** Apply region filter to a query */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRegionFilter(query: any, region: Region) {
  if (region.level === "continent" && region.id) {
    return query.eq("continent_id", region.id)
  }
  if (region.level === "country" && region.id) {
    return query.eq("country_id", region.id)
  }
  return query
}

/** Map a raw DB row to a WcaLeaderboardEntry */
function toEntry(
  row: AnyRow,
  column: string,
  rank: number
): WcaLeaderboardEntry {
  return {
    rank,
    wca_id: row.wca_id as string,
    name: row.name as string,
    country_id: row.country_id as string,
    stat_value: Number(row[column]),
  }
}

/**
 * Fetch a paginated SOR or Kinch leaderboard.
 */
export async function getSorKinchLeaderboard(
  category: SorKinchCategory,
  type: SorKinchType,
  region: Region = { level: "world" },
  offset: number = 0,
  limit: number = PAGE_SIZE
): Promise<WcaLeaderboardPage> {
  try {
    const admin = createAdminClient()

    const isSor = category === "sor"
    const column = isSor ? getSorColumn(type, region) : getKinchColumn(type)
    const ascending = isSor // SOR: lower is better; Kinch: higher is better

    // Count query
    let countQuery = admin
      .from("wca_rankings")
      .select("*", { count: "exact", head: true })
      .not(column, "is", null)
    countQuery = applyRegionFilter(countQuery, region)
    const { count } = await countQuery
    const totalCount = count ?? 0

    // Data query — select all columns, let JS pick the right one
    let dataQuery = admin
      .from("wca_rankings")
      .select("*")
      .not(column, "is", null)
      .order(column, { ascending })
      .range(offset, offset + limit - 1)
    dataQuery = applyRegionFilter(dataQuery, region)

    const { data, error } = await dataQuery
    if (error) {
      console.error("SOR/Kinch leaderboard error:", error.message)
      return { entries: [], totalCount: 0 }
    }

    const entries = ((data ?? []) as AnyRow[]).map((row, index) =>
      toEntry(row, column, offset + index + 1)
    )

    return { entries, totalCount }
  } catch (err) {
    console.error("SOR/Kinch leaderboard unexpected error:", err)
    return { entries: [], totalCount: 0 }
  }
}

/**
 * Find a specific person's position in the SOR/Kinch leaderboard.
 * Returns their rank and surrounding entries (±25 people).
 */
export async function findUserInSorKinch(
  category: SorKinchCategory,
  type: SorKinchType,
  wcaId: string,
  region: Region = { level: "world" }
): Promise<{
  entries: WcaLeaderboardEntry[]
  userRank: number
  totalCount: number
} | null> {
  const admin = createAdminClient()

  const isSor = category === "sor"
  const column = isSor ? getSorColumn(type, region) : getKinchColumn(type)
  const ascending = isSor

  // Get the user's row
  const { data: userData } = await admin
    .from("wca_rankings")
    .select("*")
    .eq("wca_id", wcaId)
    .single()

  const row = userData as AnyRow | null
  if (!row || row[column] == null) return null

  const userScore = Number(row[column])

  // Count how many people rank better
  let rankQuery = admin
    .from("wca_rankings")
    .select("*", { count: "exact", head: true })
    .not(column, "is", null)

  if (ascending) {
    rankQuery = rankQuery.lt(column, userScore)
  } else {
    rankQuery = rankQuery.gt(column, userScore)
  }
  rankQuery = applyRegionFilter(rankQuery, region)
  const { count: betterCount } = await rankQuery
  const userRank = (betterCount ?? 0) + 1

  // Get total count
  let totalQuery = admin
    .from("wca_rankings")
    .select("*", { count: "exact", head: true })
    .not(column, "is", null)
  totalQuery = applyRegionFilter(totalQuery, region)
  const { count: totalCount } = await totalQuery

  // Fetch surrounding entries
  const start = Math.max(0, userRank - FIND_ME_WINDOW - 1)
  const windowSize = FIND_ME_WINDOW * 2 + 1

  let surroundingQuery = admin
    .from("wca_rankings")
    .select("*")
    .not(column, "is", null)
    .order(column, { ascending })
    .range(start, start + windowSize - 1)
  surroundingQuery = applyRegionFilter(surroundingQuery, region)

  const { data: surroundingData } = await surroundingQuery

  const entries = ((surroundingData ?? []) as AnyRow[]).map((r, index) =>
    toEntry(r, column, start + index + 1)
  )

  return { entries, userRank, totalCount: totalCount ?? 0 }
}

/**
 * Get SOR rank and Kinch score for a specific WCA ID (for profile display).
 */
export async function getUserSorKinchStats(wcaId: string): Promise<{
  sorRank: number | null
  sorTotal: number | null
  kinchScore: number | null
  kinchRank: number | null
} | null> {
  if (!wcaId) return null
  const admin = createAdminClient()

  const { data } = await admin
    .from("wca_rankings")
    .select("*")
    .eq("wca_id", wcaId)
    .single()

  const row = data as AnyRow | null
  if (!row) return null

  const sorValue = row.sor_single != null ? Number(row.sor_single) : null
  const kinchValue = row.kinch_single != null ? Number(row.kinch_single) : null

  // Get SOR rank (count of people with lower SOR + 1)
  let sorRank: number | null = null
  if (sorValue != null) {
    const { count } = await admin
      .from("wca_rankings")
      .select("*", { count: "exact", head: true })
      .lt("sor_single", sorValue)
      .not("sor_single", "is", null)
    sorRank = (count ?? 0) + 1
  }

  // Get Kinch rank (count of people with higher Kinch + 1)
  let kinchRank: number | null = null
  if (kinchValue != null) {
    const { count } = await admin
      .from("wca_rankings")
      .select("*", { count: "exact", head: true })
      .gt("kinch_single", kinchValue)
      .not("kinch_single", "is", null)
    kinchRank = (count ?? 0) + 1
  }

  return {
    sorRank,
    sorTotal: sorValue,
    kinchScore: kinchValue,
    kinchRank,
  }
}

/**
 * Get all countries for the region filter dropdown.
 */
export async function getWcaCountries(): Promise<WcaCountry[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("wca_countries")
    .select("*")
    .order("name")

  return ((data ?? []) as AnyRow[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    continent_id: row.continent_id as string,
  }))
}

/**
 * Get unique continents.
 */
export async function getWcaContinents(): Promise<
  { id: string; name: string }[]
> {
  const continents = [
    { id: "_Africa", name: "Africa" },
    { id: "_Asia", name: "Asia" },
    { id: "_Europe", name: "Europe" },
    { id: "_North America", name: "North America" },
    { id: "_Oceania", name: "Oceania" },
    { id: "_South America", name: "South America" },
  ]

  return continents
}
