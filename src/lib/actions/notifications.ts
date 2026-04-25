"use server"

import { createClient } from "@/lib/supabase/server"
import type { Notification } from "@/lib/types"

/**
 * Collapse multiple unread "like" notifications on the same target into a
 * single grouped row. Comments, follows, PBs, and read notifications are
 * never grouped (each carries its own context).
 */
function groupLikeNotifications(notifications: Notification[]): Notification[] {
  // Bucket unread likes by reference_id, preserving the most-recent one as
  // the primary (notifications come in already sorted desc by created_at).
  const buckets = new Map<string, Notification[]>()
  for (const n of notifications) {
    if (n.type !== "like" || n.read || !n.reference_id) continue
    const list = buckets.get(n.reference_id) ?? []
    list.push(n)
    buckets.set(n.reference_id, list)
  }

  const dropIds = new Set<string>()
  const enrichedById = new Map<string, Notification>()
  for (const [, group] of buckets) {
    if (group.length < 2) continue
    const [primary, ...rest] = group
    enrichedById.set(primary.id, {
      ...primary,
      group_count: group.length,
      group_ids: group.map((n) => n.id),
    })
    for (const r of rest) dropIds.add(r.id)
  }

  return notifications
    .filter((n) => !dropIds.has(n.id))
    .map((n) => enrichedById.get(n.id) ?? n)
}

/**
 * Get the current user's notifications, most recent first.
 * Joins with the actor's profile to show their name/avatar.
 * Unread likes on the same post are collapsed into one grouped row.
 * RLS policy: SELECT where user_id = auth.uid().
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

  const { data, error } = await supabase
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

  return { notifications: groupLikeNotifications((data ?? []) as Notification[]) }
}

/**
 * Mark a single notification as read.
 * RLS policy: UPDATE where user_id = auth.uid().
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

  const { error } = await supabase
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

  const { error } = await supabase
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

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false)

  if (error) {
    return { count: 0, error: error.message }
  }

  return { count: count ?? 0 }
}
