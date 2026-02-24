"use server"

import { createClient } from "@/lib/supabase/server"

const VALID_CATEGORIES = ["bug", "feature", "general", "other"] as const
type FeedbackCategory = (typeof VALID_CATEGORIES)[number]

export async function submitFeedback(
  category: FeedbackCategory,
  message: string,
  pageUrl?: string
): Promise<{ success?: boolean; error?: string }> {
  const trimmed = message.trim()
  if (!trimmed) {
    return { error: "Message cannot be empty" }
  }
  if (trimmed.length > 1000) {
    return { error: "Message must be 1000 characters or less" }
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return { error: "Invalid category" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    category,
    message: trimmed,
    page_url: pageUrl || null,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
