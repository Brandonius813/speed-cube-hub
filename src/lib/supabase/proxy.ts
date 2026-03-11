import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Routes that require authentication — matched as prefixes.
 * e.g. "/feed" matches both "/feed" and "/feed/something".
 */
const PROTECTED_PREFIXES = [
  "/practice-stats",
  "/dashboard",
  "/feed",
  "/notifications",
  "/log",
  "/pbs",
  "/wrapped",
  "/challenges",
  "/clubs",
  "/timer",
  "/import",
  "/admin",
]

/**
 * Additional routes that should be blocked on phones even if they are public.
 */
const PHONE_BLOCKED_PUBLIC_PREFIXES = [
  "/tools",
  "/battle",
]

/**
 * Routes protected only at the exact path.
 * "/profile" is protected (your own profile), but "/profile/handle" is public.
 */
const PROTECTED_EXACT = ["/profile"]

const MOBILE_UNSUPPORTED_ROUTE = "/mobile-unsupported"

/**
 * Auth pages that logged-in users should be redirected away from.
 */
const AUTH_ROUTES = ["/login", "/signup"]

const CRAWLER_USER_AGENT_RE =
  /bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|embedly|quora link preview|applebot|google page speed/i

const TABLET_USER_AGENT_RE = /ipad|tablet|playbook|silk/i

const PHONE_USER_AGENT_RE =
  /iphone|ipod|windows phone|iemobile|blackberry|bb10|webos|opera mini|android.+mobile/i

/**
 * Public exceptions — sub-paths of protected prefixes that should stay public.
 */
function isPublicException(pathname: string): boolean {
  // /profile/[handle] — any sub-path of /profile is a public profile page
  if (pathname.startsWith("/profile/")) return true
  // /clubs/[id] — club detail pages are public
  if (/^\/clubs\/[^/]+/.test(pathname)) return true
  return false
}

function isProtectedRoute(pathname: string): boolean {
  if (isPublicException(pathname)) return false
  if (PROTECTED_EXACT.includes(pathname)) return true
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

function isPhoneBlockedRoute(pathname: string): boolean {
  if (pathname === MOBILE_UNSUPPORTED_ROUTE) return false
  if (isProtectedRoute(pathname)) return true

  return PHONE_BLOCKED_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext) {
    return "/feed"
  }

  if (!rawNext.startsWith("/") || rawNext.startsWith("//") || rawNext.startsWith("/\\")) {
    return "/feed"
  }

  if (AUTH_ROUTES.includes(rawNext)) {
    return "/feed"
  }

  return rawNext
}

function isCrawlerRequest(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? ""
  return CRAWLER_USER_AGENT_RE.test(userAgent)
}

export function isPhoneRequest(request: NextRequest) {
  if (isCrawlerRequest(request)) return false

  const userAgent = request.headers.get("user-agent") ?? ""
  if (!userAgent) return false
  if (TABLET_USER_AGENT_RE.test(userAgent)) return false
  if (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) return false

  return PHONE_USER_AGENT_RE.test(userAgent)
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isPhoneRequest(request) && isPhoneBlockedRoute(pathname)) {
    const url = request.nextUrl.clone()
    const attemptedPath = `${pathname}${request.nextUrl.search}`
    url.pathname = MOBILE_UNSUPPORTED_ROUTE
    url.search = ""
    url.searchParams.set("from", attemptedPath)
    return NextResponse.redirect(url)
  }

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

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.

  // getUser() contacts the Supabase Auth server to validate the session and
  // automatically refreshes expired tokens (triggering setAll with new cookies).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    const redirectResponse = NextResponse.redirect(url)
    // Carry any cookies the Supabase client set (e.g., clearing stale sessions)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  // Redirect authenticated users away from login/signup to feed
  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = getSafeNextPath(request.nextUrl.searchParams.get("next"))
    url.search = ""
    const redirectResponse = NextResponse.redirect(url)
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
