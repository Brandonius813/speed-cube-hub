import Link from "next/link"
import type { Metadata } from "next"
import { Box, Monitor, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Desktop or iPad Required — Speed Cube Hub",
  description: "Speed Cube Hub is not available on phones yet.",
}

type MobileUnsupportedPageProps = {
  searchParams?: Promise<{
    from?: string | string[] | undefined
  }>
}

function getSafeFromPath(rawFrom: string | string[] | null | undefined) {
  const fromPath = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom

  if (!fromPath) return null
  if (!fromPath.startsWith("/") || fromPath.startsWith("//") || fromPath.startsWith("/\\")) {
    return null
  }

  return fromPath
}

export default async function MobileUnsupportedPage({
  searchParams,
}: MobileUnsupportedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const fromPath = getSafeFromPath(resolvedSearchParams?.from)

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <section className="w-full overflow-hidden rounded-3xl border border-border/50 bg-card/95 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
            <Box className="h-3.5 w-3.5 text-primary" />
            Phone web blocked
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Monitor className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-balance">
            Speed Cube Hub isn&apos;t available on phones yet.
          </h1>

          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Use a desktop or iPad for now.
          </p>

          {fromPath && (
            <p className="mt-4 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
              You tried to open{" "}
              <span className="font-mono text-foreground">{fromPath}</span>
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg" className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/">
                <Box className="h-4 w-4" />
                Go Home
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="min-h-11 border-border/60">
              <Link href="/leaderboards">
                <Trophy className="h-4 w-4" />
                View Leaderboards
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Public pages like the homepage, login, sign up, leaderboards, discover,
            public profiles, and public clubs still work on phones.
          </p>
        </section>
      </div>
    </main>
  )
}
