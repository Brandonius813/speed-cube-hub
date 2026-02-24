"use client"

import { Loader2, MapPin, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LeaderboardCategory } from "@/lib/actions/leaderboards"
import type { SorKinchType, WcaCountry } from "@/lib/actions/sor-kinch"
import { WCA_EVENTS } from "@/lib/constants"
import { RegionFilter } from "@/components/leaderboards/region-filter"
import type { RegionSelection } from "@/components/leaderboards/region-filter"

const PRACTICE_CATEGORIES: { id: LeaderboardCategory; label: string }[] = [
  { id: "most_solves", label: "Most Solves" },
  { id: "fastest_avg", label: "Fastest Avg" },
  { id: "longest_streak", label: "Streak" },
  { id: "most_practice_time", label: "Practice Time" },
]

const WCA_CATEGORIES: { id: LeaderboardCategory; label: string }[] = [
  { id: "sor", label: "SOR" },
  { id: "kinch", label: "Kinch" },
]

export const ALL_CATEGORIES = [...PRACTICE_CATEGORIES, ...WCA_CATEGORIES]

export function LeaderboardControls({
  category,
  setCategory,
  isWca,
  event,
  setEvent,
  friendsOnly,
  setFriendsOnly,
  userId,
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
  event: string
  setEvent: (e: string) => void
  friendsOnly: boolean
  setFriendsOnly: (f: boolean) => void
  userId: string | null
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

      {/* Second row: filters + Find Me */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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

          {isWca && (
            <>
              <RegionFilter
                value={region}
                onChange={setRegion}
                countries={countries}
              />
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
            </>
          )}

          {!isWca && category !== "fastest_avg" && <div />}
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
