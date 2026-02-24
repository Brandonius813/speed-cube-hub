import { LeaderboardsContent } from "@/components/leaderboards/leaderboards-content"
import { getLeaderboard } from "@/lib/actions/leaderboards"

export default async function LeaderboardsPage() {
  // Fetch the default leaderboard (most_solves) as initial data
  const initialEntries = await getLeaderboard("most_solves")

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Leaderboards
      </h1>
      <LeaderboardsContent initialEntries={initialEntries} />
    </main>
  )
}
