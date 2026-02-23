"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileStats } from "@/components/profile/profile-stats"
import { MainCubes } from "@/components/profile/main-cubes"
import { PBGrid } from "@/components/profile/pb-grid"
import { LinksSponsors } from "@/components/profile/links-sponsors"
import { RecentActivity } from "@/components/profile/recent-activity"
import { WcaResults } from "@/components/profile/wca-results"
import { WcaLink } from "@/components/profile/wca-link"
import type { Profile, Session } from "@/lib/types"
import type { WcaPersonResult } from "@/lib/actions/wca"

export function ProfileContent({
  profile,
  sessions,
  wcaData,
}: {
  profile: Profile
  sessions: Session[]
  wcaData: WcaPersonResult | null
}) {
  const router = useRouter()
  const [wcaId, setWcaId] = useState(profile.wca_id)

  function handleWcaUpdate(newWcaId: string | null) {
    setWcaId(newWcaId)
    // Refresh the page to re-fetch WCA data from the server
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ProfileHeader profile={profile} />
      <ProfileStats sessions={sessions} />
      <WcaLink currentWcaId={wcaId} onUpdate={handleWcaUpdate} />
      {wcaData && (
        <WcaResults
          personalRecords={wcaData.personal_records}
          competitionCount={wcaData.competition_count}
        />
      )}
      <MainCubes />
      <PBGrid sessions={sessions} />
      <LinksSponsors />
      <RecentActivity sessions={sessions.slice(0, 10)} />
    </div>
  )
}
