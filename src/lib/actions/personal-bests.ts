"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { PBRecord } from "@/lib/types"

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

  return {
    data: (data || []).map((pb) => ({
      ...pb,
      time_seconds: Number(pb.time_seconds),
    })) as PBRecord[],
  }
}

export async function logNewPB(fields: {
  event: string
  pb_type: string
  time_seconds: number
  date_achieved: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (!fields.event) {
    return { success: false, error: "Event is required." }
  }
  if (!fields.pb_type) {
    return { success: false, error: "PB type is required." }
  }
  if (!fields.time_seconds || fields.time_seconds <= 0) {
    return { success: false, error: "Time must be a positive number." }
  }
  if (!fields.date_achieved) {
    return { success: false, error: "Date is required." }
  }

  // Check if there's an existing current PB for this event+type
  const { data: existing } = await supabase
    .from("personal_bests")
    .select("id, time_seconds")
    .eq("user_id", user.id)
    .eq("event", fields.event)
    .eq("pb_type", fields.pb_type)
    .eq("is_current", true)
    .single()

  const isFastest =
    !existing || fields.time_seconds < Number(existing.time_seconds)

  // If the new one is fastest, unmark the old current PB
  if (isFastest && existing) {
    await supabase
      .from("personal_bests")
      .update({ is_current: false })
      .eq("id", existing.id)
      .eq("user_id", user.id)
  }

  const { error } = await supabase.from("personal_bests").insert({
    user_id: user.id,
    event: fields.event,
    pb_type: fields.pb_type,
    time_seconds: fields.time_seconds,
    date_achieved: fields.date_achieved,
    is_current: isFastest,
    notes: fields.notes || null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/pbs")
  return { success: true }
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

  return {
    data: (data || []).map((pb) => ({
      ...pb,
      time_seconds: Number(pb.time_seconds),
    })) as PBRecord[],
  }
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

  // If we deleted the current PB, promote the next fastest
  if (pbToDelete.is_current) {
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

  revalidatePath("/pbs")
  return { success: true }
}
