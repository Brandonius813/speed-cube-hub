#!/usr/bin/env node

/**
 * sync-wca-rankings.mjs
 *
 * Downloads the official WCA database export, computes Sum of Ranks (SOR)
 * and Kinch Rank for every WCA competitor, and upserts results into Supabase.
 *
 * SOR = sum of a cuber's rank in each event. If they haven't competed in an
 * event, they get last place (the worst rank anyone has in that event).
 * Lower is better.
 *
 * Usage:
 *   node scripts/sync-wca-rankings.mjs
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs"
import { createInterface } from "node:readline"
import { pipeline } from "node:stream/promises"
import { execSync } from "node:child_process"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

// Deprecated events — excluded from all calculations
const DEPRECATED_EVENTS = new Set(["333ft", "333mbo", "magic", "mmagic"])

// Single SOR: 17 events (including Multi-BLD)
const SINGLE_EVENTS = [
  "222", "333", "333bf", "333fm", "333mbf", "333oh",
  "444", "444bf", "555", "555bf", "666", "777",
  "clock", "minx", "pyram", "skewb", "sq1",
]

// Average SOR: 16 events (no Multi-BLD — it has no official average)
const AVERAGE_EVENTS = [
  "222", "333", "333bf", "333fm", "333oh",
  "444", "444bf", "555", "555bf", "666", "777",
  "clock", "minx", "pyram", "skewb", "sq1",
]

// Kinch event groups — one combined score, not split into single/average.
// Regular events: use the AVERAGE ratio (100 * avg_WR / avg_PR)
const KINCH_AVERAGE_ONLY = [
  "222", "333", "333oh", "444", "555", "666", "777",
  "clock", "minx", "pyram", "skewb", "sq1",
]
// 3BLD + FMC: take the BETTER of single and average ratios
const KINCH_BEST_OF = ["333bf", "333fm"]
// 4BLD + 5BLD: use SINGLE ratio only (averages are extremely rare)
const KINCH_SINGLE_ONLY = ["444bf", "555bf"]
// Total Kinch events: 12 average + 2 best-of + 2 single-only + 1 MBLD = 17
const KINCH_EVENT_COUNT =
  KINCH_AVERAGE_ONLY.length + KINCH_BEST_OF.length + KINCH_SINGLE_ONLY.length + 1

/**
 * Decode a WCA Multi-BLD encoded result into a Kinch-compatible score.
 * WCA format: 0DDTTTTTMM (DD = 99 - points, TTTTT = seconds, MM = missed)
 * Kinch MBLD score = points + max(0, (3600 - seconds) / 3600)
 */
function decodeMbldKinchScore(wcaValue) {
  const missed = wcaValue % 100
  const remainder = Math.floor(wcaValue / 100)
  const timeSeconds = remainder % 100000
  const dd = Math.floor(remainder / 100000)
  const points = 99 - dd
  if (points <= 0) return 0
  return points + Math.max(0, (3600 - timeSeconds) / 3600)
}

const BATCH_SIZE = 500
const TMP_DIR = join(process.cwd(), ".wca-sync-tmp")

// ─── Supabase Client ─────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Helpers ─────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

/** Parse a TSV file line-by-line, calling handler for each row */
async function parseTsv(filePath, handler) {
  const stream = createReadStream(filePath, "utf-8")
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  let headers = null
  let count = 0

  for await (const line of rl) {
    const fields = line.split("\t")
    if (!headers) {
      headers = fields
      continue
    }
    const row = {}
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = fields[i] ?? ""
    }
    handler(row)
    count++
  }

  return count
}

