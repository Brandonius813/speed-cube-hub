import { LeaderboardsContent } from "@/components/leaderboards/leaderboards-content"
import { getAllLeaderboards } from "@/lib/actions/leaderboards"
import { getWcaCountries, getSorKinchLeaderboard } from "@/lib/actions/sor-kinch"
import type { WcaLeaderboardPage } from "@/lib/actions/sor-kinch"
import { createClient } from "@/lib/supabase/server"

export default async function LeaderboardsPage() {
  const supabase = await createClient()

  // Fetch leaderboards + user WCA ID all in parallel
  // The profile query chains off the auth promise so it starts as soon as auth resolves
  const authPromise = supabase.auth.getUser()
  const [initialData, countries, sorSingleData, kinchSingleData, userWcaId] = await Promise.all([
    getAllLeaderboards(),
    getWcaCountries().catch(() => []),
    getSorKinchLeaderboard("sor", "single").catch((): WcaLeaderboardPage => ({ entries: [], totalCount: 0 })),
    getSorKinchLeaderboard("kinch", "single").catch((): WcaLeaderboardPage => ({ entries: [], totalCount: 0 })),
    authPromise.then(async ({ data: { user } }) => {
      if (!user) return null
      const { data: profile } = await supabase
        .from("profiles")
        .select("wca_id")
        .eq("id", user.id)
        .single()
      return profile?.wca_id ?? null
    }),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Leaderboards
      </h1>
      <LeaderboardsContent
        initialData={initialData}
        initialWcaData={{
          "sor:single:world:all": sorSingleData,
          "kinch:combined:world:all": kinchSingleData,
        }}
        countries={countries}
        userWcaId={userWcaId}
      />
    </main>
  )
}

// Always fetch fresh data — leaderboards change whenever anyone logs a session
export const dynamic = "force-dynamic"
