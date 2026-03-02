"use client"

import { Loader2, MapPin, ArrowUp, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LeaderboardCategory, TimePeriod } from "@/lib/leaderboard-types"
import { TIMED_CATEGORIES } from "@/lib/leaderboard-types"
import type { SorKinchType, WcaCountry } from "@/lib/actions/sor-kinch"
import { RegionFilter } from "@/components/leaderboards/region-filter"
import type { RegionSelection } from "@/components/leaderboards/region-filter"

const PRACTICE_CATEGORIES: { id: LeaderboardCategory; label: string }[] = [
  { id: "most_solves", label: "Most Solves" },
  { id: "longest_streak", label: "Streak" },
  { id: "most_practice_time", label: "Practice Time" },
]

const WCA_CATEGORIES: { id: LeaderboardCategory; label: string }[] = [
  { id: "sor", label: "SOR" },
  { id: "kinch", label: "Kinch" },
]

export const ALL_CATEGORIES = [...PRACTICE_CATEGORIES, ...WCA_CATEGORIES]

const TIME_PERIODS: { id: TimePeriod; label: string }[] = [
  { id: "all_time", label: "All Time" },
  { id: "weekly", label: "This Week" },
  { id: "daily", label: "Today" },
]

export function LeaderboardControls({
  category,
  setCategory,
  isWca,
  friendsOnly,
  setFriendsOnly,
  userId,
  timePeriod,
  setTimePeriod,
  sorKinchType,
  setSorKinchType,
  region,
  setRegion,
  countries,
  canFindMe,
  viewingMyRank,
  onFindMe,
  onBackToTop,
  isFindingMe,
  userWcaId,
}: {
  category: LeaderboardCategory
  setCategory: (cat: LeaderboardCategory) => void
  isWca: boolean
  friendsOnly: boolean
  setFriendsOnly: (f: boolean) => void
  userId: string | null
  timePeriod: TimePeriod
  setTimePeriod: (t: TimePeriod) => void
  sorKinchType: SorKinchType
  setSorKinchType: (t: SorKinchType) => void
  region: RegionSelection
  setRegion: (r: RegionSelection) => void
  countries: WcaCountry[]
  canFindMe: boolean
  viewingMyRank: boolean
  onFindMe: () => void
  onBackToTop: () => void
  isFindingMe: boolean
  userWcaId?: string | null
}) {
  const isTimedCategory = TIMED_CATEGORIES.includes(category)
  const showTimePeriod = !isWca && isTimedCategory

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {ALL_CATEGORIES.map((cat) => (
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

        {!isWca && userId && (
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

      {/* Time period row — only for Most Solves and Practice Time */}
      {showTimePeriod && (
        <div className="flex items-center gap-3">
          <div className="flex rounded-full bg-muted/50 p-0.5">
            {TIME_PERIODS.map((tp) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => setTimePeriod(tp.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  timePeriod === tp.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>
          {timePeriod !== "all_time" && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Pacific Time
            </span>
          )}
        </div>
      )}

      {/* Second row: filters + Find Me */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isWca && (
            <>
              <RegionFilter
                value={region}
                onChange={setRegion}
                countries={countries}
              />
              {/* Single/Average toggle only applies to SOR — Kinch is one combined score */}
              {category === "sor" && (
                <div className="flex rounded-full bg-muted/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSorKinchType("single")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      sorKinchType === "single"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setSorKinchType("average")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      sorKinchType === "average"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Average
                  </button>
                </div>
              )}
            </>
          )}

          {!isWca && <div />}
        </div>

        {(canFindMe || isWca) && (
          <div className="flex gap-2">
            {viewingMyRank ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-border/50 text-xs"
                onClick={onBackToTop}
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Back to Top
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-border/50 text-xs"
                onClick={onFindMe}
                disabled={isFindingMe || (isWca && !userWcaId)}
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
  )
}
