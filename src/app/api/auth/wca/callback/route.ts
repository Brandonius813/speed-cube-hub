import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  // If user denied access or something went wrong at WCA
  if (error || !code) {
    return NextResponse.redirect(
      new URL("/profile?wca_error=denied", request.url)
    )
  }

  try {
    // Exchange the authorization code for an access token
    const tokenRes = await fetch(
      "https://www.worldcubeassociation.org/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: process.env.WCA_CLIENT_ID,
          client_secret: process.env.WCA_CLIENT_SECRET,
          redirect_uri: `${request.nextUrl.origin}/api/auth/wca/callback`,
        }),
      }
    )

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        new URL("/profile?wca_error=token_failed", request.url)
      )
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Use the access token to get the user's WCA profile
    const meRes = await fetch(
      "https://www.worldcubeassociation.org/api/v0/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!meRes.ok) {
      return NextResponse.redirect(
        new URL("/profile?wca_error=fetch_failed", request.url)
      )
    }

    const meData = await meRes.json()
    const wcaId = meData.me?.wca_id

    if (!wcaId) {
      return NextResponse.redirect(
        new URL("/profile?wca_error=no_wca_id", request.url)
      )
    }

    // Save the verified WCA ID to the user's profile
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?redirect=/profile", request.url)
      )
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ wca_id: wcaId })
      .eq("id", user.id)

    if (updateError) {
      return NextResponse.redirect(
        new URL("/profile?wca_error=save_failed", request.url)
      )
    }

    // Success — redirect back to profile
    return NextResponse.redirect(
      new URL("/profile?wca_linked=true", request.url)
    )
  } catch {
    return NextResponse.redirect(
      new URL("/profile?wca_error=unknown", request.url)
    )
  }
}
