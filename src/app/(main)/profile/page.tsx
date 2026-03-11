import { Suspense } from "react"
import { ProfileContent } from "@/components/profile/profile-content"
import { getProfile } from "@/lib/actions/profiles"
import { getSessions } from "@/lib/actions/sessions"
import { getFollowCounts } from "@/lib/actions/follows"
import { getUserSorKinchStats } from "@/lib/actions/sor-kinch"
import { getCurrentPBs } from "@/lib/actions/personal-bests"
import { getUserOnboarding } from "@/lib/actions/onboarding"

export default async function ProfilePage() {
  const [profileResult, sessionsResult, onboarding] = await Promise.all([
    getProfile(),
    getSessions(),
    getUserOnboarding(),
  ])

  if (!profileResult.profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-muted-foreground">
          Profile not found. Please log in to view your profile.
        </p>
      </main>
    )
  }

  // Fetch follow counts, PBs, and SOR/Kinch in parallel
  const [followCounts, pbsResult, sorKinchStats] =
    await Promise.all([
      getFollowCounts(profileResult.profile.id),
      getCurrentPBs(),
      profileResult.profile.wca_id
        ? getUserSorKinchStats(profileResult.profile.wca_id)
        : Promise.resolve(null),
    ])

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
        />
      </Suspense>
    </main>
  )
}