/** Batch upsert rows to Supabase table with retry */
async function batchUpsert(table, rows, conflictColumn = "wca_id") {
  let uploaded = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    let retries = 3
    while (retries > 0) {
      const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictColumn })
      if (!error) break
      retries--
      if (retries === 0) {
        console.error(`Upsert failed on ${table} (batch ${Math.floor(i / BATCH_SIZE)}) after retries:`, error.message)
        throw error
      }
      log(`  Retry batch ${Math.floor(i / BATCH_SIZE)} (${retries} left)...`)
      await new Promise((r) => setTimeout(r, 2000))
    }
    uploaded += batch.length
    if (uploaded % 10000 === 0) log(`  ${table}: ${uploaded.toLocaleString()} rows uploaded`)
  }
  return uploaded
}

// ─── Download & Extract ──────────────────────────────────────────────

async function downloadExport() {
  log("Fetching WCA export metadata...")
  const metaRes = await fetch("https://www.worldcubeassociation.org/api/v0/export/public")
  if (!metaRes.ok) throw new Error(`Failed to fetch export metadata: ${metaRes.status}`)
  const meta = await metaRes.json()

  const tsvUrl = meta.tsv_url
  if (!tsvUrl) throw new Error("No tsv_url in export metadata")

  log(`Export date: ${meta.export_date}`)
  log(`Downloading: ${tsvUrl}`)

  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true })
  const zipPath = join(TMP_DIR, "wca-export.zip")

  const res = await fetch(tsvUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)

  await pipeline(res.body, createWriteStream(zipPath))
  log(`Downloaded ${(existsSync(zipPath) ? "successfully" : "FAILED")}`)

  log("Extracting needed TSV files...")

  // Extract everything — v2 format may use different file names
  try {
    execSync(`unzip -o -j "${zipPath}" "*.tsv" -d "${TMP_DIR}" 2>/dev/null || true`, {
      stdio: "pipe",
    })
  } catch { /* ignore */ }

  // Map logical names to possible file names (v1, v2, and bare formats)
  const FILE_MAP = {
    persons: ["WCA_export_Persons.tsv", "WCA_export_persons.tsv", "persons.tsv"],
    ranksSingle: ["WCA_export_RanksSingle.tsv", "WCA_export_ranks_single.tsv", "ranks_single.tsv"],
    ranksAverage: ["WCA_export_RanksAverage.tsv", "WCA_export_ranks_average.tsv", "ranks_average.tsv"],
    countries: ["WCA_export_Countries.tsv", "WCA_export_countries.tsv", "countries.tsv"],
  }

  // Find actual file paths
  const resolvedFiles = {}
  for (const [key, candidates] of Object.entries(FILE_MAP)) {
    const found = candidates.find((f) => existsSync(join(TMP_DIR, f)))
    if (!found) {
      try {
        const listing = execSync(`ls -la "${TMP_DIR}"`, { encoding: "utf-8" })
        log(`Directory listing:\n${listing}`)
      } catch { /* ignore */ }
      throw new Error(`Could not find ${key} file. Tried: ${candidates.join(", ")}`)
    }
    resolvedFiles[key] = join(TMP_DIR, found)
    log(`  Found ${key}: ${found}`)
  }

  log("Extraction complete")
  return resolvedFiles
}

// ─── Parse WCA Data ──────────────────────────────────────────────────

async function parseCountries(filePath) {
  log("Parsing Countries...")
  const countries = new Map()
  const count = await parseTsv(filePath, (row) => {
    // Handle both v1 (camelCase) and v2 (snake_case) column names
    const id = row.id ?? row.countryId ?? row.country_id
    const name = row.name
    const continentId = row.continentId ?? row.continent_id
    if (id && name && continentId) {
      countries.set(id, { name, continent_id: continentId })
    }
  })
  log(`  Parsed ${count} countries`)
  return countries
}

async function parsePersons(filePath) {
  log("Parsing Persons...")
  const persons = new Map()
  const count = await parseTsv(filePath, (row) => {
    const id = row.id ?? row.wca_id ?? row.personId
    const subId = parseInt(row.subid ?? row.subId ?? row.sub_id ?? "1", 10)
    const name = row.name
    const countryId = row.countryId ?? row.country_id

    // Only keep the current version (subId = 1)
    if (id && name && countryId && subId === 1) {
      persons.set(id, { name, country_id: countryId })
    }
  })
  log(`  Parsed ${count} person rows → ${persons.size} unique persons`)
  return persons
}

