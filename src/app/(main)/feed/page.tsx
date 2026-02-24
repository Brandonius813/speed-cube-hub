import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { FeedContent } from "@/components/feed/feed-content"
import { getFeed } from "@/lib/actions/feed"

export const dynamic = "force-dynamic"

export default async function FeedPage() {
  const { items, nextCursor } = await getFeed()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Feed</h1>
        <FeedContent initialItems={items} initialCursor={nextCursor} />
      </main>
      <Footer />
    </div>
  )
}
