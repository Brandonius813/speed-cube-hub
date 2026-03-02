import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/revalidate-wca
 *
 * Busts the "wca-rankings" cache tag so the leaderboard picks up
 * fresh data after a WCA sync. Protected by SUPABASE_SERVICE_ROLE_KEY
 * so only the sync workflow (or admin) can call it.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expected = process.env.REVALIDATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  revalidateTag("wca-rankings")

  return NextResponse.json({ revalidated: true })
}
