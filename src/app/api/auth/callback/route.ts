import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  const supabase = await createClient()

  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url))
  }

  // Check if this user already has a profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()

    // If no profile exists, create one using their Google account info
    if (!profile) {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User"

      const baseHandle = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20)
      const handle = `${baseHandle}${Math.floor(Math.random() * 1000)}`

      await supabase.from("profiles").insert({
        id: user.id,
        display_name: fullName,
        handle,
        avatar_url: user.user_metadata?.avatar_url || null,
      })
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
