"use client"

import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileStats } from "@/components/profile/profile-stats"
import { BadgesSection } from "@/components/profile/badges-section"
import { YtdStats } from "@/components/profile/ytd-stats"
import { RecentActivity } from "@/components/profile/recent-activity"
import type { Profile, Session, UserBadge, Badge } from "@/lib/types"

export function TabOverview({
  profile,
  sessions,
  isOwner,
  isAdmin = false,
  userBadges = [],
  allBadges = [],
  followerCount = 0,
  followingCount = 0,
  followButton,
}: {
  profile: Profile
  sessions: Session[]
  isOwner: boolean
  isAdmin?: boolean
  userBadges?: UserBadge[]
  allBadges?: Badge[]
  followerCount?: number
  followingCount?: number
  followButton?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Mobile only: show ProfileHeader here since sidebar is hidden */}
      <div className="lg:hidden">
        <ProfileHeader
          profile={profile}
          isOwner={isOwner}
          followButton={followButton}
          followerCount={followerCount}
          followingCount={followingCount}
        />
      </div>

      <ProfileStats sessions={sessions} />

      <BadgesSection
        userBadges={userBadges}
        allBadges={allBadges}
        isOwner={isOwner}
        isAdmin={isAdmin}
      />

      <YtdStats sessions={sessions} />
      <RecentActivity sessions={sessions.slice(0, 10)} />
    </div>
  )
}
