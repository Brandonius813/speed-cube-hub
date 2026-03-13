import { NextRequest, NextResponse } from "next/server"
import { getSafeNextPath } from "@/lib/auth/next-path"
import { createAuthRouteClient } from "@/lib/auth/route-client"
import { ensureAuthUserBootstrap } from "@/lib/auth/bootstrap"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const next = getSafeNextPath(searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  // Create the redirect response FIRST so we can set cookies on it
  const redirectUrl = new URL(next, request.url)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createAuthRouteClient(request, response)

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
    try {
      await ensureAuthUserBootstrap(user)
    } catch (bootstrapError) {
      console.error("Google OAuth profile bootstrap failed", bootstrapError)
    }
  }

  return response
}
