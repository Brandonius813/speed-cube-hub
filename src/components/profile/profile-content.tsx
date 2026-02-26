"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { ProfileTabs, parseTabParam } from "@/components/profile/profile-tabs"
import type { ProfileTab } from "@/components/profile/profile-tabs"
import { TabOverview } from "@/components/profile/tab-overview"
import { TabPBs } from "@/components/profile/tab-pbs"
import { TabStats } from "@/components/profile/tab-stats"
import { TabCubes } from "@/components/profile/tab-cubes"
import { TabOfficial } from "@/components/profile/tab-official"
import type { Profile, Session, UserBadge, Badge, PBRecord } from "@/lib/types"
import type { UserSorKinchStats } from "@/lib/actions/sor-kinch"

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
  followerCount = 0,
  followingCount = 0,
  userBadges = [],
  allBadges = [],
  pbs = [],
  sorKinchStats,
}: {
  profile: Profile
  sessions: Session[]
  followerCount?: number
  followingCount?: number
  userBadges?: UserBadge[]
  allBadges?: Badge[]
  pbs?: PBRecord[]
  sorKinchStats?: UserSorKinchStats | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    parseTabParam(searchParams.get("tab"))
  )
  const [editOpen, setEditOpen] = useState(false)
  const [profileMainEvents, setProfileMainEvents] = useState<string[]>(
    profile.main_events ?? []
  )
  const [wcaMessage, setWcaMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Handle WCA OAuth callback query params
  useEffect(() => {
    const wcaLinked = searchParams.get("wca_linked")
    const wcaErr = searchParams.get("wca_error")

    if (wcaLinked === "true") {
      setWcaMessage({ type: "success", text: "WCA account linked successfully!" })
      router.replace("/profile", { scroll: false })
    } else if (wcaErr) {
      setWcaMessage({
        type: "error",
        text: WCA_ERROR_MESSAGES[wcaErr] || WCA_ERROR_MESSAGES.unknown,
      })
      router.replace("/profile", { scroll: false })
    }
  }, [searchParams, router])

  const totalPracticeMinutes = sessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  )

  return (
    <>
      {wcaMessage && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            wcaMessage.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {wcaMessage.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content — tabs + active tab */}
        <div className="min-w-0">
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="mt-6">
            {activeTab === "overview" && (
              <TabOverview
                profile={profile}
                sessions={sessions}
                isOwner
                userBadges={userBadges}
                allBadges={allBadges}
                followerCount={followerCount}
                followingCount={followingCount}
              />
            )}
            {activeTab === "pbs" && (
              <TabPBs
                profile={profile}
                sessions={sessions}
                pbs={pbs}
                isOwner
                onMainEventsChange={setProfileMainEvents}
              />
            )}
            {activeTab === "stats" && (
              <TabStats sessions={sessions} isOwner />
            )}
            {activeTab === "cubes" && (
              <TabCubes cubes={profile.cubes ?? []} cubeHistory={profile.cube_history ?? []} isOwner />
            )}
            {activeTab === "official" && (
              <TabOfficial
                profile={profile}
                isOwner
                sorKinchStats={sorKinchStats}
                onWcaUpdate={() => router.refresh()}
                mainEventsOverride={profileMainEvents}
              />
            )}
          </div>
        </div>

        {/* Desktop sidebar */}
        <ProfileSidebar
          profile={profile}
          isOwner
          followerCount={followerCount}
          followingCount={followingCount}
          totalPracticeMinutes={totalPracticeMinutes}
          onEditProfile={() => setEditOpen(true)}
        />
      </div>

      <EditProfileModal
        profile={profile}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
