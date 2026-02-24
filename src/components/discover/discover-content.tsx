"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
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

export function DiscoverContent({
  initialProfiles,
}: {
  initialProfiles: Profile[]
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)

  async function handleSearch(value: string) {
    setQuery(value)

    // Debounce: only search after 300ms of no typing
    if (value.length === 0) {
      const result = await searchProfiles("")
      setProfiles(result.profiles)
      return
    }

    if (value.length < 2) return

    setSearching(true)
    const result = await searchProfiles(value)
    setProfiles(result.profiles)
    setSearching(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or handle..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="min-h-11 pl-10"
        />
      </div>

      {/* Results */}
      {profiles.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {searching
            ? "Searching..."
            : query
              ? "No cubers found matching your search."
              : "No cubers to show yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {profiles.map((profile) => (
            <Link key={profile.id} href={`/profile/${profile.handle}`}>
              <Card className="border-border/50 bg-card transition-colors hover:border-primary/30 hover:bg-card/80">
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10 border border-primary/20">
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
                    <p className="truncate font-semibold text-foreground">
                      {profile.display_name}
                    </p>
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
