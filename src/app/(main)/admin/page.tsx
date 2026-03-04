import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Shield } from "lucide-react"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/")
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-6 w-6 text-yellow-400" />
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No admin tools configured yet.
        </p>
      </div>
    </main>
  )
}
