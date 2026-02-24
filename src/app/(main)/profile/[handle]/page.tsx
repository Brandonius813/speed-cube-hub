import { notFound } from "next/navigation"
import { PublicProfileContent } from "@/components/profile/public-profile-content"
import { getProfileByHandle } from "@/lib/actions/profiles"
import { getSessionsByUserId } from "@/lib/actions/sessions"
import { getFollowCounts, isFollowing } from "@/lib/actions/follows"
import { getUserBadges, getBadgeDefinitions } from "@/lib/actions/badges"
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
  const [sessionsResult, followCounts, viewerIsFollowing, badgesResult, badgeDefsResult] =
    await Promise.all([
      getSessionsByUserId(profile.id),
      getFollowCounts(profile.id),
      user && !isOwner ? isFollowing(profile.id) : Promise.resolve(false),
      getUserBadges(profile.id),
      isOwner ? getBadgeDefinitions() : Promise.resolve({ data: [] }),
    ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
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
        isAdmin={user?.id === process.env.ADMIN_USER_ID}
      />
    </main>
  )
}
