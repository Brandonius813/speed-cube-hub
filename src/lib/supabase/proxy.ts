import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes protected with sub-paths (e.g., /dashboard, /dashboard/*)
const PROTECTED_ROUTES = ["/practice-stats", "/log", "/feed", "/challenges", "/notifications", "/pbs"]

// Routes protected only at the exact path (e.g., /profile but NOT /profile/handle)
const PROTECTED_EXACT = ["/profile"]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and supabase.auth.getClaims().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.

  // getClaims() validates the JWT locally (no network request) and refreshes
  // expired tokens. This is faster and more reliable than getUser().
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Redirect unauthenticated users away from protected routes
  const pathname = request.nextUrl.pathname
  const isProtected =
    PROTECTED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    ) ||
    PROTECTED_EXACT.some((route) => pathname === route)

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    const redirectResponse = NextResponse.redirect(url)
    // Carry any cookies the Supabase client set (e.g., clearing stale sessions)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object, make sure to:
  // 1. Pass the request in it: NextResponse.next({ request })
  // 2. Copy over the cookies: newResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // If this is not done, the browser and server can go out of sync and
  // terminate the user's session prematurely.

  return supabaseResponse
}
