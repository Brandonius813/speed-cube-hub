#!/usr/bin/env node

/**
 * migrate-pbs.mjs
 *
 * Migrates personal bests from a CSV export (old Supabase) into Speed Cube Hub.
 *
 * Usage:
 *   node scripts/migrate-pbs.mjs path/to/personal_bests_rows.csv
 *
 * Required env vars (reads from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_USER_ID  (your Speed Cube Hub user ID)
 */

import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

// ── Load .env.local ──
const envPath = new URL("../.env.local", import.meta.url).pathname
const envText = readFileSync(envPath, "utf-8")
for (const line of envText.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eq = trimmed.indexOf("=")
  if (eq === -1) continue
  const key = trimmed.slice(0, eq)
  const val = trimmed.slice(eq + 1)
  if (!process.env[key]) process.env[key] = val
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TARGET_USER_ID = process.env.ADMIN_USER_ID

if (!SUPABASE_URL || !SUPABASE_KEY || !TARGET_USER_ID) {
  console.error("Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USER_ID")
  process.exit(1)
}

const csvPath = process.argv[2]
if (!csvPath) {
  console.error("Usage: node scripts/migrate-pbs.mjs <csv-file>")
  process.exit(1)
}

// ── Event name mapping (display name → WCA ID) ──
const EVENT_MAP = {
  "2x2": "222", "3x3": "333", "4x4": "444", "5x5": "555",
  "6x6": "666", "7x7": "777", "Megaminx": "minx", "Pyraminx": "pyram",
  "Clock": "clock", "Skewb": "skewb", "Square-1": "sq1",
  "3x3 BLD": "333bf", "4x4 BLD": "444bf", "5x5 BLD": "555bf",
  "Multi-BLD": "333mbf", "OH": "333oh", "FMC": "333fm",
}

function resolveEvent(name) {
  return EVENT_MAP[name] || name // pass through if already a WCA ID
}

// ── Parse CSV ──
function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim())
  const headers = lines[0].split(",")
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",")
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = values[j]?.trim() ?? ""
    }
    rows.push(row)
  }
  return rows
}

const csvText = readFileSync(csvPath, "utf-8")
const rows = parseCSV(csvText)

console.log(`Parsed ${rows.length} PB records from CSV`)

// ── Connect to Supabase ──
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Check for existing PBs ──
const { data: existingPBs, error: fetchErr } = await supabase
  .from("personal_bests")
  .select("id, event, pb_type, time_seconds, is_current")
  .eq("user_id", TARGET_USER_ID)

if (fetchErr) {
  console.error("Error fetching existing PBs:", fetchErr.message)
  process.exit(1)
}

console.log(`Found ${existingPBs?.length || 0} existing PBs in Speed Cube Hub`)

// Build a set of existing event+pb_type+time combos to avoid duplicates
const existingKeys = new Set(
  (existingPBs || []).map((pb) => `${pb.event}|${pb.pb_type}|${Number(pb.time_seconds).toFixed(2)}`)
)

// ── Build insert rows ──
const insertRows = []
let skipped = 0

for (const row of rows) {
  const key = `${row.event}|${row.pb_type}|${Number(row.time_seconds).toFixed(2)}`

  // Skip if this exact PB already exists
  if (existingKeys.has(key)) {
    skipped++
    continue
  }

  insertRows.push({
    user_id: TARGET_USER_ID,
    event: resolveEvent(row.event),
    pb_type: row.pb_type,
    time_seconds: parseFloat(row.time_seconds),
    date_achieved: row.date_achieved,
    is_current: false, // We'll recalculate after insert
    notes: row.notes || null,
  })
}

console.log(`Inserting ${insertRows.length} new PB records (${skipped} duplicates skipped)`)

if (insertRows.length === 0) {
  console.log("Nothing to insert. All PBs already exist.")
  process.exit(0)
}

// ── Insert in batches of 100 ──
const BATCH_SIZE = 100
for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
  const batch = insertRows.slice(i, i + BATCH_SIZE)
  const { error } = await supabase.from("personal_bests").insert(batch)
  if (error) {
    console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
    process.exit(1)
  }
  console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows)`)
}

// ── Recalculate is_current for all event+pb_type combos ──
console.log("Recalculating current PBs...")

const { data: allPBs, error: allErr } = await supabase
  .from("personal_bests")
  .select("id, event, pb_type, time_seconds")
  .eq("user_id", TARGET_USER_ID)

if (allErr) {
  console.error("Error fetching all PBs:", allErr.message)
  process.exit(1)
}

// Group by event+pb_type, find the fastest
const groups = new Map()
for (const pb of allPBs) {
  const key = `${pb.event}|${pb.pb_type}`
  const time = Number(pb.time_seconds)
  const existing = groups.get(key)
  if (!existing || time < existing.time) {
    groups.set(key, { id: pb.id, time })
  }
}

// First, unmark all as not current
const { error: unmarkErr } = await supabase
  .from("personal_bests")
  .update({ is_current: false })
  .eq("user_id", TARGET_USER_ID)
  .eq("is_current", true)

if (unmarkErr) {
  console.error("Error unmarking current PBs:", unmarkErr.message)
  process.exit(1)
}

// Then mark the best for each event+type as current
const bestIds = [...groups.values()].map((g) => g.id)
for (let i = 0; i < bestIds.length; i += BATCH_SIZE) {
  const batch = bestIds.slice(i, i + BATCH_SIZE)
  const { error } = await supabase
    .from("personal_bests")
    .update({ is_current: true })
    .in("id", batch)
    .eq("user_id", TARGET_USER_ID)
  if (error) {
    console.error("Error marking current PBs:", error.message)
    process.exit(1)
  }
}

console.log(`Done! Marked ${groups.size} current PBs across all events/types.`)
console.log("Migration complete.")
