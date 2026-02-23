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
  // Generate a handle from the name (lowercase, no spaces, add random suffix)
  const baseHandle = `${firstName}${lastName}`
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
