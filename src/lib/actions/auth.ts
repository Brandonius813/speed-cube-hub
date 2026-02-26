"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateUniqueHandle } from "@/lib/actions/profiles"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Return success instead of server-side redirect so the browser
  // processes the auth cookies before navigating to a protected route
  return { success: true }
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const firstName = (formData.get("firstName") as string)?.trim()
  const middleName = (formData.get("middleName") as string)?.trim() || ""
  const lastName = (formData.get("lastName") as string)?.trim()

  if (!email || !password || !firstName || !lastName) {
    return { error: "First name, last name, email, and password are required." }
  }

  // Build display name: "First Last" or "First Middle Last"
  const displayName = middleName
    ? `${firstName} ${middleName} ${lastName}`
    : `${firstName} ${lastName}`

  const supabase = await createClient()

  // Create the auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: "Something went wrong. Please try again." }
  }

  // Create the profile row
  // Generate a unique handle — tries clean name first, adds numbers only if taken
  const handle = await generateUniqueHandle(`${firstName}${lastName}`, supabase)

  // Use admin client to bypass RLS — after signUp with email confirmation,
  // the user doesn't have an active session yet, so RLS would block the insert
  const admin = createAdminClient()
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    display_name: displayName,
    handle,
  })

  if (profileError) {
    // Clean up the orphaned auth account so the user can try again
    try {
      await admin.auth.admin.deleteUser(data.user.id)
    } catch {
      // If cleanup fails, the user can still try signing up again with the same email
      console.error("Failed to clean up orphaned auth account:", data.user.id)
    }
    return { error: "Account setup failed. Please try again." }
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
      .select("*", { count: "exact", head: true })
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

