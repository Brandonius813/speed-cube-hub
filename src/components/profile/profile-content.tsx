"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  wcaData,
}: {
  profile: Profile
  sessions: Session[]
  wcaData: WcaPersonResult | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [wcaId, setWcaId] = useState(profile.wca_id)
  const [wcaMessage, setWcaMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

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
      <ProfileHeader profile={profile} isOwner />
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
