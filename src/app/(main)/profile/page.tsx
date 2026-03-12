import { Suspense } from "react"
import { ProfileContent } from "@/components/profile/profile-content"
import { getProfile } from "@/lib/actions/profiles"
import { getSessions, getTotalPracticeMinutes } from "@/lib/actions/sessions"
import { getFollowCounts } from "@/lib/actions/follows"
import { getUserSorKinchStats } from "@/lib/actions/sor-kinch"
import { getCurrentPBs } from "@/lib/actions/personal-bests"
import { getUserOnboarding } from "@/lib/actions/onboarding"
import {
  parseTabParam,
  profileTabNeedsOfficialData,
  profileTabNeedsOnboarding,
  profileTabNeedsPbs,
  profileTabNeedsSessions,
} from "@/lib/profile-tabs"

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const params = (await searchParams) ?? {}
  const activeTab = parseTabParam(params.tab)
  const needsSessions = profileTabNeedsSessions(activeTab)
  const needsPbs = profileTabNeedsPbs(activeTab)
  const needsOfficialData = profileTabNeedsOfficialData(activeTab)
  const needsOnboarding = profileTabNeedsOnboarding(activeTab)

  const profileResult = await getProfile()

  if (!profileResult.profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-muted-foreground">
          Profile not found. Please log in to view your profile.
        </p>
      </main>
    )
  }

  const [followCounts, sessionsResult, totalMinutesResult, pbsResult, sorKinchStats, onboarding] =
    await Promise.all([
      getFollowCounts(profileResult.profile.id),
      needsSessions ? getSessions() : Promise.resolve({ data: [] }),
      needsSessions
        ? Promise.resolve({ totalMinutes: 0 })
        : getTotalPracticeMinutes(),
      needsPbs ? getCurrentPBs() : Promise.resolve({ data: [] }),
      needsOfficialData && profileResult.profile.wca_id
        ? getUserSorKinchStats(profileResult.profile.wca_id)
        : Promise.resolve(null),
      needsOnboarding ? getUserOnboarding() : Promise.resolve(null),
    ])

  const totalPracticeMinutes = needsSessions
    ? sessionsResult.data.reduce((sum, session) => sum + session.duration_minutes, 0)
    : totalMinutesResult.totalMinutes

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense>
        <ProfileContent
          profile={profileResult.profile}
          sessions={sessionsResult.data}
          followerCount={followCounts.followers}
          followingCount={followCounts.following}
          pbs={pbsResult.data}
          sorKinchStats={sorKinchStats}
          onboarding={onboarding}
          totalPracticeMinutes={totalPracticeMinutes}
        />
      </Suspense>
    </main>
  )
}
