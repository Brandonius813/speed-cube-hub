import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { ProfileContent } from "@/components/profile/profile-content"
import { getProfile } from "@/lib/actions/profiles"
import { getSessions } from "@/lib/actions/sessions"
import { getWcaResults } from "@/lib/actions/wca"
import { getFollowCounts } from "@/lib/actions/follows"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const [profileResult, sessionsResult] = await Promise.all([
    getProfile(),
    getSessions(),
  ])

  if (!profileResult.profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-muted-foreground">
            Profile not found. Please log in to view your profile.
          </p>
        </main>
        <Footer />
      </div>
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <ProfileContent
          profile={profileResult.profile}
          sessions={sessionsResult.data}
          wcaData={wcaResult?.data ?? null}
          followerCount={followCounts.followers}
          followingCount={followCounts.following}
        />
      </main>
      <Footer />
    </div>
  )
}
