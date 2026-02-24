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
import { Search, MapPin } from "lucide-react"
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
  locations,
}: {
  initialProfiles: Profile[]
  locations: string[]
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [query, setQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [searching, setSearching] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    async (
      q: string,
      event: string | null,
      location: string | null,
      sort: SortOption
    ) => {
      setSearching(true)
      const result = await searchProfiles(q, {
        event: event ?? undefined,
        location: location ?? undefined,
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
      doSearch(value, selectedEvent, selectedLocation, sortBy)
    }, 300)
  }

  function handleEventChange(value: string) {
    const next = value === "all" ? null : value
    setSelectedEvent(next)
    doSearch(query, next, selectedLocation, sortBy)
  }

  function handleLocationChange(value: string) {
    const next = value === "all" ? null : value
    setSelectedLocation(next)
    doSearch(query, selectedEvent, next, sortBy)
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value)
    doSearch(query, selectedEvent, selectedLocation, value)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, handle, or location..."
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="min-h-11 pl-10"
        />
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Main Event</p>
          <Select
            value={selectedEvent ?? "all"}
            onValueChange={handleEventChange}
          >
            <SelectTrigger className="h-11 w-full border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All</SelectItem>
              {WCA_EVENTS.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Location</p>
          <Select
            value={selectedLocation ?? "all"}
            onValueChange={handleLocationChange}
          >
            <SelectTrigger className="h-11 w-full border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Sort by</p>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="h-11 w-full border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {profiles.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {searching
            ? "Searching..."
            : query || selectedEvent || selectedLocation
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
                      {profile.main_event && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-accent/20 bg-accent/10 text-xs text-accent"
                        >
                          {getEventLabel(profile.main_event)}
                        </Badge>
                      )}
                    </div>
                    {profile.location && (
                      <p className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground">
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
