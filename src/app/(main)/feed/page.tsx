import { FeedContent } from "@/components/feed/feed-content"
import { getFeed } from "@/lib/actions/feed"

export default async function FeedPage() {
  const { items, nextCursor } = await getFeed()

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Feed</h1>
      <FeedContent initialItems={items} initialCursor={nextCursor} />
    </main>
  )
}
