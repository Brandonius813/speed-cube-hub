import { DiscoverContent } from "@/components/discover/discover-content"
import { searchProfiles, getDistinctLocations } from "@/lib/actions/profiles"

export default async function DiscoverPage() {
  const [{ profiles }, { locations }] = await Promise.all([
    searchProfiles(""),
    getDistinctLocations(),
  ])

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Discover Cubers
      </h1>
      <DiscoverContent initialProfiles={profiles} locations={locations} />
    </main>
  )
}
