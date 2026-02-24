import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const errorParam = searchParams.get("error")

  // If user denied access or something went wrong at WCA
  if (errorParam || !code) {
    return NextResponse.redirect(
      new URL("/profile?wca_error=denied", request.url)
    )
  }

  // Build the success redirect response so we can set cookies on it
  const successUrl = new URL("/profile?wca_linked=true", request.url)
  const response = NextResponse.redirect(successUrl)

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
      const errorBody = await tokenRes.text()
      console.error("WCA token exchange failed:", errorBody)
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

    // Create Supabase client with cookies on the redirect response
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?redirect=/profile", request.url)
      )
    }

    // Extract country from WCA profile for region filtering
    const wcaCountryIso2 = meData.me?.country_iso2 ?? null

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ wca_id: wcaId, country_id: wcaCountryIso2 })
      .eq("id", user.id)

    if (updateError) {
      return NextResponse.redirect(
        new URL("/profile?wca_error=save_failed", request.url)
      )
    }

    return response
  } catch {
    return NextResponse.redirect(
      new URL("/profile?wca_error=unknown", request.url)
    )
  }
}
