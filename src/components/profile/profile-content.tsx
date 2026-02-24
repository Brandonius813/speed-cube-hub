"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { WcaLink } from "@/components/profile/wca-link"
import { PracticeHeatmap } from "@/components/dashboard/practice-heatmap"
import { getWcaResults } from "@/lib/actions/wca"
import type { Profile, Session } from "@/lib/types"
import type { WcaPersonResult } from "@/lib/actions/wca"

const WCA_ERROR_MESSAGES: Record<string, string> = {
  denied: "WCA authorization was cancelled.",
  token_failed: "Failed to connect to WCA. Please try again.",
  fetch_failed: "Could not retrieve your WCA profile. Please try again.",
  no_wca_id: "Your WCA account doesn't have a WCA ID linked yet.",
  save_failed: "Failed to save your WCA ID. Please try again.",
  unknown: "Something went wrong. Please try again.",
}

export function ProfileContent({
  profile,
  sessions,
  followerCount,
  followingCount,
}: {
  profile: Profile
  sessions: Session[]
  followerCount?: number
  followingCount?: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [wcaId, setWcaId] = useState(profile.wca_id)
  const [wcaData, setWcaData] = useState<WcaPersonResult | null>(null)
  const [wcaLoading, setWcaLoading] = useState(!!profile.wca_id)
  const [wcaMessage, setWcaMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Fetch WCA data client-side so it doesn't block page load
  useEffect(() => {
    if (!wcaId) {
      setWcaData(null)
      setWcaLoading(false)
      return
    }

    setWcaLoading(true)
    getWcaResults(wcaId).then((result) => {
      setWcaData(result.data ?? null)
      setWcaLoading(false)
    })
  }, [wcaId])

  // Handle OAuth callback query params
  useEffect(() => {
    const wcaLinked = searchParams.get("wca_linked")
    const wcaError = searchParams.get("wca_error")

    if (wcaLinked === "true") {
      setWcaMessage({ type: "success", text: "WCA account linked successfully!" })
      // Clean up the URL
      router.replace("/profile", { scroll: false })
    } else if (wcaError) {
      setWcaMessage({
        type: "error",
        text: WCA_ERROR_MESSAGES[wcaError] || WCA_ERROR_MESSAGES.unknown,
      })
      router.replace("/profile", { scroll: false })
    }
  }, [searchParams, router])

  function handleWcaUpdate(newWcaId: string | null) {
    setWcaId(newWcaId)
    setWcaMessage(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ProfileHeader
        profile={profile}
        isOwner
        followerCount={followerCount}
        followingCount={followingCount}
      />
      <ProfileStats sessions={sessions} />

      {wcaMessage && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            wcaMessage.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {wcaMessage.text}
        </div>
      )}

      <WcaLink currentWcaId={wcaId} onUpdate={handleWcaUpdate} />
      {wcaLoading && <WcaResultsSkeleton />}
      {wcaData && (
        <WcaResults
          personalRecords={wcaData.personal_records}
          competitionCount={wcaData.competition_count}
          wcaId={wcaId}
        />
      )}
      <PBGrid sessions={sessions} displayName={profile.display_name} handle={profile.handle} />
      <PBProgressChart sessions={sessions} />
      <YtdStats sessions={sessions} />
      <MainCubes cubes={profile.cubes ?? []} isOwner />
      <Accomplishments accomplishments={profile.accomplishments ?? []} isOwner />
      <LinksSponsors links={profile.links} isOwner />
      <PracticeHeatmap sessions={sessions} />
      <RecentActivity sessions={sessions.slice(0, 10)} />
    </div>
  )
}
