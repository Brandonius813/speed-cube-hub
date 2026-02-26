import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Shield, Award } from "lucide-react"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/")
  }

  const adminPages = [
    {
      title: "Badge Queue",
      description: "Approve or reject pending badge claims from users.",
      href: "/admin/badges",
      icon: Award,
    },
  ]

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-6 w-6 text-yellow-400" />
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4">
        {adminPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="group flex items-start gap-4 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/50 hover:bg-card/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <page.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground group-hover:text-primary">
                {page.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {page.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
