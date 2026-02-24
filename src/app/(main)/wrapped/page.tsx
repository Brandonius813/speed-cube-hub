import { WrappedContent } from "@/components/wrapped/wrapped-content"
import { getWrappedStats } from "@/lib/actions/wrapped"

export default async function WrappedPage() {
  const currentYear = new Date().getFullYear()
  const stats = await getWrappedStats(currentYear)

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <WrappedContent initialStats={stats} initialYear={currentYear} />
    </main>
  )
}
