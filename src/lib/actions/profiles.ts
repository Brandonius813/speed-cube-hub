"use server"

import { revalidatePath } from "next/cache"
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

export async function updateProfile(fields: {
  display_name?: string
  bio?: string | null
  avatar_url?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate display_name if provided
  if (fields.display_name !== undefined) {
    const name = fields.display_name.trim()
    if (!name || name.length < 1) {
      return { success: false, error: "Display name is required." }
    }
    if (name.length > 100) {
      return { success: false, error: "Display name must be under 100 characters." }
    }
    fields.display_name = name
  }

  // Validate bio if provided
  if (fields.bio !== undefined && fields.bio !== null) {
    if (fields.bio.length > 500) {
      return { success: false, error: "Bio must be under 500 characters." }
    }
  }

  // Validate avatar_url if provided
  if (fields.avatar_url !== undefined && fields.avatar_url !== null) {
    const url = fields.avatar_url.trim()
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      return { success: false, error: "Avatar URL must start with http:// or https://" }
    }
    fields.avatar_url = url || null
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
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