async function parseRanks(filePath) {
  log(`Parsing ${filePath}...`)
  const personRanks = new Map()
  const worldRecords = new Map()

  const count = await parseTsv(filePath, (row) => {
    const personId = row.personId ?? row.person_id
    const eventId = row.eventId ?? row.event_id
    const best = parseInt(row.best, 10)
    const worldRank = parseInt(row.worldRank ?? row.world_rank, 10)
    const continentRank = parseInt(row.continentRank ?? row.continent_rank, 10)
    const countryRank = parseInt(row.countryRank ?? row.country_rank, 10)

    // Skip deprecated events (333ft, magic, mmagic, 333mbo)
    if (!personId || !eventId || isNaN(best) || DEPRECATED_EVENTS.has(eventId)) return

    if (!personRanks.has(personId)) personRanks.set(personId, new Map())
    personRanks.get(personId).set(eventId, { best, worldRank, continentRank, countryRank })

    // Track world record (rank 1 = WR)
    const currentWr = worldRecords.get(eventId)
    if (!currentWr || best < currentWr) {
      worldRecords.set(eventId, best)
    }
  })

  log(`  Parsed ${count} rank rows for ${personRanks.size} persons`)
  return { personRanks, worldRecords }
}

// ─── Compute last-place ranks per event ─────────────────────────────

function computeLastPlaceRanks(personRanks, persons, countries, events) {
  // For each event, find the worst (highest) world/continent/country rank
  const maxWorld = new Map()       // eventId → worst world rank
  const maxContinent = new Map()   // "continentId|eventId" → worst continent rank
  const maxCountry = new Map()     // "countryId|eventId" → worst country rank

  const eventSet = new Set(events)

  for (const [personId, eventsMap] of personRanks) {
    const person = persons.get(personId)
    if (!person) continue

    const countryId = person.country_id
    const continentId = countries.get(countryId)?.continent_id ?? ""

    for (const [eventId, r] of eventsMap) {
      if (!eventSet.has(eventId)) continue

      if (r.worldRank > (maxWorld.get(eventId) ?? 0)) {
        maxWorld.set(eventId, r.worldRank)
      }
      if (continentId && r.continentRank > 0) {
        const key = `${continentId}|${eventId}`
        if (r.continentRank > (maxContinent.get(key) ?? 0)) {
          maxContinent.set(key, r.continentRank)
        }
      }
      if (countryId && r.countryRank > 0) {
        const key = `${countryId}|${eventId}`
        if (r.countryRank > (maxCountry.get(key) ?? 0)) {
          maxCountry.set(key, r.countryRank)
        }
      }
    }
  }

  return { maxWorld, maxContinent, maxCountry }
}

// ─── Compute SOR & Kinch ────────────────────────────────────────────

