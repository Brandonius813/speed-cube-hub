import { notFound } from "next/navigation"
import { ClubDetailContent } from "@/components/clubs/club-detail-content"
import { getClub, getClubMembers, getClubFeed } from "@/lib/actions/clubs"

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [clubResult, membersResult, feedResult] = await Promise.all([
    getClub(id),
    getClubMembers(id),
    getClubFeed(id),
  ])

  if (!clubResult.club) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <ClubDetailContent
        club={clubResult.club}
        members={membersResult.members}
        feedItems={feedResult.items}
        currentUserId={clubResult.currentUserId ?? null}
      />
    </main>
  )
}
