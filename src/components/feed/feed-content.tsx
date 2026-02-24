"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import { FeedItem as FeedItemCard } from "@/components/feed/feed-item"
import { getFeed } from "@/lib/actions/feed"
import type { FeedItem } from "@/lib/types"

export function FeedContent({
  initialItems,
  initialCursor,
  currentUserId,
}: {
  initialItems: FeedItem[]
  initialCursor: string | null
  currentUserId: string | null
}) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    if (!cursor || loading) return
    setLoading(true)

    const result = await getFeed(cursor)
    setItems((prev) => [...prev, ...result.items])
    setCursor(result.nextCursor)
    setLoading(false)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-card p-8 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Your feed is empty
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow other cubers to see their practice sessions here.
          </p>
        </div>
        <Link href="/discover">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Discover Cubers
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <FeedItemCard key={item.id} item={item} currentUserId={currentUserId} />
      ))}

      {cursor && (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={loading}
          className="mx-auto min-h-11 w-full max-w-xs border-border/50"
        >
          {loading ? "Loading..." : "Load More"}
        </Button>
      )}
    </div>
  )
}
