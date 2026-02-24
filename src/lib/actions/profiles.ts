"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Profile, ProfileAccomplishment, ProfileCube, ProfileLink, Session } from "@/lib/types"

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

const AVATAR_MAX_SIZE = 2 * 1024 * 1024 // 2MB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function uploadAvatar(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const file = formData.get("avatar") as File | null
  if (!file || file.size === 0) {
    return { success: false, error: "No file provided." }
  }

  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPG, PNG, and WebP images are allowed." }
  }

  if (file.size > AVATAR_MAX_SIZE) {
    return { success: false, error: "Image must be under 2MB." }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const filePath = `${user.id}/avatar.${ext}`

  // Use admin client to bypass storage RLS
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    console.error("Avatar upload error:", uploadError)
    return { success: false, error: "Failed to upload image. Please try again." }
  }

  const { data: urlData } = admin.storage
    .from("avatars")
    .getPublicUrl(filePath)

  // Add cache-busting param so the browser loads the new image
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  // Save the URL to the profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    return { success: false, error: "Image uploaded but failed to update profile." }
  }

  revalidatePath("/profile")
  return { success: true, url: publicUrl }
}

const VALID_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "discord",
  "wca",
  "website",
] as const

export async function updateProfileLinks(
  links: ProfileLink[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (links.length > 10) {
    return { success: false, error: "Maximum 10 links allowed." }
  }

  // Validate each link
  for (const link of links) {
    if (!link.url.trim()) {
      return { success: false, error: "URL is required for each link." }
    }
    const url = link.url.trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { success: false, error: `Invalid URL: ${url}` }
    }
    if (!link.label.trim()) {
      return { success: false, error: "Label is required for each link." }
    }
    if (!VALID_PLATFORMS.includes(link.platform as (typeof VALID_PLATFORMS)[number])) {
      return { success: false, error: `Invalid platform: ${link.platform}` }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      links: links.map((l) => ({
        platform: l.platform,
        url: l.url.trim(),
        label: l.label.trim(),
      })),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function updateProfileAccomplishments(
  accomplishments: ProfileAccomplishment[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (accomplishments.length > 20) {
    return { success: false, error: "Maximum 20 accomplishments allowed." }
  }

  for (const a of accomplishments) {
    if (!a.title.trim()) {
      return { success: false, error: "Title is required for each accomplishment." }
    }
    if (a.title.length > 200) {
      return { success: false, error: "Title must be under 200 characters." }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      accomplishments: accomplishments.map((a) => ({
        title: a.title.trim(),
        date: a.date || null,
      })),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function updateProfileCubes(
  cubes: ProfileCube[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (cubes.length > 20) {
    return { success: false, error: "Maximum 20 cubes allowed." }
  }

  for (const c of cubes) {
    if (!c.name.trim()) {
      return { success: false, error: "Cube name is required." }
    }
    if (!c.event.trim()) {
      return { success: false, error: "Event is required for each cube." }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      cubes: cubes.map((c) => ({
        name: c.name.trim(),
        brand: c.brand.trim(),
        model: c.model.trim(),
        event: c.event.trim(),
      })),
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
