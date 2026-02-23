"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Profile } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"

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

export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <Avatar className="h-24 w-24 border-2 border-primary/30">
        <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
          {getInitials(profile.display_name)}
        </AvatarFallback>
      </Avatar>

      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-foreground">
          {profile.display_name}
        </h1>
        <p className="text-muted-foreground">@{profile.handle}</p>
        {profile.bio && (
          <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>
        )}
        {profile.events.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {profile.events.map((eventId) => (
              <Badge
                key={eventId}
                className={eventColors[eventId] || "border-primary/20 bg-primary/15 text-primary"}
              >
                {getEventLabel(eventId)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