function computeRankings(persons, countries, singleData, averageData) {
  log("Computing SOR and Kinch for all persons...")
  const { personRanks: singleRanks, worldRecords: singleWRs } = singleData
  const { personRanks: averageRanks, worldRecords: averageWRs } = averageData

  // Find the worst rank in each event (used as "last place" for missing events)
  log("  Finding last-place ranks per event...")
  const singleLast = computeLastPlaceRanks(singleRanks, persons, countries, SINGLE_EVENTS)
  const averageLast = computeLastPlaceRanks(averageRanks, persons, countries, AVERAGE_EVENTS)

  const results = []
  const allPersonIds = new Set([...singleRanks.keys(), ...averageRanks.keys()])

  for (const personId of allPersonIds) {
    const person = persons.get(personId)
    if (!person) continue

    const countryId = person.country_id
    const countryInfo = countries.get(countryId)
    const continentId = countryInfo?.continent_id ?? ""

    const singleEvents = singleRanks.get(personId)
    const averageEvents = averageRanks.get(personId)

    // ── SOR Single: 17 events. Missing events = last place. ─────────
    let sorSingle = 0
    let sorSingleCr = 0
    let sorSingleNr = 0
    let singleEventCount = 0

    for (const eventId of SINGLE_EVENTS) {
      const r = singleEvents?.get(eventId)
      if (r && r.worldRank > 0) {
        // Cuber has a result — use their actual rank
        sorSingle += r.worldRank
        sorSingleCr += r.continentRank > 0 ? r.continentRank : (singleLast.maxContinent.get(`${continentId}|${eventId}`) ?? r.worldRank)
        sorSingleNr += r.countryRank > 0 ? r.countryRank : (singleLast.maxCountry.get(`${countryId}|${eventId}`) ?? r.worldRank)
        singleEventCount++
      } else {
        // Never competed — last place
        sorSingle += singleLast.maxWorld.get(eventId) ?? 0
        sorSingleCr += singleLast.maxContinent.get(`${continentId}|${eventId}`) ?? singleLast.maxWorld.get(eventId) ?? 0
        sorSingleNr += singleLast.maxCountry.get(`${countryId}|${eventId}`) ?? singleLast.maxWorld.get(eventId) ?? 0
      }
    }

    // ── SOR Average: 16 events. Same logic. ─────────────────────────
    let sorAverage = 0
    let sorAverageCr = 0
    let sorAverageNr = 0
    let averageEventCount = 0

    for (const eventId of AVERAGE_EVENTS) {
      const r = averageEvents?.get(eventId)
      if (r && r.worldRank > 0) {
        sorAverage += r.worldRank
        sorAverageCr += r.continentRank > 0 ? r.continentRank : (averageLast.maxContinent.get(`${continentId}|${eventId}`) ?? r.worldRank)
        sorAverageNr += r.countryRank > 0 ? r.countryRank : (averageLast.maxCountry.get(`${countryId}|${eventId}`) ?? r.worldRank)
        averageEventCount++
      } else {
        sorAverage += averageLast.maxWorld.get(eventId) ?? 0
        sorAverageCr += averageLast.maxContinent.get(`${continentId}|${eventId}`) ?? averageLast.maxWorld.get(eventId) ?? 0
        sorAverageNr += averageLast.maxCountry.get(`${countryId}|${eventId}`) ?? averageLast.maxWorld.get(eventId) ?? 0
      }
    }

    // ── Kinch (one combined score per the official Kinch formula) ────
    // Regular events: use average ratio
    // 3BLD + FMC: best of single and average ratios
    // 4BLD + 5BLD: single ratio only
    // Multi-BLD: special decoded score
    let kinch = null
    if (singleEvents || averageEvents) {
      let ratioSum = 0

      // Regular events — use average ratio only
      for (const eventId of KINCH_AVERAGE_ONLY) {
        const rank = averageEvents?.get(eventId)
        const wr = averageWRs.get(eventId)
        if (rank && wr && rank.best > 0) {
          ratioSum += (100 * wr) / rank.best
        }
      }

      // 3BLD + FMC — take the better of single and average ratios
      for (const eventId of KINCH_BEST_OF) {
        const sr = singleEvents?.get(eventId)
        const sWr = singleWRs.get(eventId)
        const ar = averageEvents?.get(eventId)
        const aWr = averageWRs.get(eventId)
        let singleRatio = 0
        let avgRatio = 0
        if (sr && sWr && sr.best > 0) singleRatio = (100 * sWr) / sr.best
        if (ar && aWr && ar.best > 0) avgRatio = (100 * aWr) / ar.best
        ratioSum += Math.max(singleRatio, avgRatio)
      }

      // 4BLD + 5BLD — use single ratio only (averages are extremely rare)
      for (const eventId of KINCH_SINGLE_ONLY) {
        const rank = singleEvents?.get(eventId)
        const wr = singleWRs.get(eventId)
        if (rank && wr && rank.best > 0) {
          ratioSum += (100 * wr) / rank.best
        }
      }

      // Multi-BLD — special Kinch scoring (decode WCA format)
      const mbldRank = singleEvents?.get("333mbf")
      const mbldWr = singleWRs.get("333mbf")
      if (mbldRank && mbldWr && mbldRank.best > 0 && mbldWr > 0) {
        const prScore = decodeMbldKinchScore(mbldRank.best)
        const wrScore = decodeMbldKinchScore(mbldWr)
        if (prScore > 0 && wrScore > 0) {
          ratioSum += (100 * wrScore) / prScore
        }
      }

      kinch = Math.round((ratioSum / KINCH_EVENT_COUNT) * 100) / 100
    }

    results.push({
      wca_id: personId,
      name: person.name,
      country_id: countryId,
      continent_id: continentId,
      sor_single: sorSingle,
      sor_average: sorAverage,
      sor_single_cr: sorSingleCr,
      sor_average_cr: sorAverageCr,
      sor_single_nr: sorSingleNr,
      sor_average_nr: sorAverageNr,
      kinch_single: kinch,
      kinch_average: null,
      single_event_count: singleEventCount,
      average_event_count: averageEventCount,
    })
  }

  log(`  Computed rankings for ${results.length.toLocaleString()} persons`)
  return results
}

