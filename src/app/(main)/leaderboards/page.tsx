import { LeaderboardsContent } from "@/components/leaderboards/leaderboards-content"
import { AdSlot } from "@/components/ads/ad-slot"
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
  const leaderboardsAdSlot =
    process.env.NEXT_PUBLIC_ADSENSE_LEADERBOARDS_SIDEBAR_SLOT ?? null

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Leaderboards
      </h1>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <LeaderboardsContent
            initialData={initialData}
            initialWcaData={{
              "sor:single:world:all": sorSingleData,
              "kinch:combined:world:all": kinchSingleData,
            }}
            countries={countries}
            wcaLastUpdated={wcaLastUpdated}
          />
        </div>
        {leaderboardsAdSlot ? (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <AdSlot
                slotId={leaderboardsAdSlot}
                minHeight={600}
                showOnMobile={false}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  )
}
