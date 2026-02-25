"use server"

import { unstable_cache } from "next/cache"
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
 * Get the Kinch column name. Kinch is a single combined score
 * (not split into single/average), stored in kinch_single.
 */
function getKinchColumn(): string {
  return "kinch_single"
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

/** Revalidation period for WCA data cache (12 hours — data only updates weekly) */
const WCA_CACHE_TTL = 60 * 60 * 12

/** Inner fetch logic for SOR/Kinch leaderboard (uncached). */
async function fetchSorKinchLeaderboard(
  category: SorKinchCategory,
  type: SorKinchType,
  region: Region,
  offset: number,
  limit: number
): Promise<WcaLeaderboardPage> {
  const admin = createAdminClient()

  const isSor = category === "sor"
  const column = isSor ? getSorColumn(type, region) : getKinchColumn()
  const ascending = isSor // SOR: lower is better; Kinch: higher is better

  // Run count + data queries in parallel (not sequentially)
  let countQuery = admin
    .from("wca_rankings")
    .select("*", { count: "exact", head: true })
    .not(column, "is", null)
  countQuery = applyRegionFilter(countQuery, region)

  let dataQuery = admin
    .from("wca_rankings")
    .select(`wca_id, name, country_id, ${column}`)
    .not(column, "is", null)
    .order(column, { ascending })
    .range(offset, offset + limit - 1)
  dataQuery = applyRegionFilter(dataQuery, region)

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])
  const totalCount = countResult.count ?? 0

  if (dataResult.error) {
    console.error("SOR/Kinch leaderboard error:", dataResult.error.message)
    return { entries: [], totalCount: 0 }
  }

  const entries = ((dataResult.data ?? []) as AnyRow[]).map((row, index) =>
    toEntry(row, column, offset + index + 1)
  )

  return { entries, totalCount }
}

/**
 * Fetch a paginated SOR or Kinch leaderboard (cached for 12 hours).
 * WCA data only updates weekly, so aggressive caching is safe.
 */
