import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Shield, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

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
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-yellow-400" />
          <p className="text-muted-foreground">
            Review pending competitive achievement claims.
          </p>
          <Button asChild className="min-h-11">
            <Link href="/admin/achievements">Open Achievement Queue</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
