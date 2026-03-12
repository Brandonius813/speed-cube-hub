"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import {
  dismissOnboardingAutoLaunch,
  markOnboardingStepComplete,
  replayOnboarding,
} from "@/lib/actions/onboarding"
import {
  ONBOARDING_TOURS,
  parseOnboardingTour,
  shouldAutoLaunchOverviewTour,
} from "@/lib/onboarding"
import type { Profile, Session, PBRecord, UserOnboarding } from "@/lib/types"
import type { UserSorKinchStats } from "@/lib/actions/sor-kinch"
import { parseTabParam } from "@/lib/profile-tabs"

const EditProfileModal = dynamic(
  () =>
    import("@/components/profile/edit-profile-modal").then(
      (module) => module.EditProfileModal
    ),
  { loading: () => null }
)

const TabOverview = dynamic(
  () =>
    import("@/components/profile/tab-overview").then(
      (module) => module.TabOverview
    ),
  { loading: () => <ProfileTabLoading /> }
)

const TabPBs = dynamic(
  () =>
    import("@/components/profile/tab-pbs").then((module) => module.TabPBs),
  { loading: () => <ProfileTabLoading /> }
)

const TabStats = dynamic(
  () =>
    import("@/components/profile/tab-stats").then((module) => module.TabStats),
  { loading: () => <ProfileTabLoading /> }
)

const TabCubes = dynamic(
  () =>
    import("@/components/profile/tab-cubes").then((module) => module.TabCubes),
  { loading: () => <ProfileTabLoading /> }
)

const TabOfficial = dynamic(
  () =>
    import("@/components/profile/tab-official").then(
      (module) => module.TabOfficial
    ),
  { loading: () => <ProfileTabLoading /> }
)

const WCA_ERROR_MESSAGES: Record<string, string> = {
  denied: "WCA authorization was cancelled.",
  token_failed: "Failed to connect to WCA. Please try again.",
  fetch_failed: "Could not retrieve your WCA profile. Please try again.",
  no_wca_id: "Your WCA account doesn't have a WCA ID linked yet.",
  save_failed: "Failed to save your WCA ID. Please try again.",
  unknown: "Something went wrong. Please try again.",
}

function getInitialWcaMessage(searchParams: { get(name: string): string | null }): {
  type: "success" | "error"
  text: string
} | null {
  if (searchParams.get("wca_linked") === "true") {
    return { type: "success", text: "WCA account linked successfully!" }
  }

  const wcaError = searchParams.get("wca_error")
  if (!wcaError) {
    return null
  }

  return {
    type: "error",
    text: WCA_ERROR_MESSAGES[wcaError] || WCA_ERROR_MESSAGES.unknown,
  }
}

function ProfileTabLoading() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-10 text-center text-sm text-muted-foreground">
      Loading tab...
    </div>
  )
}

export function ProfileContent({
  profile,
  sessions,
  followerCount = 0,
  followingCount = 0,
  pbs = [],
  sorKinchStats,
  onboarding,
  totalPracticeMinutes = 0,
}: {
  profile: Profile
  sessions: Session[]
  followerCount?: number
  followingCount?: number
  pbs?: PBRecord[]
  sorKinchStats?: UserSorKinchStats | null
  onboarding?: UserOnboarding | null
  totalPracticeMinutes?: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = parseTabParam(searchParams.get("tab"))
  const activeTour = parseOnboardingTour(searchParams.get("tour"))
  const [editOpen, setEditOpen] = useState(false)
  const [pendingOnboarding, setPendingOnboarding] = useState<UserOnboarding | null>(null)
  const [autoOverviewTourOpen, setAutoOverviewTourOpen] = useState(
    activeTab === "overview" &&
      activeTour === null &&
      shouldAutoLaunchOverviewTour(onboarding ?? null)
  )
  const [profileMainEvents, setProfileMainEvents] = useState<string[]>(
    profile.main_events ?? []
  )
  const [wcaMessage] = useState(() => getInitialWcaMessage(searchParams))
  const localOnboarding = useMemo(() => {
    if (!pendingOnboarding) {
      return onboarding ?? null
    }

    if (!onboarding) {
      return pendingOnboarding
    }

    return new Date(pendingOnboarding.updated_at).getTime() >=
      new Date(onboarding.updated_at).getTime()
      ? pendingOnboarding
      : onboarding
  }, [onboarding, pendingOnboarding])
  const autoLaunchOverviewTour = activeTour === null && autoOverviewTourOpen
  const profileTourId =
    activeTour === "overview" || activeTour === "main-cube"
      ? activeTour
      : autoLaunchOverviewTour
      ? "overview"
      : null
  const profileTourSteps = useMemo(
    () => (profileTourId ? ONBOARDING_TOURS[profileTourId] : []),
    [profileTourId]
  )

  // Handle WCA OAuth callback query params
  useEffect(() => {
    const wcaLinked = searchParams.get("wca_linked")
    const wcaErr = searchParams.get("wca_error")

    if (wcaLinked === "true") {
      router.replace("/profile", { scroll: false })
    } else if (wcaErr) {
      router.replace("/profile", { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (activeTab !== "overview" || !localOnboarding || localOnboarding.profile_viewed_at) {
      return
    }

    void markOnboardingStepComplete("profile_viewed").then((result) => {
      if (result.success && result.onboarding) {
        setPendingOnboarding(result.onboarding)
      }
    })
  }, [activeTab, localOnboarding])

  function clearTourParam() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tour")
    const query = params.toString()
    setAutoOverviewTourOpen(false)
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  async function handleOverviewReplay() {
    const result = await replayOnboarding()
    if (result.success && result.onboarding) {
      setPendingOnboarding(result.onboarding)
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("tour", "overview")
    params.delete("tab")
    router.push(`${pathname}?${params.toString()}`)
  }

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
          <ProfileTabs activeTab={activeTab} />

          <div className="mt-6">
            {activeTab === "overview" && (
              <TabOverview
                profile={profile}
                sessions={sessions}
                isOwner
                followerCount={followerCount}
                followingCount={followingCount}
                onboarding={localOnboarding}
                onReplayOnboarding={handleOverviewReplay}
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

      {profileTourId && (
        <OnboardingTour
          key={profileTourId}
          open
          steps={profileTourSteps}
          onClose={clearTourParam}
          onSkip={() => {
            if (autoLaunchOverviewTour) {
              void dismissOnboardingAutoLaunch().then((result) => {
                if (result.success && result.onboarding) {
                  setPendingOnboarding(result.onboarding)
                }
                clearTourParam()
              })
              return
            }
            clearTourParam()
          }}
        />
      )}
    </>
  )
}
