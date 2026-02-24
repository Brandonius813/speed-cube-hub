"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Trophy, Medal, Award, Loader2, MapPin, ArrowUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getLeaderboard,
  getUserLeaderboardPosition,
} from "@/lib/actions/leaderboards"
import type {
  LeaderboardCategory,
  LeaderboardPage,
} from "@/lib/actions/leaderboards"
import type { LeaderboardEntry } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"
import { getSupabaseClient } from "@/lib/supabase/client"

const CATEGORIES: { id: LeaderboardCategory; label: string }[] = [
  { id: "most_solves", label: "Most Solves" },
  { id: "fastest_avg", label: "Fastest Average" },
  { id: "longest_streak", label: "Longest Streak" },
  { id: "most_practice_time", label: "Most Practice Time" },
]

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

function formatStatValue(
  value: number,
  category: LeaderboardCategory
): string {
  switch (category) {
    case "fastest_avg":
      return formatTime(value)
    case "most_solves":
      return value.toLocaleString()
    case "longest_streak":
      return `${value} day${value !== 1 ? "s" : ""}`
    case "most_practice_time": {
      const hours = Math.floor(value / 60)
      const mins = value % 60
      if (hours === 0) return `${mins}m`
      if (mins === 0) return `${hours}h`
      return `${hours}h ${mins}m`
    }
    default:
      return String(value)
  }
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return (
    <span className="font-mono text-sm text-muted-foreground">{rank}</span>
  )
}

function getRankBg(rank: number): string {
  if (rank === 1) return "bg-yellow-400/5 border-yellow-400/20"
  if (rank === 2) return "bg-gray-300/5 border-gray-300/20"
  if (rank === 3) return "bg-amber-600/5 border-amber-600/20"
  return "border-border/50"
}

function getCacheKey(
  category: LeaderboardCategory,
  event: string,
  friendsOnly: boolean
): string {
  const prefix = friendsOnly ? "following:" : ""
  if (category === "fastest_avg") return `${prefix}fastest_avg:${event}`
  return `${prefix}${category}`
}

