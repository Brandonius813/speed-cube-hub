#!/usr/bin/env node

/**
 * sync-wca-rankings.mjs
 *
 * Downloads the official WCA database export, computes Sum of Ranks (SOR)
 * and Kinch Rank for every WCA competitor, and upserts results into Supabase.
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

// Events excluded from SOR/Kinch (Multi-BLD uses special scoring, not time-based)
const EXCLUDED_EVENTS = new Set(["333mbf"])

// All 16 ranked events
const RANKED_EVENTS = [
  "222", "333", "444", "555", "666", "777",
  "333bf", "444bf", "555bf",
  "333oh", "minx", "pyram", "clock", "skewb", "sq1", "333fm",
]

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
      // List what was actually extracted to help debug
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

    if (!personId || !eventId || isNaN(best) || EXCLUDED_EVENTS.has(eventId)) return

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

// ─── Compute SOR & Kinch ────────────────────────────────────────────

function computeRankings(persons, countries, singleData, averageData) {
  log("Computing SOR and Kinch for all persons...")
  const { personRanks: singleRanks, worldRecords: singleWRs } = singleData
  const { personRanks: averageRanks, worldRecords: averageWRs } = averageData

  const totalEvents = RANKED_EVENTS.length
  const results = []

  // Collect all unique person IDs from both single and average ranks
  const allPersonIds = new Set([...singleRanks.keys(), ...averageRanks.keys()])

  for (const personId of allPersonIds) {
    const person = persons.get(personId)
    if (!person) continue

    const countryInfo = countries.get(person.country_id)
    const continentId = countryInfo?.continent_id ?? ""

    const singleEvents = singleRanks.get(personId)
    const averageEvents = averageRanks.get(personId)

    // SOR Single
    let sorSingle = null
    let sorSingleCr = null
    let sorSingleNr = null
    let singleEventCount = 0
    if (singleEvents) {
      let sumWorld = 0, sumContinent = 0, sumCountry = 0
      for (const [, r] of singleEvents) {
        sumWorld += r.worldRank
        sumContinent += r.continentRank
        sumCountry += r.countryRank
      }
      singleEventCount = singleEvents.size
      sorSingle = sumWorld
      sorSingleCr = sumContinent
      sorSingleNr = sumCountry
    }

    // SOR Average
    let sorAverage = null
    let sorAverageCr = null
    let sorAverageNr = null
    let averageEventCount = 0
    if (averageEvents) {
      let sumWorld = 0, sumContinent = 0, sumCountry = 0
      for (const [, r] of averageEvents) {
        sumWorld += r.worldRank
        sumContinent += r.continentRank
        sumCountry += r.countryRank
      }
      averageEventCount = averageEvents.size
      sorAverage = sumWorld
      sorAverageCr = sumContinent
      sorAverageNr = sumCountry
    }

    // Kinch Single: average of (100 * WR / PR) across all ranked events
    let kinchSingle = null
    if (singleEvents) {
      let ratioSum = 0
      for (const eventId of RANKED_EVENTS) {
        const rank = singleEvents.get(eventId)
        const wr = singleWRs.get(eventId)
        if (rank && wr && rank.best > 0) {
          ratioSum += (100 * wr) / rank.best
        }
        // Events without a result contribute 0
      }
      kinchSingle = Math.round((ratioSum / totalEvents) * 100) / 100
    }

    // Kinch Average
    let kinchAverage = null
    if (averageEvents) {
      let ratioSum = 0
      for (const eventId of RANKED_EVENTS) {
        const rank = averageEvents.get(eventId)
        const wr = averageWRs.get(eventId)
        if (rank && wr && rank.best > 0) {
          ratioSum += (100 * wr) / rank.best
        }
      }
      kinchAverage = Math.round((ratioSum / totalEvents) * 100) / 100
    }

    results.push({
      wca_id: personId,
      name: person.name,
      country_id: person.country_id,
      continent_id: continentId,
      sor_single: sorSingle,
      sor_average: sorAverage,
      sor_single_cr: sorSingleCr,
      sor_average_cr: sorAverageCr,
      sor_single_nr: sorSingleNr,
      sor_average_nr: sorAverageNr,
      kinch_single: kinchSingle,
      kinch_average: kinchAverage,
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
