"use client"

import { useState, useEffect } from "react"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileStats } from "@/components/profile/profile-stats"
import { MainCubes } from "@/components/profile/main-cubes"
import { Accomplishments } from "@/components/profile/accomplishments"
import { PBGrid } from "@/components/profile/pb-grid"
import { PBProgressChart } from "@/components/profile/pb-progress-chart"
import { YtdStats } from "@/components/profile/ytd-stats"
import { LinksSponsors } from "@/components/profile/links-sponsors"
import { RecentActivity } from "@/components/profile/recent-activity"
import { WcaResults } from "@/components/profile/wca-results"
import { WcaResultsSkeleton } from "@/components/profile/wca-results-skeleton"
import { FollowButton } from "@/components/profile/follow-button"
import { BadgesSection } from "@/components/profile/badges-section"
import { PracticeHeatmap } from "@/components/dashboard/practice-heatmap"
import { getWcaResults } from "@/lib/actions/wca"
import type { Profile, Session, UserBadge, Badge } from "@/lib/types"
import type { WcaPersonResult } from "@/lib/actions/wca"

type SorKinchStats = {
  sorRank: number | null
  sorTotal: number | null
  kinchScore: number | null
  kinchRank: number | null
} | null

export function PublicProfileContent({
  profile,
  sessions,
  isOwner,
  isLoggedIn,
  isFollowing,
  followerCount,
  followingCount,
  userBadges = [],
  allBadges = [],
  isAdmin = false,
  sorKinchStats,
}: {
  profile: Profile
  sessions: Session[]
  isOwner: boolean
  isLoggedIn: boolean
  isFollowing: boolean
  followerCount: number
  followingCount: number
  userBadges?: UserBadge[]
  allBadges?: Badge[]
  isAdmin?: boolean
  sorKinchStats?: SorKinchStats
}) {
  const [wcaData, setWcaData] = useState<WcaPersonResult | null>(null)
  const [wcaLoading, setWcaLoading] = useState(!!profile.wca_id)

  // Fetch WCA data client-side so it doesn't block page load
  useEffect(() => {
    if (!profile.wca_id) return

    getWcaResults(profile.wca_id).then((result) => {
      setWcaData(result.data ?? null)
      setWcaLoading(false)
    })
  }, [profile.wca_id])

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
      <ProfileStats sessions={sessions} sorKinchStats={sorKinchStats} />
      {wcaLoading && <WcaResultsSkeleton />}
      {wcaData && (
        <WcaResults
          personalRecords={wcaData.personal_records}
          competitionCount={wcaData.competition_count}
          wcaId={profile.wca_id}
          isOwner={isOwner}
          customEventOrder={profile.wca_event_order}
        />
      )}
      <PBGrid sessions={sessions} displayName={profile.display_name} handle={profile.handle} />
      <PBProgressChart sessions={sessions} />
      <YtdStats sessions={sessions} />
      <MainCubes cubes={profile.cubes ?? []} isOwner={isOwner} />
      <Accomplishments accomplishments={profile.accomplishments ?? []} isOwner={isOwner} />
      <BadgesSection
        userBadges={userBadges}
        allBadges={allBadges}
        isOwner={isOwner}
        isAdmin={isAdmin}
      />
      <LinksSponsors links={profile.links} isOwner={isOwner} />
      <PracticeHeatmap sessions={sessions} />
      <RecentActivity sessions={sessions.slice(0, 10)} />
    </div>
  )
}
