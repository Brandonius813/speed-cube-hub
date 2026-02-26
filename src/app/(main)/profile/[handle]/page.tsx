import { notFound } from "next/navigation"
import { PublicProfileContent } from "@/components/profile/public-profile-content"
import { getProfileByHandle } from "@/lib/actions/profiles"
import { getSessionsByUserId } from "@/lib/actions/sessions"
import { getFollowCounts, isFollowing } from "@/lib/actions/follows"
import { getUserBadges, getBadgeDefinitions } from "@/lib/actions/badges"
import { getUserSorKinchStats } from "@/lib/actions/sor-kinch"
import { getPBsByUserId } from "@/lib/actions/personal-bests"
import { createClient } from "@/lib/supabase/server"

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  // Run profile lookup and auth check in parallel — they don't depend on each other
  const [{ profile }, supabase] = await Promise.all([
    getProfileByHandle(handle),
    createClient(),
  ])

  if (!profile) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  // Fetch remaining data in parallel (WCA is now fetched client-side)
  const [sessionsResult, followCounts, viewerIsFollowing, badgesResult, badgeDefsResult, pbsResult, sorKinchStats] =
    await Promise.all([
      getSessionsByUserId(profile.id),
      getFollowCounts(profile.id),
      user && !isOwner ? isFollowing(profile.id) : Promise.resolve(false),
      getUserBadges(profile.id),
      isOwner ? getBadgeDefinitions() : Promise.resolve({ data: [] }),
      getPBsByUserId(profile.id),
      profile.wca_id
        ? getUserSorKinchStats(profile.wca_id)
        : Promise.resolve(null),
    ])

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PublicProfileContent
        profile={profile}
        sessions={sessionsResult.data}
        isOwner={isOwner}
        isLoggedIn={!!user}
        isFollowing={viewerIsFollowing}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
        userBadges={badgesResult.data}
        allBadges={badgeDefsResult.data}
        pbs={pbsResult.data}
        isAdmin={user?.id === process.env.ADMIN_USER_ID}
        sorKinchStats={sorKinchStats}
      />
    </main>
  )
}
