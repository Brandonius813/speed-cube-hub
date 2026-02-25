"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getLeaderboard,
  getUserLeaderboardPosition,
} from "@/lib/actions/leaderboards"
import type {
  LeaderboardCategory,
  LeaderboardPage,
} from "@/lib/actions/leaderboards"
import {
  getSorKinchLeaderboard,
  findUserInSorKinch,
} from "@/lib/actions/sor-kinch"
import type {
  SorKinchType,
  WcaLeaderboardEntry,
  WcaLeaderboardPage,
  WcaCountry,
} from "@/lib/actions/sor-kinch"
import type { LeaderboardEntry } from "@/lib/types"
import { getSupabaseClient } from "@/lib/supabase/client"
import {
  PracticeLeaderboardTable,
  PracticeLeaderboardCard,
  WcaLeaderboardTable,
  WcaLeaderboardCard,
} from "@/components/leaderboards/leaderboard-shared"
import type { RegionSelection } from "@/components/leaderboards/region-filter"
import {
  LeaderboardControls,
  ALL_CATEGORIES,
} from "@/components/leaderboards/leaderboard-controls"

const STORAGE_KEY = "leaderboard-prefs"
const DEFAULT_REGION: RegionSelection = { level: "world", label: "World" }

function isWcaCategory(cat: LeaderboardCategory) {
  return cat === "sor" || cat === "kinch"
}

function loadPrefs(): { category: LeaderboardCategory; friendsOnly: boolean } {
  if (typeof window === "undefined") return { category: "most_solves", friendsOnly: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (ALL_CATEGORIES.some((c) => c.id === parsed.category)) {
        return { category: parsed.category, friendsOnly: !!parsed.friendsOnly }
      }
    }
  } catch { /* ignore */ }
  return { category: "most_solves", friendsOnly: false }
}

function savePrefs(category: LeaderboardCategory, friendsOnly: boolean) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ category, friendsOnly })) }
  catch { /* ignore */ }
}

