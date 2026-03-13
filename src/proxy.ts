import { updateSession } from "@/lib/supabase/proxy"
import { type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/leaderboards/:path*",
    "/discover/:path*",
    "/practice-stats/:path*",
    "/dashboard/:path*",
    "/feed/:path*",
    "/notifications/:path*",
    "/log/:path*",
    "/pbs/:path*",
    "/wrapped/:path*",
    "/challenges/:path*",
    "/clubs",
    "/clubs/:path*",
    "/timer/:path*",
    "/import/:path*",
    "/admin/:path*",
    "/profile",
    "/profile/:path*",
    "/privacy",
    "/terms",
    "/tools/:path*",
    "/battle/:path*",
  ],
}