export async function getSorKinchLeaderboard(
  category: SorKinchCategory,
  type: SorKinchType,
  region: Region = { level: "world" },
  offset: number = 0,
  limit: number = PAGE_SIZE
): Promise<WcaLeaderboardPage> {
  try {
    const cacheKey = `sor-kinch:${category}:${type}:${region.level}:${region.id ?? "all"}:${offset}:${limit}`
    const cached = unstable_cache(
      () => fetchSorKinchLeaderboard(category, type, region, offset, limit),
      [cacheKey],
      { revalidate: WCA_CACHE_TTL, tags: ["wca-rankings"] }
    )
    return await cached()
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
  const column = isSor ? getSorColumn(type, region) : getKinchColumn()
  const ascending = isSor

  // Get the user's row (only need wca_id + the relevant column)
  const { data: userData } = await admin
    .from("wca_rankings")
    .select(`wca_id, name, country_id, ${column}`)
    .eq("wca_id", wcaId)
    .single()

  const row = userData as AnyRow | null
  if (!row || row[column] == null) return null

  const userScore = Number(row[column])

  // Run rank + total count queries in parallel
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

  let totalQuery = admin
    .from("wca_rankings")
    .select("*", { count: "exact", head: true })
    .not(column, "is", null)
  totalQuery = applyRegionFilter(totalQuery, region)

  const [rankResult, totalResult] = await Promise.all([rankQuery, totalQuery])
  const userRank = (rankResult.count ?? 0) + 1
  const totalCount = totalResult.count ?? 0

  // Fetch surrounding entries
  const start = Math.max(0, userRank - FIND_ME_WINDOW - 1)
  const windowSize = FIND_ME_WINDOW * 2 + 1

  let surroundingQuery = admin
    .from("wca_rankings")
    .select(`wca_id, name, country_id, ${column}`)
    .not(column, "is", null)
    .order(column, { ascending })
    .range(start, start + windowSize - 1)
  surroundingQuery = applyRegionFilter(surroundingQuery, region)

  const { data: surroundingData } = await surroundingQuery

  const entries = ((surroundingData ?? []) as AnyRow[]).map((r, index) =>
    toEntry(r, column, start + index + 1)
  )

  return { entries, userRank, totalCount }
}

export type UserSorKinchStats = {
  sorSingleRank: number | null
  sorSingleValue: number | null
  sorSingleTotal: number | null
  sorAverageRank: number | null
  sorAverageValue: number | null
  sorAverageTotal: number | null
  kinchScore: number | null
  kinchRank: number | null
  kinchTotal: number | null
}

/**
 * Get SOR rank and Kinch score for a specific WCA ID (for profile display).
 * Returns single + average for both SOR and Kinch, plus total competitor
 * counts so the UI can compute percentiles.
 */
export async function getUserSorKinchStats(
  wcaId: string
): Promise<UserSorKinchStats | null> {
  if (!wcaId) return null
  const admin = createAdminClient()

  const { data } = await admin
    .from("wca_rankings")
    .select("wca_id, sor_single, sor_average, kinch_single")
    .eq("wca_id", wcaId)
    .single()

  const row = data as AnyRow | null
  if (!row) return null

  const sorSingle = row.sor_single != null ? Number(row.sor_single) : null
  const sorAverage = row.sor_average != null ? Number(row.sor_average) : null
  const kinchValue = row.kinch_single != null ? Number(row.kinch_single) : null

  // Build rank + total count queries in parallel for all 3 metrics
  // SOR: lower is better → count people with LESS than this value
  // Kinch: higher is better → count people with MORE than this value
  const queries = await Promise.all([
    // SOR single rank
    sorSingle != null
      ? admin.from("wca_rankings").select("*", { count: "exact", head: true }).lt("sor_single", sorSingle).not("sor_single", "is", null)
      : Promise.resolve({ count: null }),
    // SOR single total
    sorSingle != null
      ? admin.from("wca_rankings").select("*", { count: "exact", head: true }).not("sor_single", "is", null)
      : Promise.resolve({ count: null }),
    // SOR average rank
    sorAverage != null
      ? admin.from("wca_rankings").select("*", { count: "exact", head: true }).lt("sor_average", sorAverage).not("sor_average", "is", null)
      : Promise.resolve({ count: null }),
    // SOR average total
    sorAverage != null
      ? admin.from("wca_rankings").select("*", { count: "exact", head: true }).not("sor_average", "is", null)
      : Promise.resolve({ count: null }),
    // Kinch rank
    kinchValue != null
      ? admin.from("wca_rankings").select("*", { count: "exact", head: true }).gt("kinch_single", kinchValue).not("kinch_single", "is", null)
      : Promise.resolve({ count: null }),
    // Kinch total
    kinchValue != null
      ? admin.from("wca_rankings").select("*", { count: "exact", head: true }).not("kinch_single", "is", null)
      : Promise.resolve({ count: null }),
  ])

  return {
    sorSingleRank: queries[0].count != null ? queries[0].count + 1 : null,
    sorSingleValue: sorSingle,
    sorSingleTotal: queries[1].count,
    sorAverageRank: queries[2].count != null ? queries[2].count + 1 : null,
    sorAverageValue: sorAverage,
    sorAverageTotal: queries[3].count,
    kinchScore: kinchValue,
    kinchRank: queries[4].count != null ? queries[4].count + 1 : null,
    kinchTotal: queries[5].count,
  }
}

/**
 * Get all countries for the region filter dropdown (cached — countries never change).
 */
export const getWcaCountries = unstable_cache(
  async (): Promise<WcaCountry[]> => {
    const admin = createAdminClient()
    const { data } = await admin
      .from("wca_countries")
      .select("id, name, continent_id")
      .order("name")

    return ((data ?? []) as AnyRow[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      continent_id: row.continent_id as string,
    }))
  },
  ["wca-countries"],
  { revalidate: 60 * 60 * 24 * 7 } // 1 week — countries never change
)

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
