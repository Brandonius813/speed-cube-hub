import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getPendingBadgeClaims } from "@/lib/actions/badges"
import { AchievementQueueContent } from "@/components/admin/achievement-queue-content"

export default async function AdminAchievementsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/")
  }

  const { data: claims, error } = await getPendingBadgeClaims()

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Achievement Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Approve or reject pending competitive achievement claims.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load queue: {error}
        </div>
      ) : (
        <AchievementQueueContent initialClaims={claims} />
      )}
    </main>
  )
}
