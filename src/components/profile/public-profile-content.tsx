"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { ProfileTabs, parseTabParam } from "@/components/profile/profile-tabs"
import type { ProfileTab } from "@/components/profile/profile-tabs"
import { TabOverview } from "@/components/profile/tab-overview"
import { TabPBs } from "@/components/profile/tab-pbs"
import { TabStats } from "@/components/profile/tab-stats"
import { TabCubes } from "@/components/profile/tab-cubes"
import { TabOfficial } from "@/components/profile/tab-official"
import { FollowButton } from "@/components/profile/follow-button"
import type { Profile, Session, UserBadge, Badge, PBRecord } from "@/lib/types"
import type { UserSorKinchStats } from "@/lib/actions/sor-kinch"

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
  pbs = [],
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
  pbs?: PBRecord[]
  sorKinchStats?: UserSorKinchStats | null
}) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    parseTabParam(searchParams.get("tab"))
  )

  const followButton =
    !isOwner && isLoggedIn ? (
      <FollowButton
        targetUserId={profile.id}
        initialIsFollowing={isFollowing}
      />
    ) : undefined

  const totalPracticeMinutes = sessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main content — tabs + active tab */}
      <div className="min-w-0">
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === "overview" && (
            <TabOverview
              profile={profile}
              sessions={sessions}
              isOwner={isOwner}
              isAdmin={isAdmin}
              userBadges={userBadges}
              allBadges={allBadges}
              followerCount={followerCount}
              followingCount={followingCount}
              followButton={followButton}
            />
          )}
          {activeTab === "pbs" && (
            <TabPBs
              profile={profile}
              sessions={sessions}
              pbs={pbs}
              isOwner={isOwner}
            />
          )}
          {activeTab === "stats" && (
            <TabStats sessions={sessions} isOwner={isOwner} />
          )}
          {activeTab === "cubes" && (
            <TabCubes cubes={profile.cubes ?? []} cubeHistory={profile.cube_history ?? []} isOwner={isOwner} />
          )}
          {activeTab === "official" && (
            <TabOfficial
              profile={profile}
              isOwner={isOwner}
              sorKinchStats={sorKinchStats}
            />
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      <ProfileSidebar
        profile={profile}
        isOwner={isOwner}
        followerCount={followerCount}
        followingCount={followingCount}
        totalPracticeMinutes={totalPracticeMinutes}
        followButton={followButton}
      />
    </div>
  )
}