export function LeaderboardsContent({
  initialData,
  initialWcaData = {},
  countries = [],
  userWcaId,
}: {
  initialData: Record<string, LeaderboardPage>
  initialWcaData?: Record<string, WcaLeaderboardPage>
  countries?: WcaCountry[]
  userWcaId?: string | null
}) {
  // Practice leaderboard state
  const [practiceCache, setPracticeCache] =
    useState<Record<string, LeaderboardPage>>(initialData)
  const [category, setCategory] = useState<LeaderboardCategory>("most_solves")
  const [friendsOnly, setFriendsOnly] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  // WCA leaderboard state — seeded with server-fetched data
  const [wcaCache, setWcaCache] =
    useState<Record<string, WcaLeaderboardPage>>(initialWcaData)
  const [sorKinchType, setSorKinchType] = useState<SorKinchType>("single")
  const [region, setRegion] = useState<RegionSelection>(DEFAULT_REGION)

  // "Find Me" state
  const [practiceMyRank, setPracticeMyRank] =
    useState<{ entries: LeaderboardEntry[]; userRank: number; totalCount: number } | null>(null)
  const [wcaMyRank, setWcaMyRank] =
    useState<{ entries: WcaLeaderboardEntry[]; userRank: number; totalCount: number } | null>(null)
  const [viewingMyRank, setViewingMyRank] = useState(false)
  const [findMeNoData, setFindMeNoData] = useState(false)
  const [isFindingMe, startFindTransition] = useTransition()

  const isWca = isWcaCategory(category)

  // Cache keys
  const practiceKey = `${friendsOnly ? "following:" : ""}${category}`

  // Kinch is one combined score — don't include sorKinchType in its cache key
  const wcaKey = category === "kinch"
    ? `${category}:combined:${region.level}:${region.id ?? "all"}`
    : `${category}:${sorKinchType}:${region.level}:${region.id ?? "all"}`

  // Current data
  const currentPracticePage = practiceCache[practiceKey]
  const currentWcaPage = wcaCache[wcaKey]

  const displayEntries = isWca
    ? (viewingMyRank && wcaMyRank ? wcaMyRank.entries : currentWcaPage?.entries ?? [])
    : (viewingMyRank && practiceMyRank ? practiceMyRank.entries : currentPracticePage?.entries ?? [])

  const totalCount = isWca
    ? (viewingMyRank && wcaMyRank ? wcaMyRank.totalCount : currentWcaPage?.totalCount ?? 0)
    : (viewingMyRank && practiceMyRank ? practiceMyRank.totalCount : currentPracticePage?.totalCount ?? 0)

  const hasMore = !viewingMyRank && displayEntries.length < totalCount &&
    (isWca ? !!currentWcaPage : !!currentPracticePage)

  useEffect(() => {
    const prefs = loadPrefs()
    setCategory(prefs.category)
    setFriendsOnly(prefs.friendsOnly)
    setPrefsLoaded(true)
  }, [])

  useEffect(() => { if (prefsLoaded) savePrefs(category, friendsOnly) }, [category, friendsOnly, prefsLoaded])

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  // Fetch practice data when cache misses
  useEffect(() => {
    if (isWca || practiceCache[practiceKey]) return
    if (friendsOnly && !userId) return

    startTransition(async () => {
      const data = await getLeaderboard(
        category,
        friendsOnly,
        userId ?? undefined
      )
      setPracticeCache((prev) => ({ ...prev, [practiceKey]: data }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceKey, category, friendsOnly, userId, isWca])

  // Fetch WCA data when cache misses
  useEffect(() => {
    if (!isWca || wcaCache[wcaKey]) return

    // Kinch always uses "single" (one combined score stored in kinch_single)
    const type = category === "kinch" ? "single" : sorKinchType
    startTransition(async () => {
      const data = await getSorKinchLeaderboard(
        category as "sor" | "kinch",
        type,
        { level: region.level, id: region.id }
      )
      setWcaCache((prev) => ({ ...prev, [wcaKey]: data }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wcaKey, category, sorKinchType, region, isWca])

  useEffect(() => {
    setViewingMyRank(false); setPracticeMyRank(null); setWcaMyRank(null); setFindMeNoData(false)
  }, [category, friendsOnly, sorKinchType, region])

  const handleLoadMore = () => {
    if (isWca) {
      if (!currentWcaPage || !hasMore) return
      const type = category === "kinch" ? "single" : sorKinchType
      startTransition(async () => {
        const data = await getSorKinchLeaderboard(
          category as "sor" | "kinch",
          type,
          { level: region.level, id: region.id },
          currentWcaPage.entries.length
        )
        setWcaCache((prev) => ({
          ...prev,
          [wcaKey]: {
            entries: [...(prev[wcaKey]?.entries ?? []), ...data.entries],
            totalCount: data.totalCount,
          },
        }))
      })
    } else {
      if (!currentPracticePage || !hasMore) return
      startTransition(async () => {
        const data = await getLeaderboard(
          category,
          friendsOnly,
          userId ?? undefined,
          currentPracticePage.entries.length
        )
        setPracticeCache((prev) => ({
          ...prev,
          [practiceKey]: {
            entries: [...(prev[practiceKey]?.entries ?? []), ...data.entries],
            totalCount: data.totalCount,
          },
        }))
      })
    }
  }

  const handleFindMe = () => {
    if (isWca) {
      if (!userWcaId) {
        setFindMeNoData(true)
        return
      }
      const type = category === "kinch" ? "single" : sorKinchType
      startFindTransition(async () => {
        const result = await findUserInSorKinch(
          category as "sor" | "kinch",
          type,
          userWcaId,
          { level: region.level, id: region.id }
        )
        if (result) {
          setWcaMyRank(result)
          setViewingMyRank(true)
          setFindMeNoData(false)
        } else {
          setFindMeNoData(true)
          setViewingMyRank(false)
        }
      })
    } else {
      if (!userId) return
      startFindTransition(async () => {
        const result = await getUserLeaderboardPosition(
          category,
          userId,
          friendsOnly
        )
        if (result) {
          setPracticeMyRank(result)
          setViewingMyRank(true)
          setFindMeNoData(false)
        } else {
          setFindMeNoData(true)
          setViewingMyRank(false)
        }
      })
    }
  }

  const handleBackToTop = () => {
    setViewingMyRank(false)
    setPracticeMyRank(null)
    setWcaMyRank(null)
  }

  const isLoading =
    isPending && (isWca ? !currentWcaPage : !currentPracticePage)
  const myRankData = isWca ? wcaMyRank : practiceMyRank
  const canFindMe = isWca ? !!userWcaId : !!userId

  return (
    <div className="flex flex-col gap-6">
      <LeaderboardControls
        category={category}
        setCategory={setCategory}
        isWca={isWca}
        friendsOnly={friendsOnly}
        setFriendsOnly={setFriendsOnly}
        userId={userId}
        sorKinchType={sorKinchType}
        setSorKinchType={setSorKinchType}
        region={region}
        setRegion={setRegion}
        countries={countries}
        canFindMe={canFindMe}
        viewingMyRank={viewingMyRank}
        onFindMe={handleFindMe}
        onBackToTop={handleBackToTop}
        isFindingMe={isFindingMe}
        userWcaId={userWcaId}
      />

      {/* "Find Me" rank banner */}
      {viewingMyRank && myRankData && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-center text-sm">
          You are ranked{" "}
          <span className="font-mono font-bold text-primary">
            #{myRankData.userRank.toLocaleString()}
          </span>{" "}
          out of{" "}
          <span className="font-mono font-semibold">
            {myRankData.totalCount.toLocaleString()}
          </span>{" "}
          cubers
        </div>
      )}

      {findMeNoData && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center text-sm text-amber-200">
          {isWca && !userWcaId
            ? "Link your WCA account on your profile to find yourself in WCA leaderboards."
            : "You don\u2019t have any data for this category yet."}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            {isWca
              ? "No WCA ranking data available yet. Run the WCA sync to populate."
              : friendsOnly
                ? "No data from people you\u2019re following yet."
                : "No leaderboard data yet. Start logging sessions!"}
          </p>
        </div>
      ) : isWca ? (
        <>
          <div className="hidden sm:block">
            <WcaLeaderboardTable
              entries={displayEntries as WcaLeaderboardEntry[]}
              category={category}
              highlightWcaId={viewingMyRank ? userWcaId : null}
            />
          </div>
          <div className="flex flex-col gap-2 sm:hidden">
            {(displayEntries as WcaLeaderboardEntry[]).map((entry) => (
              <WcaLeaderboardCard
                key={entry.wca_id}
                entry={entry}
                category={category}
                isHighlighted={viewingMyRank && entry.wca_id === userWcaId}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="hidden sm:block">
            <PracticeLeaderboardTable
              entries={displayEntries as LeaderboardEntry[]}
              category={category}
              highlightUserId={viewingMyRank ? userId : null}
            />
          </div>
          <div className="flex flex-col gap-2 sm:hidden">
            {(displayEntries as LeaderboardEntry[]).map((entry) => (
              <PracticeLeaderboardCard
                key={entry.user_id}
                entry={entry}
                category={category}
                isHighlighted={viewingMyRank && entry.user_id === userId}
              />
            ))}
          </div>
        </>
      )}

      {/* Pagination footer */}
      {displayEntries.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {displayEntries.length} of {totalCount.toLocaleString()}
          </p>
          {hasMore && (
            <Button
              size="sm"
              variant="outline"
              className="border-border/50 text-xs"
              onClick={handleLoadMore}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
