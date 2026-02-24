import { ProfileContent } from "@/components/profile/profile-content"
import { getProfile } from "@/lib/actions/profiles"
import { getSessions } from "@/lib/actions/sessions"
import { getWcaResults } from "@/lib/actions/wca"
import { getFollowCounts } from "@/lib/actions/follows"

export default async function ProfilePage() {
  const [profileResult, sessionsResult] = await Promise.all([
    getProfile(),
    getSessions(),
  ])

  if (!profileResult.profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-muted-foreground">
          Profile not found. Please log in to view your profile.
        </p>
      </main>
    )
  }

  // Fetch WCA results and follow counts in parallel
  const [wcaResult, followCounts] = await Promise.all([
    profileResult.profile.wca_id
      ? getWcaResults(profileResult.profile.wca_id)
      : Promise.resolve(null),
    getFollowCounts(profileResult.profile.id),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <ProfileContent
        profile={profileResult.profile}
        sessions={sessionsResult.data}
        wcaData={wcaResult?.data ?? null}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
      />
    </main>
  )
}
