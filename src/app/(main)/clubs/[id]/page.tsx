import { notFound } from "next/navigation"
import { ClubDetailContent } from "@/components/clubs/club-detail-content"
import {
  getClub,
  getClubChallenges,
  getClubFeed,
  getClubLeaderboard,
  getClubMembers,
} from "@/lib/actions/clubs"

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [clubResult, membersResult, feedResult, challengesResult, leaderboardResult] = await Promise.all([
    getClub(id),
    getClubMembers(id),
    getClubFeed(id),
    getClubChallenges(id),
    getClubLeaderboard(id),
  ])

  if (!clubResult.club) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-[92rem] px-4 py-6 sm:px-6 sm:py-8">
      <ClubDetailContent
        club={clubResult.club}
        members={membersResult.members}
        feedItems={feedResult.items}
        challenges={challengesResult.challenges}
        leaderboard={leaderboardResult.entries}
        leaderboardWindowDays={leaderboardResult.windowDays}
        currentUserId={clubResult.currentUserId ?? null}
      />
    </main>
  )
}
