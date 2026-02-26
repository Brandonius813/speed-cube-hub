"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logPBSchema, bulkPBItemSchema, updatePBSchema, zodFirstError } from "@/lib/validations"
import type { PBRecord } from "@/lib/types"

function mapPBRow(pb: Record<string, unknown>): PBRecord {
  return {
    ...pb,
    time_seconds: Number(pb.time_seconds),
    mbld_solved: (pb.mbld_solved as number) ?? null,
    mbld_attempted: (pb.mbld_attempted as number) ?? null,
  } as PBRecord
}

/**
 * MBLD scoring: points = solved - unsolved = 2*solved - attempted.
 * Higher points = better. Tiebreaker: lower time wins.
 * Returns true if "a" is a better MBLD result than "b".
 */
function isBetterMBLD(
  a: { mbld_solved: number; mbld_attempted: number; time_seconds: number },
  b: { mbld_solved: number; mbld_attempted: number; time_seconds: number }
): boolean {
  const pointsA = 2 * a.mbld_solved - a.mbld_attempted
  const pointsB = 2 * b.mbld_solved - b.mbld_attempted
  if (pointsA !== pointsB) return pointsA > pointsB
  return a.time_seconds < b.time_seconds
}

export async function getCurrentPBs(): Promise<{
  data: PBRecord[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("personal_bests")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .order("event")

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []).map(mapPBRow) }
}

/** Fetch current PBs for any user (public — no auth required) */
export async function getPBsByUserId(
  userId: string
): Promise<{ data: PBRecord[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("personal_bests")
    .select("*")
    .eq("user_id", userId)
    .eq("is_current", true)
    .order("event")

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []).map(mapPBRow) }
}

