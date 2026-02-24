import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { DiscoverContent } from "@/components/discover/discover-content"
import { searchProfiles } from "@/lib/actions/profiles"

export const dynamic = "force-dynamic"

export default async function DiscoverPage() {
  const { profiles } = await searchProfiles("")

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          Discover Cubers
        </h1>
        <DiscoverContent initialProfiles={profiles} />
      </main>
      <Footer />
    </div>
  )
}
