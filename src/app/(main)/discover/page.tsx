import { DiscoverContent } from "@/components/discover/discover-content"
import { searchProfiles, getDistinctLocations } from "@/lib/actions/profiles"
import { createClient } from "@/lib/supabase/server"
import { getFollowing } from "@/lib/actions/follows"

export default async function DiscoverPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ profiles }, { locations }, followingList] = await Promise.all([
    searchProfiles(""),
    getDistinctLocations(),
    user ? getFollowing(user.id) : Promise.resolve([]),
  ])

  const followingIds = followingList.map((u) => u.id)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Discover Cubers
      </h1>
      <DiscoverContent
        initialProfiles={profiles}
        locations={locations}
        currentUserId={user?.id ?? null}
        initialFollowingIds={followingIds}
      />
    </main>
  )
}
