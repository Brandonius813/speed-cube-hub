"use client"

import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileStats } from "@/components/profile/profile-stats"
import { MainCubes } from "@/components/profile/main-cubes"
import { Accomplishments } from "@/components/profile/accomplishments"
import { PBGrid } from "@/components/profile/pb-grid"
import { YtdStats } from "@/components/profile/ytd-stats"
import { LinksSponsors } from "@/components/profile/links-sponsors"
import { RecentActivity } from "@/components/profile/recent-activity"
import { WcaResults } from "@/components/profile/wca-results"
import { FollowButton } from "@/components/profile/follow-button"
import { PracticeHeatmap } from "@/components/dashboard/practice-heatmap"
import type { Profile, Session } from "@/lib/types"
import type { WcaPersonResult } from "@/lib/actions/wca"

export function PublicProfileContent({
  profile,
  sessions,
  wcaData,
  isOwner,
  isLoggedIn,
  isFollowing,
  followerCount,
  followingCount,
}: {
  profile: Profile
  sessions: Session[]
  wcaData: WcaPersonResult | null
  isOwner: boolean
  isLoggedIn: boolean
  isFollowing: boolean
  followerCount: number
  followingCount: number
}) {
  const followButton =
    !isOwner && isLoggedIn ? (
      <FollowButton
        targetUserId={profile.id}
        initialIsFollowing={isFollowing}
      />
    ) : undefined

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        followButton={followButton}
        followerCount={followerCount}
        followingCount={followingCount}
      />
      <ProfileStats sessions={sessions} />
      {wcaData && (
        <WcaResults
          personalRecords={wcaData.personal_records}
          competitionCount={wcaData.competition_count}
          wcaId={profile.wca_id}
        />
      )}
      <PBGrid sessions={sessions} />
      <YtdStats sessions={sessions} />
      <MainCubes cubes={profile.cubes ?? []} isOwner={isOwner} />
      <Accomplishments accomplishments={profile.accomplishments ?? []} isOwner={isOwner} />
      <LinksSponsors links={profile.links} isOwner={isOwner} />
      <PracticeHeatmap sessions={sessions} />
      <RecentActivity sessions={sessions.slice(0, 10)} />
    </div>
  )
}