export function LeaderboardsContent({
  initialData,
}: {
  initialData: Record<string, LeaderboardPage>
}) {
  const [cache, setCache] =
    useState<Record<string, LeaderboardPage>>(initialData)
  const [category, setCategory] =
    useState<LeaderboardCategory>("most_solves")
  const [event, setEvent] = useState("333")
  const [friendsOnly, setFriendsOnly] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // "Find Me" state
  const [myRankData, setMyRankData] = useState<{
    entries: LeaderboardEntry[]
    userRank: number
    totalCount: number
  } | null>(null)
  const [viewingMyRank, setViewingMyRank] = useState(false)
  const [findMeNoData, setFindMeNoData] = useState(false)
  const [isFindingMe, startFindTransition] = useTransition()

  const currentKey = getCacheKey(category, event, friendsOnly)
  const currentPage = cache[currentKey]

  const displayEntries =
    viewingMyRank && myRankData
      ? myRankData.entries
      : currentPage?.entries ?? []
  const totalCount =
    viewingMyRank && myRankData
      ? myRankData.totalCount
      : currentPage?.totalCount ?? 0
  const hasMore = !viewingMyRank && displayEntries.length < totalCount

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  // Fetch only when the current key is missing from cache
  useEffect(() => {
    if (cache[currentKey]) return
    if (friendsOnly && !userId) return

    startTransition(async () => {
      const data = await getLeaderboard(
        category,
        category === "fastest_avg" ? event : undefined,
        friendsOnly,
        userId ?? undefined
      )
      setCache((prev) => ({ ...prev, [currentKey]: data }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, category, event, friendsOnly, userId])

  // Reset "Find Me" when switching tabs
  useEffect(() => {
    setViewingMyRank(false)
    setMyRankData(null)
    setFindMeNoData(false)
  }, [category, event, friendsOnly])

  const handleLoadMore = () => {
    if (!currentPage || !hasMore) return
    startTransition(async () => {
      const data = await getLeaderboard(
        category,
        category === "fastest_avg" ? event : undefined,
        friendsOnly,
        userId ?? undefined,
        currentPage.entries.length
      )
      setCache((prev) => ({
        ...prev,
        [currentKey]: {
          entries: [...(prev[currentKey]?.entries ?? []), ...data.entries],
          totalCount: data.totalCount,
        },
      }))
    })
  }

  const handleFindMe = () => {
    if (!userId) return
    startFindTransition(async () => {
      const result = await getUserLeaderboardPosition(
        category,
        userId,
        category === "fastest_avg" ? event : undefined,
        friendsOnly
      )
      if (result) {
        setMyRankData(result)
        setViewingMyRank(true)
        setFindMeNoData(false)
      } else {
        setFindMeNoData(true)
        setViewingMyRank(false)
      }
    })
  }

  const isLoading = isPending && !currentPage

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={category === cat.id ? "default" : "outline"}
                className={`shrink-0 text-xs sm:text-sm ${
                  category === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {userId && (
            <div className="flex shrink-0 rounded-full bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setFriendsOnly(false)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  !friendsOnly
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => setFriendsOnly(true)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  friendsOnly
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Following
              </button>
            </div>
          )}
        </div>

        {/* Second row: event selector + Find Me */}
        <div className="flex items-center justify-between gap-3">
          {category === "fastest_avg" ? (
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger className="h-9 w-[140px] border-border/50 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WCA_EVENTS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div />
          )}

          {userId && (
            <div className="flex gap-2">
              {viewingMyRank ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-border/50 text-xs"
                  onClick={() => {
                    setViewingMyRank(false)
                    setMyRankData(null)
                  }}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Back to Top
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-border/50 text-xs"
                  onClick={handleFindMe}
                  disabled={isFindingMe}
                >
                  {isFindingMe ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  Find Me
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Find Me" rank banner */}
      {viewingMyRank && myRankData && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-center text-sm">
          You are ranked{" "}
          <span className="font-mono font-bold text-primary">
            #{myRankData.userRank}
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
          You don&apos;t have any data for this category yet. Log some
          sessions!
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
            {friendsOnly
              ? "No data from people you're following yet."
              : "No leaderboard data yet. Start logging sessions!"}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block">
            <LeaderboardTable
              entries={displayEntries}
              category={category}
              highlightUserId={viewingMyRank ? userId : null}
            />
          </div>

          <div className="flex flex-col gap-2 sm:hidden">
            {displayEntries.map((entry) => (
              <LeaderboardCard
                key={entry.user_id}
                entry={entry}
                category={category}
                isHighlighted={viewingMyRank && entry.user_id === userId}
              />
            ))}
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {displayEntries.length} of{" "}
              {totalCount.toLocaleString()}
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
        </>
      )}
    </div>
  )
}

function LeaderboardTable({
  entries,
  category,
  highlightUserId,
}: {
  entries: LeaderboardEntry[]
  category: LeaderboardCategory
  highlightUserId?: string | null
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
              <th className="w-16 px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">Cuber</th>
              <th className="px-4 py-3 text-right">
                {category === "fastest_avg" && "Avg Time"}
                {category === "most_solves" && "Total Solves"}
                {category === "longest_streak" && "Streak"}
                {category === "most_practice_time" && "Practice Time"}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMe = highlightUserId === entry.user_id
              return (
                <tr
                  key={entry.user_id}
                  className={`border-b border-border/30 transition-colors last:border-b-0 hover:bg-white/[0.02] ${
                    isMe
                      ? "bg-primary/10 border-primary/30"
                      : entry.rank <= 3
                        ? getRankBg(entry.rank)
                        : ""
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <RankDisplay rank={entry.rank} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/profile/${entry.handle}`}
                      className="flex items-center gap-3 transition-colors hover:text-primary"
                    >
                      <Avatar className="h-8 w-8 border border-primary/20">
                        {entry.avatar_url && (
                          <AvatarImage
                            src={entry.avatar_url}
                            alt={entry.display_name}
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(entry.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {entry.display_name}
                        </span>
                        {isMe && (
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            YOU
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {formatStatValue(entry.stat_value, category)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function LeaderboardCard({
  entry,
  category,
  isHighlighted,
}: {
  entry: LeaderboardEntry
  category: LeaderboardCategory
  isHighlighted?: boolean
}) {
  return (
    <Link href={`/profile/${entry.handle}`}>
      <Card
        className={`transition-colors hover:border-primary/30 hover:bg-card/80 ${
          isHighlighted
            ? "bg-primary/10 border-primary/30"
            : `${getRankBg(entry.rank)} bg-card`
        }`}
      >
        <CardContent className="flex items-center gap-3 px-3 py-3">
          <div className="flex w-8 shrink-0 items-center justify-center">
            <RankDisplay rank={entry.rank} />
          </div>
          <Avatar className="h-9 w-9 shrink-0 border border-primary/20">
            {entry.avatar_url && (
              <AvatarImage
                src={entry.avatar_url}
                alt={entry.display_name}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {getInitials(entry.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">
                {entry.display_name}
              </p>
              {isHighlighted && (
                <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  YOU
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
            {formatStatValue(entry.stat_value, category)}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
