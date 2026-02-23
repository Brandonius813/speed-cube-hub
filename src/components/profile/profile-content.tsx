"use client"

import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileStats } from "@/components/profile/profile-stats"
import { MainCubes } from "@/components/profile/main-cubes"
import { PBGrid } from "@/components/profile/pb-grid"
import { LinksSponsors } from "@/components/profile/links-sponsors"
import { RecentActivity } from "@/components/profile/recent-activity"
import type { Profile, Session } from "@/lib/types"

export function ProfileContent({
  profile,
  sessions,
}: {
  profile: Profile
  sessions: Session[]
}) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ProfileHeader profile={profile} />
      <ProfileStats sessions={sessions} />
      <MainCubes />
      <PBGrid sessions={sessions} />
      <LinksSponsors />
      <RecentActivity sessions={sessions} />
    </div>
  )
}
