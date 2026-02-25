import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getSessions } from "@/lib/actions/sessions"
import { getGoals, checkGoalProgress } from "@/lib/actions/goals"
import { computeSessionStats } from "@/lib/utils"

export default async function DashboardPage() {
  // Check for expired/achieved goals, then fetch everything in parallel
  await checkGoalProgress()

  const [sessionsResult, goalsResult] = await Promise.all([
    getSessions(),
    getGoals(),
  ])
  const stats = computeSessionStats(sessionsResult.data)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Track your cubing practice and progress.
        </p>
      </div>

      <DashboardContent
        initialSessions={sessionsResult.data}
        initialStats={stats}
        initialGoals={goalsResult.data}
      />
    </main>
  )
}
