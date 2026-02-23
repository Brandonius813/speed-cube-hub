"use server"

import { createClient } from "@/lib/supabase/server"
import type { Profile, Session } from "@/lib/types"

export async function getProfile(): Promise<{
  profile: Profile | null
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { profile: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  return { profile: data as Profile }
}

export async function getRecentActivity(): Promise<Session[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching recent activity:", error)
    return []
  }

  return data as Session[]
}
