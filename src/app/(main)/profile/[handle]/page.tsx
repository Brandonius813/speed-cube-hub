import { notFound } from "next/navigation"
import { PublicProfileContent } from "@/components/profile/public-profile-content"
import { getProfileByHandle } from "@/lib/actions/profiles"
import { getSessionsByUserId } from "@/lib/actions/sessions"
import { getWcaResults } from "@/lib/actions/wca"
import { getFollowCounts, isFollowing } from "@/lib/actions/follows"
import { createClient } from "@/lib/supabase/server"

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  const { profile } = await getProfileByHandle(handle)

  if (!profile) {
    notFound()
  }

  // Check if the visitor is the profile owner
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  // Fetch all data in parallel
  const [sessionsResult, wcaResult, followCounts, viewerIsFollowing] =
    await Promise.all([
      getSessionsByUserId(profile.id),
      profile.wca_id ? getWcaResults(profile.wca_id) : Promise.resolve(null),
      getFollowCounts(profile.id),
      user && !isOwner ? isFollowing(profile.id) : Promise.resolve(false),
    ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <PublicProfileContent
        profile={profile}
        sessions={sessionsResult.data}
        wcaData={wcaResult?.data ?? null}
        isOwner={isOwner}
        isLoggedIn={!!user}
        isFollowing={viewerIsFollowing}
        followerCount={followCounts.followers}
        followingCount={followCounts.following}
      />
    </main>
  )
}
