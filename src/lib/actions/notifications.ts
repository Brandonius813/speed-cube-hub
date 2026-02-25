"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Notification } from "@/lib/types"

/**
 * Get the current user's notifications, most recent first.
 * Joins with the actor's profile to show their name/avatar.
 * Uses admin client because SELECT policy requires auth.uid() match,
 * but we verify auth here and use admin for the query to avoid
 * cookie/RLS timing issues in server actions.
 */
export async function getNotifications(
  limit: number = 50
): Promise<{ notifications: Notification[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { notifications: [], error: "Not authenticated" }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey(
        display_name,
        handle,
        avatar_url
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return { notifications: [], error: error.message }
  }

  return { notifications: (data ?? []) as Notification[] }
}

/**
 * Mark a single notification as read.
 * Uses admin client, but verifies the notification belongs to the
 * current user first.
 */
export async function markAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Mark all of the current user's notifications as read.
 */
export async function markAllAsRead(): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get the count of unread notifications for the current user.
 * Used by the navbar to show the badge number.
 */
export async function getUnreadCount(): Promise<{
  count: number
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { count: 0, error: "Not authenticated" }
  }

  const admin = createAdminClient()
  const { count, error } = await admin
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false)

  if (error) {
    return { count: 0, error: error.message }
  }

  return { count: count ?? 0 }
}
