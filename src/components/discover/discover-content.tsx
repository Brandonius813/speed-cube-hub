"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, MapPin, X } from "lucide-react"
import { searchProfiles } from "@/lib/actions/profiles"
import { WCA_EVENTS } from "@/lib/constants"
import type { Profile } from "@/lib/types"

const eventColors: Record<string, string> = {
  "333": "border-chart-1/20 bg-chart-1/15 text-chart-1",
  "444": "border-primary/20 bg-primary/15 text-primary",
  "555": "border-chart-3/20 bg-chart-3/15 text-chart-3",
  "222": "border-accent/20 bg-accent/15 text-accent",
  pyram: "border-chart-5/20 bg-chart-5/15 text-chart-5",
  minx: "border-chart-4/20 bg-chart-4/15 text-chart-4",
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

type SortOption = "newest" | "name"

export function DiscoverContent({
  initialProfiles,
}: {
  initialProfiles: Profile[]
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [query, setQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [searching, setSearching] = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    async (q: string, event: string | null, sort: SortOption) => {
      setSearching(true)
      const result = await searchProfiles(q, {
        event: event ?? undefined,
        sortBy: sort,
      })
      setProfiles(result.profiles)
      setSearching(false)
    },
    []
  )

  function handleSearchChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(value, selectedEvent, sortBy)
    }, 300)
  }

  function handleEventFilter(eventId: string) {
    const next = selectedEvent === eventId ? null : eventId
    setSelectedEvent(next)
    doSearch(query, next, sortBy)
  }

  function clearEventFilter() {
    setSelectedEvent(null)
    doSearch(query, null, sortBy)
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value)
    doSearch(query, selectedEvent, value)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Sort row */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, handle, or location..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="min-h-11 pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="h-11 w-[130px] shrink-0 border-border/50 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {WCA_EVENTS.map((event) => {
          const isActive = selectedEvent === event.id
          return (
            <button
              key={event.id}
              onClick={() => handleEventFilter(event.id)}
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border/50 bg-secondary/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {event.label}
            </button>
          )
        })}
        {selectedEvent && (
          <button
            onClick={clearEventFilter}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {profiles.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {searching
            ? "Searching..."
            : query || selectedEvent
              ? "No cubers found matching your filters."
              : "No cubers to show yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {profiles.map((profile) => (
            <Link key={profile.id} href={`/profile/${profile.handle}`}>
              <Card className="border-border/50 bg-card transition-colors hover:border-primary/30 hover:bg-card/80">
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10 shrink-0 border border-primary/20">
                    {profile.avatar_url && (
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile.display_name}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                      {getInitials(profile.display_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">
                        {profile.display_name}
                      </p>
                      {profile.location && (
                        <span className="hidden items-center gap-0.5 text-xs text-muted-foreground sm:inline-flex">
                          <MapPin className="h-3 w-3" />
                          {profile.location}
                        </span>
                      )}
                    </div>
                    {/* Mobile location */}
                    {profile.location && (
                      <p className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground sm:hidden">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{profile.location}</span>
                      </p>
                    )}
                    {profile.bio && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {profile.bio}
                      </p>
                    )}
                    {profile.events.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.events.slice(0, 4).map((eventId) => (
                          <Badge
                            key={eventId}
                            variant="outline"
                            className={`text-xs ${
                              eventColors[eventId] ||
                              "border-primary/20 bg-primary/15 text-primary"
                            }`}
                          >
                            {getEventLabel(eventId)}
                          </Badge>
                        ))}
                        {profile.events.length > 4 && (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            +{profile.events.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
