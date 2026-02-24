import { FeedContent } from "@/components/feed/feed-content"
import { FollowingSidebar } from "@/components/feed/following-sidebar"
import { getFeed } from "@/lib/actions/feed"
import { getFollowing } from "@/lib/actions/follows"

export default async function FeedPage() {
  const { items, nextCursor, currentUserId } = await getFeed()

  // Fetch the following list for the sidebar (only if logged in)
  const following = currentUserId ? await getFollowing(currentUserId) : []

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Feed</h1>
      <div className="flex gap-8">
        {/* Feed column — stays centered and constrained */}
        <div className="min-w-0 max-w-2xl flex-1">
          <FeedContent initialItems={items} initialCursor={nextCursor} currentUserId={currentUserId ?? null} />
        </div>

        {/* Following sidebar — desktop only */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20">
            <FollowingSidebar following={following} />
          </div>
        </aside>
      </div>
    </main>
  )
}
