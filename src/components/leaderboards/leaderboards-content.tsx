"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Trophy, Medal, Award, Loader2 } from "lucide-react"
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
import { getLeaderboard } from "@/lib/actions/leaderboards"
import type { LeaderboardCategory } from "@/lib/actions/leaderboards"
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

/** Returns the medal icon for top-3 ranks, or the rank number for everyone else */
function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Trophy className="h-5 w-5 text-yellow-400" />
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-gray-300" />
  }
  if (rank === 3) {
    return <Award className="h-5 w-5 text-amber-600" />
  }
  return <span className="font-mono text-sm text-muted-foreground">{rank}</span>
}

/** Returns a subtle background tint for top-3 rows */
function getRankBg(rank: number): string {
  if (rank === 1) return "bg-yellow-400/5 border-yellow-400/20"
  if (rank === 2) return "bg-gray-300/5 border-gray-300/20"
  if (rank === 3) return "bg-amber-600/5 border-amber-600/20"
  return "border-border/50"
}

export function LeaderboardsContent({
  initialEntries,
}: {
  initialEntries: LeaderboardEntry[]
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [category, setCategory] = useState<LeaderboardCategory>("most_solves")
  const [event, setEvent] = useState("333")
  const [friendsOnly, setFriendsOnly] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Check if user is logged in (for friends-only toggle)
  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  // Fetch leaderboard when category, event, or friendsOnly changes
  useEffect(() => {
    startTransition(async () => {
      const data = await getLeaderboard(
        category,
        category === "fastest_avg" ? event : undefined,
        friendsOnly,
        userId ?? undefined
      )
      setEntries(data)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, event, friendsOnly, userId])

  return (
    <div className="flex flex-col gap-6">
      {/* Controls bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Category tabs — horizontal scroll on mobile */}
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

        <div className="flex items-center gap-3">
          {/* Event selector (only visible for "Fastest Average") */}
          {category === "fastest_avg" && (
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
          )}

          {/* Friends-only toggle (only if logged in) */}
          {userId && (
            <Button
              size="sm"
              variant={friendsOnly ? "default" : "outline"}
              className={`shrink-0 text-xs sm:text-sm ${
                friendsOnly
                  ? "bg-primary text-primary-foreground"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setFriendsOnly(!friendsOnly)}
            >
              {friendsOnly ? "Friends" : "Global"}
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            {friendsOnly
              ? "No data from people you follow yet."
              : "No leaderboard data yet. Start logging sessions!"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on mobile */}
          <div className="hidden sm:block">
            <LeaderboardTable
              entries={entries}
              category={category}
            />
          </div>

          {/* Mobile cards — hidden on desktop */}
          <div className="flex flex-col gap-2 sm:hidden">
            {entries.map((entry) => (
              <LeaderboardCard
                key={entry.user_id}
                entry={entry}
                category={category}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Desktop leaderboard table */
function LeaderboardTable({
  entries,
  category,
}: {
  entries: LeaderboardEntry[]
  category: LeaderboardCategory
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
            {entries.map((entry) => (
              <tr
                key={entry.user_id}
                className={`border-b border-border/30 transition-colors last:border-b-0 hover:bg-white/[0.02] ${
                  entry.rank <= 3 ? getRankBg(entry.rank) : ""
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
                    <span className="font-medium text-foreground">
                      {entry.display_name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {formatStatValue(entry.stat_value, category)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

/** Mobile leaderboard card */
function LeaderboardCard({
  entry,
  category,
}: {
  entry: LeaderboardEntry
  category: LeaderboardCategory
}) {
  return (
    <Link href={`/profile/${entry.handle}`}>
      <Card
        className={`transition-colors hover:border-primary/30 hover:bg-card/80 ${getRankBg(entry.rank)} bg-card`}
      >
        <CardContent className="flex items-center gap-3 px-3 py-3">
          {/* Rank */}
          <div className="flex w-8 shrink-0 items-center justify-center">
            <RankDisplay rank={entry.rank} />
          </div>

          {/* Avatar */}
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

          {/* Name */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {entry.display_name}
            </p>
          </div>

          {/* Stat value */}
          <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
            {formatStatValue(entry.stat_value, category)}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
