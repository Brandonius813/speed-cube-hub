"use server"

import { createClient } from "@/lib/supabase/server"
import { createClubSchema, updateClubSchema, zodFirstError } from "@/lib/validations"

/**
 * Create a new club. The creator is automatically added as the "owner" member.
 */
export async function createClub(
  name: string,
  description?: string,
  avatarUrl?: string,
  visibility: "public" | "private" = "public"
): Promise<{ clubId?: string; error?: string }> {
  const parsed = createClubSchema.safeParse({ name, description, avatar_url: avatarUrl, visibility })
  if (!parsed.success) {
    return { error: zodFirstError(parsed.error) }
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
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      avatar_url: parsed.data.avatar_url?.trim() || null,
      visibility: parsed.data.visibility,
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

  // Fetch role + owner count in parallel (avoid sequential round-trips)
  const [{ data: membership }, { count: ownerCount }] = await Promise.all([
    supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("role", "owner"),
  ])

  if (membership?.role === "owner" && (ownerCount ?? 0) <= 1) {
    return {
      success: false,
      error: "Cannot leave — you are the only owner. Delete the club or transfer ownership first.",
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
  fields: {
    name?: string
    description?: string
    avatar_url?: string
    visibility?: "public" | "private"
  }
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

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only owners and admins can update club details" }
  }

  const parsed = updateClubSchema.safeParse(fields)
  if (!parsed.success) {
    return { success: false, error: zodFirstError(parsed.error) }
  }

  const updates: Record<string, string | null> = {}
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name
  }
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description?.trim() || null
  }
  if (parsed.data.avatar_url !== undefined) {
    updates.avatar_url = parsed.data.avatar_url?.trim() || null
  }
  if (parsed.data.visibility !== undefined) {
    updates.visibility = parsed.data.visibility
  }

  const { error } = await supabase
    .from("clubs")
    .update(updates)
    .eq("id", clubId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

async function getManageableClubRole(clubId: string, userId: string) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .single()

  return {
    supabase,
    role: membership?.role ?? null,
  }
}

export async function pinClubPost(
  clubId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { role } = await getManageableClubRole(clubId, user.id)
  if (!role || !["owner", "admin"].includes(role)) {
    return { success: false, error: "Only owners and admins can pin posts" }
  }

  const { data: post } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .single()

  if (!post) {
    return { success: false, error: "Post not found" }
  }

  const { data: memberMatch } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", post.user_id)
    .single()

  if (!memberMatch) {
    return { success: false, error: "Only posts from club members can be pinned" }
  }

  const { error } = await supabase
    .from("clubs")
    .update({ pinned_post_id: postId })
    .eq("id", clubId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function unpinClubPost(
  clubId: string
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { supabase, role } = await getManageableClubRole(clubId, user.id)
  if (!role || !["owner", "admin"].includes(role)) {
    return { success: false, error: "Only owners and admins can pin posts" }
  }

  const { error } = await supabase
    .from("clubs")
    .update({ pinned_post_id: null })
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

  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "owner") {
    return { success: false, error: "Only the owner can delete this club" }
  }

  const { error } = await supabase.from("clubs").delete().eq("id", clubId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
