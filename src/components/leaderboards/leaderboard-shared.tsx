"use client"

import Link from "next/link"
import { Trophy, Medal, Award } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import type { LeaderboardCategory } from "@/lib/leaderboard-types"
import type { LeaderboardEntry } from "@/lib/types"
import type { WcaLeaderboardEntry } from "@/lib/actions/sor-kinch"
import { formatEventTime } from "@/lib/utils"

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function formatTime(seconds: number): string {
  return formatEventTime(seconds)
}

export function formatStatValue(
  value: number,
  category: LeaderboardCategory
): string {
  switch (category) {
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
    case "sor":
      return value.toLocaleString()
    case "kinch":
      return value.toFixed(2)
    default:
      return String(value)
  }
}

export function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return (
    <span className="font-mono text-sm text-muted-foreground">{rank}</span>
  )
}

export function getRankBg(rank: number): string {
  if (rank === 1) return "bg-yellow-400/5 border-yellow-400/20"
  if (rank === 2) return "bg-gray-300/5 border-gray-300/20"
  if (rank === 3) return "bg-amber-600/5 border-amber-600/20"
  return "border-border/50"
}

function getColumnHeader(category: LeaderboardCategory): string {
  switch (category) {
    case "most_solves": return "Total Solves"
    case "longest_streak": return "Streak"
    case "most_practice_time": return "Practice Time"
    case "sor": return "Sum of Ranks"
    case "kinch": return "Kinch Score"
    default: return "Value"
  }
}

// ─── Practice-based leaderboard (uses handle-linked profiles) ─────

export function PracticeLeaderboardTable({
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
              <th className="px-4 py-3 text-right">{getColumnHeader(category)}</th>
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
                          <AvatarImage src={entry.avatar_url} alt={entry.display_name} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(entry.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{entry.display_name}</span>
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

export function PracticeLeaderboardCard({
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
              <AvatarImage src={entry.avatar_url} alt={entry.display_name} />
            )}
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {getInitials(entry.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{entry.display_name}</p>
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

// ─── WCA-based leaderboard (SOR/Kinch — uses WCA IDs, no profile link) ─────

export function WcaLeaderboardTable({
  entries,
  category,
  highlightWcaId,
}: {
  entries: WcaLeaderboardEntry[]
  category: LeaderboardCategory
  highlightWcaId?: string | null
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
              <th className="w-16 px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">Cuber</th>
              <th className="px-4 py-3 text-right">{getColumnHeader(category)}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMe = highlightWcaId === entry.wca_id
              return (
                <tr
                  key={entry.wca_id}
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
                    <a
                      href={`https://www.worldcubeassociation.org/persons/${entry.wca_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 transition-colors hover:text-primary"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                        <span className="text-xs font-bold text-primary">
                          {getInitials(entry.name)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{entry.name}</span>
                        <span className="text-[10px] text-muted-foreground">{entry.country_id}</span>
                        {isMe && (
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            YOU
                          </span>
                        )}
                      </div>
                    </a>
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

export function WcaLeaderboardCard({
  entry,
  category,
  isHighlighted,
}: {
  entry: WcaLeaderboardEntry
  category: LeaderboardCategory
  isHighlighted?: boolean
}) {
  return (
    <a
      href={`https://www.worldcubeassociation.org/persons/${entry.wca_id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <span className="text-xs font-bold text-primary">
              {getInitials(entry.name)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
              <span className="text-[10px] text-muted-foreground">{entry.country_id}</span>
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
    </a>
  )
}
