"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

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

  redirect("/dashboard")
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const displayName = formData.get("displayName") as string

  if (!email || !password || !displayName) {
    return { error: "All fields are required." }
  }

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
  // Generate a handle from the display name (lowercase, no spaces, add random suffix)
  const baseHandle = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20)
  const handle = `${baseHandle}${Math.floor(Math.random() * 1000)}`

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    display_name: displayName,
    handle,
  })

  if (profileError) {
    return { error: "Account created but profile setup failed. Please try logging in." }
  }

  redirect("/dashboard")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
