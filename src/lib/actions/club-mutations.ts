"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Create a new club. The creator is automatically added as the "owner" member.
 */
export async function createClub(
  name: string,
  description?: string
): Promise<{ clubId?: string; error?: string }> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: "Club name is required" }
  }
  if (trimmedName.length > 100) {
    return { error: "Club name must be 100 characters or less" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      name: trimmedName,
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (clubError || !club) {
    return { error: clubError?.message ?? "Failed to create club" }
  }

  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: "owner",
  })

  if (memberError) {
    await supabase.from("clubs").delete().eq("id", club.id)
    return { error: memberError.message }
  }

  return { clubId: club.id }
}

/**
 * Join a club as a "member".
 */
export async function joinClub(
  clubId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase.from("club_members").insert({
    club_id: clubId,
    user_id: user.id,
    role: "member",
  })

  if (error) {
    if (error.code === "23505") {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Leave a club. Cannot leave if you are the only owner.
 */
export async function leaveClub(
  clubId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single()

  if (membership?.role === "owner") {
    const { count } = await supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("role", "owner")

    if ((count ?? 0) <= 1) {
      return {
        success: false,
        error: "Cannot leave — you are the only owner. Delete the club or transfer ownership first.",
      }
    }
  }

  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Update club details (owner/admin only).
 */
export async function updateClub(
  clubId: string,
  fields: { name?: string; description?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const admin = createAdminClient()

  const { data: membership } = await admin
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single()

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only owners and admins can update club details" }
  }

  const updates: Record<string, string | null> = {}
  if (fields.name !== undefined) {
    const trimmed = fields.name.trim()
    if (!trimmed) return { success: false, error: "Club name is required" }
    if (trimmed.length > 100) return { success: false, error: "Club name must be 100 characters or less" }
    updates.name = trimmed
  }
  if (fields.description !== undefined) {
    updates.description = fields.description.trim() || null
  }

  const { error } = await admin
    .from("clubs")
    .update(updates)
    .eq("id", clubId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete a club (owner only).
 */
export async function deleteClub(
  clubId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const admin = createAdminClient()

  const { data: membership } = await admin
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "owner") {
    return { success: false, error: "Only the owner can delete this club" }
  }

  const { error } = await admin.from("clubs").delete().eq("id", clubId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
