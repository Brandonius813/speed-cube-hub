"use server"

import { redirect } from "next/navigation"
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
    return { error: "Account created but profile setup failed. Please try logging in." }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
