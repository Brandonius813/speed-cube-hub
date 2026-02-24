import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getPendingBadgeClaims } from "@/lib/actions/badges"
import { BadgeQueueContent } from "@/components/admin/badge-queue-content"

export default async function AdminBadgesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/")
  }

  const { data: claims } = await getPendingBadgeClaims()

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Pending Badge Claims
      </h1>
      <BadgeQueueContent initialClaims={claims} />
    </main>
  )
}
