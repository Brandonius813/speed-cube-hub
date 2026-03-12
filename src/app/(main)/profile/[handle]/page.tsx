import { Suspense } from "react"
import { notFound } from "next/navigation"
import { PublicProfileContent } from "@/components/profile/public-profile-content"
import { getProfileByHandle } from "@/lib/actions/profiles"
import {
  getSessionsByUserId,
  getTotalPracticeMinutesByUserId,
} from "@/lib/actions/sessions"
import { getFollowCounts, isFollowing } from "@/lib/actions/follows"
import { getUserSorKinchStats } from "@/lib/actions/sor-kinch"
import { getPBsByUserId } from "@/lib/actions/personal-bests"
import { createClient } from "@/lib/supabase/server"
import {
  parseTabParam,
  profileTabNeedsOfficialData,
  profileTabNeedsPbs,
  profileTabNeedsSessions,
} from "@/lib/profile-tabs"

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  const { handle } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const activeTab = parseTabParam(resolvedSearchParams.tab)
  const needsSessions = profileTabNeedsSessions(activeTab)
  const needsPbs = profileTabNeedsPbs(activeTab)
  const needsOfficialData = profileTabNeedsOfficialData(activeTab)

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
  const [sessionsResult, totalMinutesResult, followCounts, viewerIsFollowing, pbsResult, sorKinchStats] =
    await Promise.all([
      needsSessions
        ? getSessionsByUserId(profile.id)
        : Promise.resolve({ data: [] }),
      needsSessions
        ? Promise.resolve({ totalMinutes: 0 })
        : getTotalPracticeMinutesByUserId(profile.id),
      getFollowCounts(profile.id),
      user && !isOwner ? isFollowing(profile.id) : Promise.resolve(false),
      needsPbs ? getPBsByUserId(profile.id) : Promise.resolve({ data: [] }),
      needsOfficialData && profile.wca_id
        ? getUserSorKinchStats(profile.wca_id)
        : Promise.resolve(null),
    ])

  const totalPracticeMinutes = needsSessions
    ? sessionsResult.data.reduce((sum, session) => sum + session.duration_minutes, 0)
    : totalMinutesResult.totalMinutes

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense>
        <PublicProfileContent
          profile={profile}
          sessions={sessionsResult.data}
          isOwner={isOwner}
          isLoggedIn={!!user}
          isFollowing={viewerIsFollowing}
          followerCount={followCounts.followers}
          followingCount={followCounts.following}
          pbs={pbsResult.data}
          isAdmin={user?.id === process.env.ADMIN_USER_ID}
          sorKinchStats={sorKinchStats}
          totalPracticeMinutes={totalPracticeMinutes}
          profileAdSlot={process.env.NEXT_PUBLIC_ADSENSE_PROFILE_SIDEBAR_SLOT ?? null}
        />
      </Suspense>
    </main>
  )
}
