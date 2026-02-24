import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getSessions, getSessionStats } from "@/lib/actions/sessions"
import { getGoals, checkGoalProgress } from "@/lib/actions/goals"

const defaultStats = {
  sessionsThisWeek: 0,
  totalMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  weeklyMinutes: 0,
  weeklyChange: 0,
}

export default async function DashboardPage() {
  // Check for expired/achieved goals (non-blocking — don't let this crash the page)
  try {
    await checkGoalProgress()
  } catch (err) {
    console.error("[Dashboard] checkGoalProgress failed:", err)
  }

  let sessions: Awaited<ReturnType<typeof getSessions>>["data"] = []
  let stats = defaultStats
  let goals: Awaited<ReturnType<typeof getGoals>>["data"] = []

  try {
    const [sessionsResult, statsResult, goalsResult] = await Promise.all([
      getSessions(),
      getSessionStats(),
      getGoals(),
    ])
    sessions = sessionsResult.data
    stats = statsResult
    goals = goalsResult.data
  } catch (err) {
    console.error("[Dashboard] Data fetch failed:", err)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Practice Stats
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Track your cubing practice and progress.
        </p>
      </div>

      <DashboardContent
        initialSessions={sessions}
        initialStats={stats}
        initialGoals={goals}
      />
    </main>
  )
}
