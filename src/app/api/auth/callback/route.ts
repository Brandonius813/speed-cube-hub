import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/practice-stats"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/practice-stats"

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  // Create the redirect response FIRST so we can set cookies on it
  const redirectUrl = new URL(next, request.url)
  const response = NextResponse.redirect(redirectUrl)

  // Create Supabase client that sets cookies directly on the redirect response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Exchange the code for a session — cookies are set on the response
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

      // Find a unique handle — single query instead of looping
      const baseHandle = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 30)

      const { data: existingHandles } = await supabase
        .from("profiles")
        .select("handle")
        .ilike("handle", `${baseHandle}%`)

      const taken = new Set((existingHandles ?? []).map((r) => r.handle as string))

      let handle = baseHandle
      if (taken.has(baseHandle)) {
        const prefix = baseHandle.slice(0, 26)
        for (let i = 1; i <= 999; i++) {
          const candidate = `${prefix}${i}`
          if (!taken.has(candidate)) {
            handle = candidate
            break
          }
        }
      }

      // Use the Google profile picture if available
      const googleAvatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null

      await supabase.from("profiles").insert({
        id: user.id,
        display_name: fullName,
        handle,
        avatar_url: googleAvatarUrl,
      })
    }
  }

  return response
}
