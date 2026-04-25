import { createAdminClient } from "@/lib/supabase/admin"
import type { Notification } from "@/lib/types"

/**
 * Create a notification for a user.
 * Uses the admin client because the actor (caller) doesn't own the
 * notification row — the recipient does — so RLS would block a
 * regular client insert.
 *
 * This is an internal helper — NOT a server action.
 * It must only be called from other server-side code.
 */
export async function createNotification(
  userId: string,
  type: Notification["type"],
  actorId: string | null,
  referenceId: string | null = null,
  previewText: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    type,
    actor_id: actorId,
    reference_id: referenceId,
    preview_text: previewText,
  })

  if (error) {
    console.error("Failed to create notification:", error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}