// ─── Upload to Supabase ─────────────────────────────────────────────

async function uploadCountries(countries) {
  log("Uploading countries to wca_countries...")
  const rows = []
  for (const [id, data] of countries) {
    rows.push({ id, name: data.name, continent_id: data.continent_id })
  }
  const count = await batchUpsert("wca_countries", rows, "id")
  log(`  Uploaded ${count} countries`)
}

async function uploadRankings(rankings) {
  log("Uploading rankings to wca_rankings...")
  const count = await batchUpsert("wca_rankings", rankings, "wca_id")
  log(`  Uploaded ${count.toLocaleString()} rankings`)
}

/**
 * Clear the wca_rankings table before inserting fresh data.
 * This is safer than trying to diff old vs new rows because Supabase's
 * API row limit can cause pagination to miss stale rows.
 */
async function clearRankingsTable() {
  log("Clearing wca_rankings table for fresh insert...")
  let totalDeleted = 0

  // Delete in a loop — Supabase REST API has a row limit per request
  while (true) {
    const { data, error } = await supabase
      .from("wca_rankings")
      .delete()
      .neq("wca_id", "")
      .select("wca_id")
      .limit(5000)

    if (error) {
      console.error("Delete batch failed:", error.message)
      throw error
    }
    if (!data || data.length === 0) break
    totalDeleted += data.length
    if (totalDeleted % 50000 === 0) log(`  Deleted ${totalDeleted.toLocaleString()} rows...`)
  }

  log(`  Cleared ${totalDeleted.toLocaleString()} rows`)
}

// ─── Cleanup ─────────────────────────────────────────────────────────

function cleanup() {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true })
    log("Cleaned up temp files")
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()
  log("=== WCA Rankings Sync Started ===")

  try {
    const files = await downloadExport()

    const countries = await parseCountries(files.countries)
    const persons = await parsePersons(files.persons)
    const singleData = await parseRanks(files.ranksSingle)
    const averageData = await parseRanks(files.ranksAverage)

    const rankings = computeRankings(persons, countries, singleData, averageData)

    await uploadCountries(countries)
    await clearRankingsTable()
    await uploadRankings(rankings)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    log(`=== Sync Complete in ${elapsed}s ===`)
  } catch (err) {
    console.error("Sync failed:", err)
    process.exit(1)
  } finally {
    cleanup()
  }
}

main()
