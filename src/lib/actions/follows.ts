"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function followUser(
  followingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (user.id === followingId) {
    return { success: false, error: "You cannot follow yourself." }
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: followingId,
  })

  if (error) {
    // Unique constraint violation means already following
    if (error.code === "23505") {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/feed")
  return { success: true }
}

export async function unfollowUser(
  followingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/feed")
  return { success: true }
}

export async function getFollowCounts(
  userId: string
): Promise<{ followers: number; following: number }> {
  // Use admin client to bypass RLS — the follows table may lack a SELECT policy
  const admin = createAdminClient()

  const [followersResult, followingResult] = await Promise.all([
    admin
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    admin
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ])

  return {
    followers: followersResult.count ?? 0,
    following: followingResult.count ?? 0,
  }
}

export async function isFollowing(
  targetUserId: string
): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  // Use admin client to bypass RLS — the follows table may lack a SELECT policy
  const admin = createAdminClient()
  const { data } = await admin
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .single()

  return !!data
}

export type FollowListUser = {
  id: string
  display_name: string
  handle: string
  avatar_url: string | null
}

/** Get the list of users who follow a given user */
export async function getFollowers(
  userId: string
): Promise<FollowListUser[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("follows")
    .select("follower_id, profiles!follows_follower_id_fkey(id, display_name, handle, avatar_url)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    const p = row.profiles as unknown as FollowListUser
    return { id: p.id, display_name: p.display_name, handle: p.handle, avatar_url: p.avatar_url }
  })
}

/** Get the list of users that a given user follows */
export async function getFollowing(
  userId: string
): Promise<FollowListUser[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("follows")
    .select("following_id, profiles!follows_following_id_fkey(id, display_name, handle, avatar_url)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    const p = row.profiles as unknown as FollowListUser
    return { id: p.id, display_name: p.display_name, handle: p.handle, avatar_url: p.avatar_url }
  })
}
