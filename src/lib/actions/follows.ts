"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createNotification } from "@/lib/helpers/create-notification"
import {
  getSocialPreviewFollowingUsers,
  getSocialPreviewSocialState,
  isSocialPreviewMode,
} from "@/lib/social-preview/mock-data"

type PreferenceTable = "favorite_follows" | "muted_users"

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
    if (error.code === "23505") {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  await createNotification(followingId, "follow", user.id)

  revalidatePath("/feed")
  revalidatePath("/profile")
  revalidatePath("/discover")
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
  revalidatePath("/profile")
  revalidatePath("/discover")
  return { success: true }
}

async function togglePreference(
  table: PreferenceTable,
  targetUserId: string,
  mode: "add" | "remove"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (user.id === targetUserId) {
    return { success: false, error: "You cannot do that to yourself." }
  }

  const query =
    table === "favorite_follows"
      ? mode === "add"
        ? supabase
            .from(table)
            .insert({ follower_id: user.id, following_id: targetUserId })
        : supabase
            .from(table)
            .delete()
            .eq("follower_id", user.id)
            .eq("following_id", targetUserId)
      : mode === "add"
        ? supabase
            .from(table)
            .insert({ user_id: user.id, muted_user_id: targetUserId })
        : supabase
            .from(table)
            .delete()
            .eq("user_id", user.id)
            .eq("muted_user_id", targetUserId)

  const { error } = await query

  if (error) {
    if (mode === "add" && error.code === "23505") {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/feed")
  revalidatePath("/discover")
  return { success: true }
}

export async function favoriteUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  return togglePreference("favorite_follows", targetUserId, "add")
}

export async function unfavoriteUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  return togglePreference("favorite_follows", targetUserId, "remove")
}

export async function muteUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  return togglePreference("muted_users", targetUserId, "add")
}

export async function unmuteUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  return togglePreference("muted_users", targetUserId, "remove")
}

export async function getFollowCounts(
  userId: string
): Promise<{ followers: number; following: number }> {
  const supabase = await createClient()

  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
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

  const { data } = await supabase
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
  is_favorite?: boolean
}

export async function getFollowers(
  userId: string
): Promise<FollowListUser[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, profiles!follows_follower_id_fkey(id, display_name, handle, avatar_url)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error || !data) return []

  return data.map((row) => {
    const profile = row.profiles as unknown as FollowListUser
    return {
      id: profile.id,
      display_name: profile.display_name,
      handle: profile.handle,
      avatar_url: profile.avatar_url,
    }
  })
}

export async function getFollowing(
  userId: string
): Promise<FollowListUser[]> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewFollowingUsers()
  }

  const supabase = await createClient()

  const [followingResult, favoritesResult] = await Promise.all([
    supabase
      .from("follows")
      .select("following_id, profiles!follows_following_id_fkey(id, display_name, handle, avatar_url)")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("favorite_follows")
      .select("following_id")
      .eq("follower_id", userId),
  ])

  if (followingResult.error || !followingResult.data) return []

  const favoriteIds = new Set(
    (favoritesResult.data ?? []).map((row) => row.following_id as string)
  )

  return followingResult.data.map((row) => {
    const profile = row.profiles as unknown as FollowListUser
    return {
      id: profile.id,
      display_name: profile.display_name,
      handle: profile.handle,
      avatar_url: profile.avatar_url,
      is_favorite: favoriteIds.has(profile.id),
    }
  })
}

export async function getFavoriteFollowingIds(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from("favorite_follows")
    .select("following_id")
    .eq("follower_id", user.id)

  return (data ?? []).map((row) => row.following_id as string)
}

export async function getMutedUserIds(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from("muted_users")
    .select("muted_user_id")
    .eq("user_id", user.id)

  return (data ?? []).map((row) => row.muted_user_id as string)
}

export async function getViewerSocialState(): Promise<{
  currentUserId: string | null
  followingIds: string[]
  favoriteIds: string[]
  mutedIds: string[]
}> {
  if (isSocialPreviewMode()) {
    return getSocialPreviewSocialState()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { currentUserId: null, followingIds: [], favoriteIds: [], mutedIds: [] }
  }

  const [following, favorites, muted] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase
      .from("favorite_follows")
      .select("following_id")
      .eq("follower_id", user.id),
    supabase.from("muted_users").select("muted_user_id").eq("user_id", user.id),
  ])

  return {
    currentUserId: user.id,
    followingIds: (following.data ?? []).map((row) => row.following_id as string),
    favoriteIds: (favorites.data ?? []).map((row) => row.following_id as string),
    mutedIds: (muted.data ?? []).map((row) => row.muted_user_id as string),
  }
}
