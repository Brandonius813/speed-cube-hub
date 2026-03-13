"use server"

import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"

const VALID_CATEGORIES = ["bug", "feature", "general", "other"] as const
type FeedbackCategory = (typeof VALID_CATEGORIES)[number]

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General Feedback",
  other: "Other",
}

const DEFAULT_FEEDBACK_EMAIL_TO = "brandon@speedcubehub.com"
const DEFAULT_FEEDBACK_EMAIL_FROM =
  "Speed Cube Hub <feedback@speedcubehub.com>"

type FeedbackResult = { success?: boolean; error?: string }

type FeedbackReporter = {
  userId: string | null
  displayName: string
  handle: string | null
  email: string | null
}

function sanitizeSingleLine(value: string | null | undefined) {
  return value?.replace(/[\r\n]/g, " ").trim() ?? ""
}

function getFeedbackEmailConfig():
  | {
      resend: Resend
      to: string
      from: string
    }
  | { error: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return {
      error:
        "Feedback email is not configured right now. Please try again shortly.",
    }
  }

  return {
    resend: new Resend(apiKey),
    to: process.env.FEEDBACK_EMAIL_TO?.trim() || DEFAULT_FEEDBACK_EMAIL_TO,
    from:
      process.env.FEEDBACK_EMAIL_FROM?.trim() || DEFAULT_FEEDBACK_EMAIL_FROM,
  }
}

async function getFeedbackReporter() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("Feedback auth lookup failed", userError)
  }

  if (!user) {
    return {
      supabase,
      reporter: {
        userId: null,
        displayName: "Anonymous visitor",
        handle: null,
        email: null,
      } satisfies FeedbackReporter,
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Feedback profile lookup failed", profileError)
  }

  return {
    supabase,
    reporter: {
      userId: user.id,
      displayName:
        sanitizeSingleLine(profile?.display_name) ||
        sanitizeSingleLine(user.email) ||
        "Signed-in user",
      handle: sanitizeSingleLine(profile?.handle) || null,
      email: sanitizeSingleLine(user.email) || null,
    } satisfies FeedbackReporter,
  }
}

function buildFeedbackEmailText(
  category: FeedbackCategory,
  reporter: FeedbackReporter,
  message: string,
  pageUrl?: string
) {
  const handle = reporter.handle ? `@${reporter.handle}` : null

  return [
    `Category: ${CATEGORY_LABELS[category]}`,
    `From: ${reporter.displayName}`,
    handle ? `Handle: ${handle}` : null,
    reporter.email ? `Email: ${reporter.email}` : "Email: Anonymous",
    pageUrl ? `Page: ${pageUrl}` : null,
    "",
    "Message:",
    message,
  ]
    .filter(Boolean)
    .join("\n")
}

export async function submitFeedback(
  category: FeedbackCategory,
  message: string,
  pageUrl?: string
): Promise<FeedbackResult> {
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

  const emailConfig = getFeedbackEmailConfig()
  if ("error" in emailConfig) {
    return { error: emailConfig.error }
  }

  const { supabase, reporter } = await getFeedbackReporter()

  try {
    const emailResult = await emailConfig.resend.emails.send({
      from: emailConfig.from,
      to: emailConfig.to,
      subject: `[${CATEGORY_LABELS[category]}] Feedback from ${reporter.displayName}`,
      text: buildFeedbackEmailText(category, reporter, trimmed, pageUrl),
    })

    if (emailResult.error) {
      console.error("Feedback email send failed", emailResult.error)
      return {
        error: "Could not send feedback right now. Please try again in a moment.",
      }
    }
  } catch (error) {
    console.error("Feedback email request threw", error)
    return {
      error: "Could not send feedback right now. Please try again in a moment.",
    }
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: reporter.userId,
    category,
    message: trimmed,
    page_url: pageUrl || null,
  })

  if (error) {
    console.error("Feedback backup save failed", error)
  }

  return { success: true }
}
