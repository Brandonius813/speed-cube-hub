import { LeaderboardsContent } from "@/components/leaderboards/leaderboards-content"
import { getAllLeaderboards } from "@/lib/actions/leaderboards"
import {
  getLatestWcaSyncTimestamp,
  getSorKinchLeaderboard,
  getWcaCountries,
} from "@/lib/actions/sor-kinch"
import type { WcaLeaderboardPage } from "@/lib/actions/sor-kinch"

export const revalidate = 300

export default async function LeaderboardsPage() {
  const [initialData, countries, sorSingleData, kinchSingleData, wcaLastUpdated] = await Promise.all([
    getAllLeaderboards(),
    getWcaCountries().catch(() => []),
    getSorKinchLeaderboard("sor", "single").catch((): WcaLeaderboardPage => ({ entries: [], totalCount: 0 })),
    getSorKinchLeaderboard("kinch", "single").catch((): WcaLeaderboardPage => ({ entries: [], totalCount: 0 })),
    getLatestWcaSyncTimestamp().catch(() => null),
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
        wcaLastUpdated={wcaLastUpdated}
      />
    </main>
  )
}
