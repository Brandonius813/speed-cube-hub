"use server"

import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"

const resend = new Resend(process.env.RESEND_API_KEY)

const VALID_CATEGORIES = ["bug", "feature", "general", "other"] as const
type FeedbackCategory = (typeof VALID_CATEGORIES)[number]

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General Feedback",
  other: "Other",
}

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

  // Get the user's profile for context in the email
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", user.id)
    .single()

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    category,
    message: trimmed,
    page_url: pageUrl || null,
  })

  if (error) {
    return { error: error.message }
  }

  // Send email notification (don't block the response on failure)
  const displayName = profile?.display_name ?? "Unknown User"
  const handle = profile?.handle ? `@${profile.handle}` : ""

  resend.emails
    .send({
      from: "Speed Cube Hub <feedback@speedcubehub.com>",
      to: "brandon@speedcubehub.com",
      subject: `[${CATEGORY_LABELS[category]}] Feedback from ${displayName}`,
      text: [
        `Category: ${CATEGORY_LABELS[category]}`,
        `From: ${displayName} ${handle} (${user.email})`,
        pageUrl ? `Page: ${pageUrl}` : null,
        ``,
        `Message:`,
        trimmed,
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .catch(() => {
      // Email failure shouldn't break feedback submission
    })

  return { success: true }
}
