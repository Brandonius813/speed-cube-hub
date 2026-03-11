import { DiscoverContent } from "@/components/discover/discover-content"
import { getViewerSocialState } from "@/lib/actions/follows"
import { searchAll } from "@/lib/actions/profiles"
import { createClient } from "@/lib/supabase/server"

export default async function DiscoverPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ results }, socialState] = await Promise.all([
    searchAll(""),
    getViewerSocialState(),
  ])

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Discover</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Search people, posts, clubs, and upcoming competitions from one place.
      </p>
      <DiscoverContent
        initialResults={results}
        currentUserId={user?.id ?? socialState.currentUserId ?? null}
        initialFollowingIds={socialState.followingIds}
        initialFavoriteIds={socialState.favoriteIds}
        initialMutedIds={socialState.mutedIds}
      />
    </main>
  )
}
