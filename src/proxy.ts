import { updateSession } from "@/lib/supabase/proxy"
import { type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/practice-stats/:path*",
    "/dashboard/:path*",
    "/feed/:path*",
    "/notifications/:path*",
    "/log/:path*",
    "/pbs/:path*",
    "/wrapped/:path*",
    "/challenges/:path*",
    "/clubs",
    "/timer/:path*",
    "/import/:path*",
    "/admin/:path*",
    "/profile",
    "/tools/:path*",
    "/battle/:path*",
  ],
}
