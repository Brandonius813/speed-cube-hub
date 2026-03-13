import type { EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { ensureAuthUserBootstrap } from "@/lib/auth/bootstrap"
import { getSafeNextPath } from "@/lib/auth/next-path"
import { createAuthRouteClient } from "@/lib/auth/route-client"

const SUPPORTED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email",
  "email_change",
])

function getOtpType(type: string | null): EmailOtpType | null {
  if (!type) {
    return null
  }

  return SUPPORTED_OTP_TYPES.has(type as EmailOtpType)
    ? (type as EmailOtpType)
    : null
}

function getFailureRedirect(
  request: NextRequest,
  type: EmailOtpType | null,
  nextPath: string
) {
  const url = new URL("/login", request.url)

  if (type === "recovery") {
    url.searchParams.set("error", "recovery_failed")
  } else {
    url.searchParams.set("error", "confirmation_failed")
    url.searchParams.set("next", nextPath)
  }

  return url
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tokenHash = searchParams.get("token_hash")
  const type = getOtpType(searchParams.get("type"))
  const nextPath = getSafeNextPath(searchParams.get("next"))

  if (!tokenHash || !type) {
    return NextResponse.redirect(getFailureRedirect(request, type, nextPath))
  }

  const redirectPath = type === "recovery" ? "/reset-password" : nextPath
  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  const supabase = createAuthRouteClient(request, response)

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    return NextResponse.redirect(getFailureRedirect(request, type, nextPath))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    try {
      await ensureAuthUserBootstrap(user)
    } catch (bootstrapError) {
      console.error("Email confirmation bootstrap failed", bootstrapError)
    }
  }

  return response
}
