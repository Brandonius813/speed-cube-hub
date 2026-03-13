"use server"

import { createClient } from "@/lib/supabase/server"
import { buildAuthConfirmUrl } from "@/lib/auth/app-url"
import { ensureAuthUserBootstrap, buildDisplayName } from "@/lib/auth/bootstrap"
import { getSafeNextPath } from "@/lib/auth/next-path"

type AuthActionResult =
  | {
      success: true
      email?: string
    }
  | {
      error: string
      canResendConfirmation?: boolean
    }

function canResendConfirmationFromMessage(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  )
}

export async function login(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const message = canResendConfirmationFromMessage(error.message)
      ? "You need to confirm your email before you can log in."
      : error.message

    return {
      error: message,
      canResendConfirmation: canResendConfirmationFromMessage(error.message),
    }
  }

  if (data.user) {
    try {
      await ensureAuthUserBootstrap(data.user)
    } catch (bootstrapError) {
      console.error("Login bootstrap repair failed", bootstrapError)
    }
  }

  // Return success instead of server-side redirect so the browser
  // processes the auth cookies before navigating to a protected route
  return { success: true }
}

export async function signup(
  formData: FormData,
  nextPath?: string
): Promise<AuthActionResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const firstName = (formData.get("firstName") as string)?.trim()
  const middleName = (formData.get("middleName") as string)?.trim() || ""
  const lastName = (formData.get("lastName") as string)?.trim()

  if (!email || !password || !firstName || !lastName) {
    return { error: "First name, last name, email, and password are required." }
  }

  const displayName = buildDisplayName(firstName, middleName, lastName)

  const supabase = await createClient()
  const safeNextPath = getSafeNextPath(nextPath)

  // Create the auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthConfirmUrl(safeNextPath),
      data: {
        full_name: displayName,
        given_name: firstName,
        middle_name: middleName,
        family_name: lastName,
      },
    },
  })

  if (error) {
    return {
      error: error.message,
      canResendConfirmation: canResendConfirmationFromMessage(error.message),
    }
  }

  if (!data.user) {
    return { error: "Something went wrong. Please try again." }
  }

  if (data.user.identities?.length === 0) {
    return {
      error:
        "An account with this email already exists. If you still need the confirmation email, resend it below.",
      canResendConfirmation: true,
    }
  }

  try {
    await ensureAuthUserBootstrap(data.user, {
      displayName,
      handleSeed: `${firstName}${lastName}`,
    })
  } catch (bootstrapError) {
    console.error("Signup bootstrap repair failed", bootstrapError)
  }

  return { success: true, email }
}

export async function resendSignupConfirmation(
  email: string,
  nextPath?: string
): Promise<AuthActionResult> {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return { error: "Enter your email address first." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: trimmedEmail,
    options: {
      emailRedirectTo: buildAuthConfirmUrl(getSafeNextPath(nextPath)),
    },
  })

  if (error) {
    return {
      error:
        error.message ||
        "Could not send another confirmation email right now. Please try again shortly.",
    }
  }

  return { success: true, email: trimmedEmail }
}

export async function requestPasswordReset(
  email: string
): Promise<AuthActionResult> {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return { error: "Enter your email address first." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo: buildAuthConfirmUrl(),
  })

  if (error) {
    return {
      error:
        error.message ||
        "Could not send a password reset email right now. Please try again shortly.",
    }
  }

  return { success: true, email: trimmedEmail }
}

export async function updatePassword(
  formData: FormData
): Promise<AuthActionResult> {
  const password = (formData.get("password") as string)?.trim()
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim()

  if (!password || !confirmPassword) {
    return { error: "Enter and confirm your new password." }
  }

  if (password.length < 6) {
    return { error: "Your new password must be at least 6 characters." }
  }

  if (password !== confirmPassword) {
    return { error: "Your password entries do not match." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error:
        "That reset link is invalid or expired. Request a new password reset email to try again.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return {
      error:
        error.message ||
        "Could not update your password right now. Please try again.",
    }
  }

  try {
    await ensureAuthUserBootstrap(user)
  } catch (bootstrapError) {
    console.error("Password reset bootstrap repair failed", bootstrapError)
  }

  return { success: true }
}

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user && user.id === process.env.ADMIN_USER_ID
}

export type NavbarData = {
  isLoggedIn: false
} | {
  isLoggedIn: true
  displayName: string
  avatarUrl: string | null
  unreadCount: number
  isAdmin: boolean
}

/**
 * Single server action that returns everything the navbar needs.
 * Replaces 3 separate calls (getProfile, getUnreadCount, checkIsAdmin)
 * each of which called getUser() internally — so this cuts 7+ round trips to 1.
 */
export async function getNavbarData(): Promise<NavbarData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isLoggedIn: false }
  }

  // Fetch only the two profile columns the navbar uses + unread count in parallel
  const [profileResult, unreadResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
  ])

  return {
    isLoggedIn: true,
    displayName: profileResult.data?.display_name ?? "",
    avatarUrl: profileResult.data?.avatar_url ?? null,
    unreadCount: unreadResult.count ?? 0,
    isAdmin: user.id === process.env.ADMIN_USER_ID,
  }
}