export async function logNewPB(fields: {
  event: string
  pb_type: string
  time_seconds: number
  date_achieved: string
  notes?: string
  mbld_solved?: number
  mbld_attempted?: number
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = logPBSchema.safeParse(fields)
  if (!parsed.success) {
    return { success: false, error: zodFirstError(parsed.error) }
  }

  const isMBLD = fields.event === "333mbf"

  if (isMBLD) {
    if (!fields.mbld_solved || !fields.mbld_attempted) {
      return { success: false, error: "Solved/attempted is required for Multi-BLD." }
    }
    if (fields.mbld_solved > fields.mbld_attempted) {
      return { success: false, error: "Solved cannot be greater than attempted." }
    }
  }

  // Check if there's an existing current PB for this event+type
  const { data: existing } = await supabase
    .from("personal_bests")
    .select("id, time_seconds, mbld_solved, mbld_attempted")
    .eq("user_id", user.id)
    .eq("event", fields.event)
    .eq("pb_type", fields.pb_type)
    .eq("is_current", true)
    .order("time_seconds", { ascending: true })
    .limit(1)
    .maybeSingle()

  let isBest: boolean
  if (!existing) {
    isBest = true
  } else if (isMBLD && fields.mbld_solved && fields.mbld_attempted) {
    isBest = isBetterMBLD(
      { mbld_solved: fields.mbld_solved, mbld_attempted: fields.mbld_attempted, time_seconds: fields.time_seconds },
      { mbld_solved: Number(existing.mbld_solved) || 0, mbld_attempted: Number(existing.mbld_attempted) || 0, time_seconds: Number(existing.time_seconds) }
    )
  } else {
    isBest = fields.time_seconds < Number(existing.time_seconds)
  }

  // If the new one is best, unmark ALL old current PBs for this event+type
  if (isBest) {
    await supabase
      .from("personal_bests")
      .update({ is_current: false })
      .eq("user_id", user.id)
      .eq("event", fields.event)
      .eq("pb_type", fields.pb_type)
      .eq("is_current", true)
  }

  const { error } = await supabase.from("personal_bests").insert({
    user_id: user.id,
    event: fields.event,
    pb_type: fields.pb_type,
    time_seconds: fields.time_seconds,
    date_achieved: fields.date_achieved,
    is_current: isBest,
    notes: fields.notes || null,
    mbld_solved: isMBLD ? (fields.mbld_solved ?? null) : null,
    mbld_attempted: isMBLD ? (fields.mbld_attempted ?? null) : null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/pbs")
  return { success: true }
}

export async function bulkImportPBs(
  entries: {
    event: string
    pb_type: string
    time_seconds: number
    date_achieved: string
    mbld_solved?: number
    mbld_attempted?: number
  }[]
): Promise<{ success: boolean; imported: number; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, imported: 0, error: "Not authenticated" }
  }

  if (!entries.length) {
    return { success: false, imported: 0, error: "No entries to import." }
  }

  if (entries.length > 500) {
    return { success: false, imported: 0, error: "Maximum 500 PBs per import." }
  }

  // Validate all entries with Zod + MBLD cross-field checks
  for (let i = 0; i < entries.length; i++) {
    const parsed = bulkPBItemSchema.safeParse(entries[i])
    if (!parsed.success) {
      return { success: false, imported: 0, error: `Row ${i + 1}: ${zodFirstError(parsed.error)}` }
    }
    const e = entries[i]
    if (e.event === "333mbf") {
      if (!e.mbld_solved || !e.mbld_attempted) return { success: false, imported: 0, error: `Row ${i + 1}: Multi-BLD requires solved/attempted.` }
      if (e.mbld_solved > e.mbld_attempted) return { success: false, imported: 0, error: `Row ${i + 1}: Solved cannot exceed attempted.` }
    }
  }

  // Fetch all current PBs for this user so we can handle is_current logic
  const { data: currentPBs } = await supabase
    .from("personal_bests")
    .select("id, event, pb_type, time_seconds, mbld_solved, mbld_attempted")
    .eq("user_id", user.id)
    .eq("is_current", true)

  // Build a map of current PBs
  type CurrentPB = { id: string; time_seconds: number; mbld_solved: number; mbld_attempted: number }
  const currentMap = new Map<string, CurrentPB>()
  for (const pb of currentPBs || []) {
    currentMap.set(`${pb.event}|${pb.pb_type}`, {
      id: pb.id,
      time_seconds: Number(pb.time_seconds),
      mbld_solved: Number(pb.mbld_solved) || 0,
      mbld_attempted: Number(pb.mbld_attempted) || 0,
    })
  }

  // Find the best entry per event+type in the import batch
  type BatchBest = { time_seconds: number; mbld_solved: number; mbld_attempted: number }
  const bestInBatch = new Map<string, BatchBest>()
  for (const e of entries) {
    const key = `${e.event}|${e.pb_type}`
    const current = bestInBatch.get(key)
    const candidate = {
      time_seconds: e.time_seconds,
      mbld_solved: e.mbld_solved || 0,
      mbld_attempted: e.mbld_attempted || 0,
    }
    if (!current) {
      bestInBatch.set(key, candidate)
    } else if (e.event === "333mbf") {
      if (isBetterMBLD(candidate, current)) bestInBatch.set(key, candidate)
    } else {
      if (e.time_seconds < current.time_seconds) bestInBatch.set(key, candidate)
    }
  }

  // Build rows — only mark the single best per event+type as current
  const assignedCurrent = new Set<string>()
  const rows = entries.map((e) => {
    const key = `${e.event}|${e.pb_type}`
    const dbCurrent = currentMap.get(key)
    const batchBest = bestInBatch.get(key)!
    const isMBLD = e.event === "333mbf"

    // Check if this entry is the batch best
    let isThisBatchBest: boolean
    if (isMBLD) {
      isThisBatchBest = (e.mbld_solved || 0) === batchBest.mbld_solved
        && (e.mbld_attempted || 0) === batchBest.mbld_attempted
        && e.time_seconds === batchBest.time_seconds
        && !assignedCurrent.has(key)
    } else {
      isThisBatchBest = e.time_seconds === batchBest.time_seconds && !assignedCurrent.has(key)
    }

    // Check if batch best beats the DB current
    let beatsDb: boolean
    if (!dbCurrent) {
      beatsDb = true
    } else if (isMBLD) {
      beatsDb = isBetterMBLD(batchBest, dbCurrent)
    } else {
      beatsDb = batchBest.time_seconds < dbCurrent.time_seconds
    }

    const isCurrent = isThisBatchBest && beatsDb
    if (isCurrent) assignedCurrent.add(key)

    return {
      user_id: user.id,
      event: e.event,
      pb_type: e.pb_type,
      time_seconds: e.time_seconds,
      date_achieved: e.date_achieved,
      is_current: isCurrent,
      mbld_solved: isMBLD ? (e.mbld_solved ?? null) : null,
      mbld_attempted: isMBLD ? (e.mbld_attempted ?? null) : null,
    }
  })

  // Unmark old current PBs that are being beaten
  const idsToUnmark: string[] = []
  for (const [key, batchBest] of bestInBatch) {
    const dbCurrent = currentMap.get(key)
    if (!dbCurrent) continue
    const isMBLD = key.startsWith("333mbf|")
    const beats = isMBLD ? isBetterMBLD(batchBest, dbCurrent) : batchBest.time_seconds < dbCurrent.time_seconds
    if (beats) idsToUnmark.push(dbCurrent.id)
  }

  if (idsToUnmark.length > 0) {
    await supabase
      .from("personal_bests")
      .update({ is_current: false })
      .in("id", idsToUnmark)
      .eq("user_id", user.id)
  }

  // Insert all new PBs
  const { error } = await supabase.from("personal_bests").insert(rows)

  if (error) {
    return { success: false, imported: 0, error: error.message }
  }

  revalidatePath("/pbs")
  return { success: true, imported: rows.length }
}

export async function getPBHistory(
  event: string,
  pbType: string
): Promise<{ data: PBRecord[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("personal_bests")
    .select("*")
    .eq("user_id", user.id)
    .eq("event", event)
    .eq("pb_type", pbType)
    .order("date_achieved", { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []).map(mapPBRow) }
}

export async function deletePB(
  pbId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get the PB we're about to delete
  const { data: pbToDelete } = await supabase
    .from("personal_bests")
    .select("event, pb_type, is_current")
    .eq("id", pbId)
    .eq("user_id", user.id)
    .single()

  if (!pbToDelete) {
    return { success: false, error: "PB not found" }
  }

  const { error } = await supabase
    .from("personal_bests")
    .delete()
    .eq("id", pbId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  // If we deleted the current PB, promote the next best
  if (pbToDelete.is_current) {
    const isMBLD = pbToDelete.event === "333mbf"

    if (isMBLD) {
      // For MBLD: fetch all remaining, find the best by MBLD scoring
      const { data: remaining } = await supabase
        .from("personal_bests")
        .select("id, time_seconds, mbld_solved, mbld_attempted")
        .eq("user_id", user.id)
        .eq("event", pbToDelete.event)
        .eq("pb_type", pbToDelete.pb_type)

      if (remaining && remaining.length > 0) {
        let bestId = remaining[0].id
        let best = {
          mbld_solved: Number(remaining[0].mbld_solved) || 0,
          mbld_attempted: Number(remaining[0].mbld_attempted) || 0,
          time_seconds: Number(remaining[0].time_seconds),
        }
        for (let i = 1; i < remaining.length; i++) {
          const candidate = {
            mbld_solved: Number(remaining[i].mbld_solved) || 0,
            mbld_attempted: Number(remaining[i].mbld_attempted) || 0,
            time_seconds: Number(remaining[i].time_seconds),
          }
          if (isBetterMBLD(candidate, best)) {
            best = candidate
            bestId = remaining[i].id
          }
        }
        await supabase
          .from("personal_bests")
          .update({ is_current: true })
          .eq("id", bestId)
          .eq("user_id", user.id)
      }
    } else {
      // For non-MBLD: promote the fastest by time
      const { data: nextBest } = await supabase
        .from("personal_bests")
        .select("id")
        .eq("user_id", user.id)
        .eq("event", pbToDelete.event)
        .eq("pb_type", pbToDelete.pb_type)
        .order("time_seconds", { ascending: true })
        .limit(1)
        .single()

      if (nextBest) {
        await supabase
          .from("personal_bests")
          .update({ is_current: true })
          .eq("id", nextBest.id)
          .eq("user_id", user.id)
      }
    }
  }

  revalidatePath("/pbs")
  return { success: true }
}

export async function updatePB(
  pbId: string,
  fields: {
    time_seconds: number
    date_achieved: string
    notes?: string
    mbld_solved?: number
    mbld_attempted?: number
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get the existing PB to know its event/type
  const { data: existing } = await supabase
    .from("personal_bests")
    .select("event, pb_type")
    .eq("id", pbId)
    .eq("user_id", user.id)
    .single()

  if (!existing) {
    return { success: false, error: "PB not found" }
  }

  const parsed = updatePBSchema.safeParse(fields)
  if (!parsed.success) {
    return { success: false, error: zodFirstError(parsed.error) }
  }

  const isMBLD = existing.event === "333mbf"

  if (isMBLD) {
    if (!fields.mbld_solved || !fields.mbld_attempted) {
      return { success: false, error: "Solved/attempted is required for Multi-BLD." }
    }
    if (fields.mbld_solved > fields.mbld_attempted) {
      return { success: false, error: "Solved cannot be greater than attempted." }
    }
  }

  // Update the record
  const { error } = await supabase
    .from("personal_bests")
    .update({
      time_seconds: fields.time_seconds,
      date_achieved: fields.date_achieved,
      notes: fields.notes || null,
      mbld_solved: isMBLD ? (fields.mbld_solved ?? null) : null,
      mbld_attempted: isMBLD ? (fields.mbld_attempted ?? null) : null,
    })
    .eq("id", pbId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  // Re-evaluate which PB is the "current" best for this event+type
  // First, unmark all as not current
  await supabase
    .from("personal_bests")
    .update({ is_current: false })
    .eq("user_id", user.id)
    .eq("event", existing.event)
    .eq("pb_type", existing.pb_type)

  // Then find and promote the actual best
  if (isMBLD) {
    const { data: all } = await supabase
      .from("personal_bests")
      .select("id, time_seconds, mbld_solved, mbld_attempted")
      .eq("user_id", user.id)
      .eq("event", existing.event)
      .eq("pb_type", existing.pb_type)

    if (all && all.length > 0) {
      let bestId = all[0].id
      let best = {
        mbld_solved: Number(all[0].mbld_solved) || 0,
        mbld_attempted: Number(all[0].mbld_attempted) || 0,
        time_seconds: Number(all[0].time_seconds),
      }
      for (let i = 1; i < all.length; i++) {
        const candidate = {
          mbld_solved: Number(all[i].mbld_solved) || 0,
          mbld_attempted: Number(all[i].mbld_attempted) || 0,
          time_seconds: Number(all[i].time_seconds),
        }
        if (isBetterMBLD(candidate, best)) {
          best = candidate
          bestId = all[i].id
        }
      }
      await supabase
        .from("personal_bests")
        .update({ is_current: true })
        .eq("id", bestId)
        .eq("user_id", user.id)
    }
  } else {
    const { data: best } = await supabase
      .from("personal_bests")
      .select("id")
      .eq("user_id", user.id)
      .eq("event", existing.event)
      .eq("pb_type", existing.pb_type)
      .order("time_seconds", { ascending: true })
      .limit(1)
      .single()

    if (best) {
      await supabase
        .from("personal_bests")
        .update({ is_current: true })
        .eq("id", best.id)
        .eq("user_id", user.id)
    }
  }

  revalidatePath("/pbs")
  return { success: true }
}
