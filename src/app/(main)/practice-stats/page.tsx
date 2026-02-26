import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getSessions } from "@/lib/actions/sessions"
import type { Session } from "@/lib/types"

export default async function DashboardPage() {
  let sessions: Session[] = []

  try {
    const result = await getSessions()
    sessions = result.data
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

      <DashboardContent initialSessions={sessions} />
    </main>
  )
}
