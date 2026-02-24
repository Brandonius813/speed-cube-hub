import { LeaderboardsContent } from "@/components/leaderboards/leaderboards-content"
import { getAllLeaderboards } from "@/lib/actions/leaderboards"

export default async function LeaderboardsPage() {
  // Fetch all 4 leaderboard categories in parallel so tab switching is instant
  const initialData = await getAllLeaderboards()

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Leaderboards
      </h1>
      <LeaderboardsContent initialData={initialData} />
    </main>
  )
}
