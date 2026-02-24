import { ProfileContent } from "@/components/profile/profile-content"
import { getProfile } from "@/lib/actions/profiles"
import { getSessions } from "@/lib/actions/sessions"
import { getFollowCounts } from "@/lib/actions/follows"
import { getUserBadges, getBadgeDefinitions } from "@/lib/actions/badges"

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

  // Fetch follow counts, badges, and badge definitions in parallel
  const [followCounts, badgesResult, badgeDefsResult] = await Promise.all([
    getFollowCounts(profileResult.profile.id),
    getUserBadges(profileResult.profile.id),
    getBadgeDefinitions(),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <ProfileContent
        profile={profileResult.profile}
        sessions={sessionsResult.data}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
        userBadges={badgesResult.data}
        allBadges={badgeDefsResult.data}
      />
    </main>
  )
}
