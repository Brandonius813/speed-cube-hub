"use client"

import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { CompareProfileButton } from "@/components/profile/compare-profile-button"
import { FollowButton } from "@/components/profile/follow-button"
import type { Profile, Session, PBRecord } from "@/lib/types"
import type { UserSorKinchStats } from "@/lib/actions/sor-kinch"
import { parseTabParam } from "@/lib/profile-tabs"

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

function ProfileTabLoading() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-10 text-center text-sm text-muted-foreground">
      Loading tab...
    </div>
  )
}

export function PublicProfileContent({
  profile,
  sessions,
  isOwner,
  isLoggedIn,
  isFollowing,
  followerCount,
  followingCount,
  isAdmin = false,
  pbs = [],
  sorKinchStats,
  totalPracticeMinutes = 0,
}: {
  profile: Profile
  sessions: Session[]
  isOwner: boolean
  isLoggedIn: boolean
  isFollowing: boolean
  followerCount: number
  followingCount: number
  isAdmin?: boolean
  pbs?: PBRecord[]
  sorKinchStats?: UserSorKinchStats | null
  totalPracticeMinutes?: number
}) {
  void isAdmin
  const searchParams = useSearchParams()
  const activeTab = parseTabParam(searchParams.get("tab"))

  const profileActions =
    !isOwner && isLoggedIn ? (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:w-full lg:flex-col">
        <div className="flex-1 [&>*]:w-full">
          <FollowButton
            targetUserId={profile.id}
            initialIsFollowing={isFollowing}
          />
        </div>
        <div className="flex-1 [&>*]:w-full">
          <CompareProfileButton handle={profile.handle} />
        </div>
      </div>
    ) : undefined

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main content — tabs + active tab */}
      <div className="min-w-0">
        <ProfileTabs activeTab={activeTab} />

        <div className="mt-6">
          {activeTab === "overview" && (
            <TabOverview
              profile={profile}
              sessions={sessions}
              isOwner={isOwner}
              followerCount={followerCount}
              followingCount={followingCount}
              followButton={profileActions}
            />
          )}
          {activeTab === "pbs" && (
            <TabPBs
              profile={profile}
              sessions={sessions}
              pbs={pbs}
              isOwner={isOwner}
            />
          )}
          {activeTab === "stats" && (
            <TabStats sessions={sessions} isOwner={isOwner} />
          )}
          {activeTab === "cubes" && (
            <TabCubes cubes={profile.cubes ?? []} cubeHistory={profile.cube_history ?? []} isOwner={isOwner} />
          )}
          {activeTab === "official" && (
            <TabOfficial
              profile={profile}
              isOwner={isOwner}
              sorKinchStats={sorKinchStats}
            />
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      <ProfileSidebar
        profile={profile}
        isOwner={isOwner}
        followerCount={followerCount}
        followingCount={followingCount}
        totalPracticeMinutes={totalPracticeMinutes}
        followButton={profileActions}
      />
    </div>
  )
}
