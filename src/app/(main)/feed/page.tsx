import { FeedContent } from "@/components/feed/feed-content"
import { FollowingSidebar } from "@/components/feed/following-sidebar"
import { ScrollToTopOnMount } from "@/components/shared/scroll-to-top-on-mount"
import { getFeed } from "@/lib/actions/feed"
import { getFollowing } from "@/lib/actions/follows"

export default async function FeedPage() {
  const { items, highlights, nextCursor, currentUserId } = await getFeed({ mode: "following" })
  const following = currentUserId ? await getFollowing(currentUserId) : []

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <ScrollToTopOnMount />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Feed</h1>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <FeedContent
            initialItems={items}
            initialHighlights={highlights}
            initialCursor={nextCursor}
            currentUserId={currentUserId ?? null}
          />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <FollowingSidebar following={following} />
          </div>
        </aside>
      </div>
    </main>
  )
}
