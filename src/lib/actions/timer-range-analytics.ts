"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Solve } from "@/lib/types"

const SOLVE_SELECT_COLUMNS = [
  "id",
  "timer_session_id",
  "user_id",
  "solve_number",
  "time_ms",
  "penalty",
  "scramble",
  "event",
  "comp_sim_group",
  "notes",
  "solve_session_id",
  "solved_at",
  "created_at",
].join(", ")

const DEFAULT_LIMIT = 5000
const MAX_LIMIT = 5000
const MULTI_PER_EVENT_FLOOR = 200

export async function getSolvesInRange(params: {
  userId: string
  event: string
  fromIso: string | null
  toIso: string | null
  limit?: number
}): Promise<{ solves: Solve[]; truncated: boolean; error?: string }> {
  if (!params.userId || !params.event) {
    return { solves: [], truncated: false, error: "Missing user or event" }
  }

  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const admin = createAdminClient()

  let query = admin
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", params.userId)
    .eq("event", params.event)
    .order("solved_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1)

  if (params.fromIso) query = query.gte("solved_at", params.fromIso)
  if (params.toIso) query = query.lte("solved_at", params.toIso)

  const { data, error } = await query

  if (error) {
    return { solves: [], truncated: false, error: error.message }
  }

  const rows = (data as unknown as Solve[] | null) ?? []
  const truncated = rows.length > limit
  return { solves: truncated ? rows.slice(0, limit) : rows, truncated }
}

export async function getSolvesInRangeMulti(params: {
  userId: string
  events: string[]
  fromIso: string | null
  toIso: string | null
  limit?: number
}): Promise<{
  byEvent: Record<string, Solve[]>
  truncated: boolean
  error?: string
}> {
  if (!params.userId) {
    return { byEvent: {}, truncated: false, error: "Missing user" }
  }
  if (params.events.length === 0) {
    return { byEvent: {}, truncated: false }
  }

  const totalLimit = Math.min(
    Math.max(params.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )
  const perEventCap = Math.max(
    MULTI_PER_EVENT_FLOOR,
    Math.floor(totalLimit / params.events.length),
  )

  const admin = createAdminClient()

  let query = admin
    .from("solves")
    .select(SOLVE_SELECT_COLUMNS)
    .eq("user_id", params.userId)
    .in("event", params.events)
    .order("solved_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(totalLimit + 1)

  if (params.fromIso) query = query.gte("solved_at", params.fromIso)
  if (params.toIso) query = query.lte("solved_at", params.toIso)

  const { data, error } = await query

  if (error) {
    return { byEvent: {}, truncated: false, error: error.message }
  }

  const rows = (data as unknown as Solve[] | null) ?? []
  const truncated = rows.length > totalLimit
  const useable = truncated ? rows.slice(0, totalLimit) : rows

  const byEvent: Record<string, Solve[]> = {}
  for (const event of params.events) byEvent[event] = []

  for (const row of useable) {
    const list = byEvent[row.event] ?? (byEvent[row.event] = [])
    if (list.length < perEventCap) list.push(row)
  }

  return { byEvent, truncated }
}
