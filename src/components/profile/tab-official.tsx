"use client"

import { useState, useEffect } from "react"
import { WcaResults } from "@/components/profile/wca-results"
import { WcaResultsSkeleton } from "@/components/profile/wca-results-skeleton"
import { WcaLink } from "@/components/profile/wca-link"
import { AllroundingResults } from "@/components/profile/allrounding-results"
import { Accomplishments } from "@/components/profile/accomplishments"
import { getWcaResults } from "@/lib/actions/wca"
import type { Profile, ProfileAccomplishment } from "@/lib/types"
import type { WcaPersonResult } from "@/lib/actions/wca"
import type { UserSorKinchStats } from "@/lib/actions/sor-kinch"

export function TabOfficial({
  profile,
  isOwner,
  sorKinchStats,
  onWcaUpdate,
  mainEventsOverride,
}: {
  profile: Profile
  isOwner: boolean
  sorKinchStats?: UserSorKinchStats | null
  onWcaUpdate?: (newWcaId: string | null) => void
  mainEventsOverride?: string[]
}) {
  const [wcaId, setWcaId] = useState(profile.wca_id)
  const [wcaData, setWcaData] = useState<WcaPersonResult | null>(null)
  const [wcaLoading, setWcaLoading] = useState(!!profile.wca_id)
  const [wcaError, setWcaError] = useState(false)

  useEffect(() => {
    if (!wcaId) {
      setWcaData(null)
      setWcaLoading(false)
      return
    }

    setWcaLoading(true)
    setWcaError(false)
    getWcaResults(wcaId)
      .then((result) => {
        setWcaData(result.data ?? null)
        setWcaLoading(false)
      })
      .catch(() => {
        setWcaLoading(false)
        setWcaError(true)
      })
  }, [wcaId])

  function handleWcaUpdate(newWcaId: string | null) {
    setWcaId(newWcaId)
    onWcaUpdate?.(newWcaId)
  }

  return (
    <div className="flex flex-col gap-6">
      {isOwner && <WcaLink currentWcaId={wcaId} onUpdate={handleWcaUpdate} />}

      {wcaLoading && <WcaResultsSkeleton />}
      {wcaError && !wcaLoading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load WCA results. Please try refreshing the page.
        </div>
      )}
      {wcaData && (
        <WcaResults
          personalRecords={wcaData.personal_records}
          competitionCount={wcaData.competition_count}
          wcaId={wcaId}
          mainEvents={mainEventsOverride ?? profile.main_events ?? []}
        />
      )}

      {sorKinchStats && <AllroundingResults stats={sorKinchStats} />}

      <Accomplishments
        accomplishments={profile.accomplishments ?? []}
        isOwner={isOwner}
      />
    </div>
  )
}
