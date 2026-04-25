import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { FeedEntryCard } from "@/components/feed/feed-entry-card"
import { getFeedEntryById } from "@/lib/actions/feed"

export default async function FeedEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { entry, currentUserId } = await getFeedEntryById(id)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/feed"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      {entry ? (
        <FeedEntryCard entry={entry} currentUserId={currentUserId} />
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Post not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This post may have been removed, or you may not have access to it.
          </p>
        </div>
      )}
    </main>
  )
}
