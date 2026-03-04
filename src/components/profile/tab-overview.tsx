"use client"

import { useMemo } from "react"
import { ProfileHeader } from "@/components/profile/profile-header"
import { PracticeStreak } from "@/components/dashboard/practice-streak"
import { RecentActivity } from "@/components/profile/recent-activity"
import { computeSessionStats } from "@/lib/utils"
import type { Profile, Session } from "@/lib/types"

export function TabOverview({
  profile,
  sessions,
  isOwner,
  followerCount = 0,
  followingCount = 0,
  followButton,
}: {
  profile: Profile
  sessions: Session[]
  isOwner: boolean
  followerCount?: number
  followingCount?: number
  followButton?: React.ReactNode
}) {
  const stats = useMemo(() => computeSessionStats(sessions), [sessions])

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

      <PracticeStreak
        sessions={sessions}
        currentStreak={stats.currentStreak}
        longestStreak={stats.longestStreak}
      />

      <RecentActivity sessions={sessions.slice(0, 10)} isOwner={isOwner} />
    </div>
  )
}
