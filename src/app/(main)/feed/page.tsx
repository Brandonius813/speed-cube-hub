import { FeedContent } from "@/components/feed/feed-content"
import { FollowingSidebar } from "@/components/feed/following-sidebar"
import { ScrollToTopOnMount } from "@/components/shared/scroll-to-top-on-mount"
import { getUserClubs } from "@/lib/actions/clubs"
import { getFeed } from "@/lib/actions/feed"
import { getFollowing } from "@/lib/actions/follows"

export default async function FeedPage() {
  const { items, highlights, nextCursor, currentUserId } = await getFeed({ mode: "following" })
  const following = currentUserId ? await getFollowing(currentUserId) : []
  const userClubs = currentUserId ? await getUserClubs(currentUserId) : { clubs: [] }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <ScrollToTopOnMount />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Feed</h1>
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <FeedContent
            initialItems={items}
            initialHighlights={highlights}
            initialCursor={nextCursor}
            currentUserId={currentUserId ?? null}
            showAds={currentUserId !== process.env.ADMIN_USER_ID}
            feedInlineSlot={process.env.NEXT_PUBLIC_ADSENSE_FEED_INLINE_SLOT ?? null}
          />
        </div>

        <aside className="hidden lg:block lg:pt-16">
          <div className="sticky top-20">
            <FollowingSidebar following={following} clubs={userClubs.clubs} />
          </div>
        </aside>
      </div>
    </main>
  )
}
