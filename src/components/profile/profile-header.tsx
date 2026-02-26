"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Eye, MapPin, Pencil } from "lucide-react"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
import { FollowListModal } from "@/components/profile/follow-list-modal"
import { getWcaCountries } from "@/lib/actions/sor-kinch"
import Link from "next/link"
import type { Profile } from "@/lib/types"
import { EventBadge } from "@/components/shared/event-badge"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ProfileHeader({
  profile,
  isOwner = false,
  followButton,
  followerCount,
  followingCount,
}: {
  profile: Profile
  isOwner?: boolean
  followButton?: React.ReactNode
  followerCount?: number
  followingCount?: number
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [followListOpen, setFollowListOpen] = useState(false)
  const [followListTab, setFollowListTab] = useState<"followers" | "following">("followers")
  const [countryName, setCountryName] = useState<string | null>(null)

  // Look up country name if profile has country_id but no location string
  useEffect(() => {
    if (profile.country_id && !profile.location) {
      getWcaCountries().then((countries) => {
        const match = countries.find((c) => c.id === profile.country_id)
        if (match) setCountryName(match.name)
      })
    }
  }, [profile.country_id, profile.location])

  // Display location: prefer the composed location string, fall back to country name
  const displayLocation = profile.location || countryName

  return (
    <>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Avatar className="h-24 w-24 border-2 border-primary/30">
          {profile.avatar_url && (
            <AvatarImage
              src={profile.avatar_url}
              alt={profile.display_name}
            />
          )}
          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
            {getInitials(profile.display_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-col items-center gap-1.5 sm:items-start">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.display_name}
                </h1>
                {displayLocation && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {displayLocation}
                  </p>
                )}
              </div>
              {(followerCount !== undefined || followingCount !== undefined) && (
                <div className="mt-1 flex items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                  <button
                    onClick={() => { setFollowListTab("followers"); setFollowListOpen(true) }}
                    className="hover:text-foreground transition-colors"
                  >
                    <span className="font-semibold text-foreground">{followerCount ?? 0}</span>{" "}
                    {followerCount === 1 ? "follower" : "followers"}
                  </button>
                  <button
                    onClick={() => { setFollowListTab("following"); setFollowListOpen(true) }}
                    className="hover:text-foreground transition-colors"
                  >
                    <span className="font-semibold text-foreground">{followingCount ?? 0}</span>{" "}
                    following
                  </button>
                </div>
              )}
            </div>
            {isOwner ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="min-h-9 gap-1.5 border-border/50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="min-h-9 gap-1.5 border-border/50"
                >
                  <Link href={`/profile/${profile.handle}`}>
                    <Eye className="h-3.5 w-3.5" />
                    View Public
                  </Link>
                </Button>
              </div>
            ) : (
              followButton
            )}
          </div>
          {profile.bio && (
            <p className="mt-3 max-w-lg whitespace-pre-line text-pretty text-sm leading-relaxed text-foreground/80">
              {profile.bio}
            </p>
          )}
          {/* Main event badges */}
          {(profile.main_events?.length > 0 ? profile.main_events : profile.main_event ? [profile.main_event] : []).length > 0 && (
            <div className="mt-3 flex flex-col items-center gap-1.5 sm:items-start">
              <span className="text-xs font-medium text-muted-foreground">Main Events</span>
              <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {(profile.main_events?.length > 0 ? profile.main_events : profile.main_event ? [profile.main_event] : []).map((eventId) => (
                  <EventBadge key={eventId} event={eventId} className="border-accent/30 bg-accent/10 text-accent" />
                ))}
              </div>
            </div>
          )}
          {profile.events.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile.events.map((eventId) => (
                <EventBadge key={eventId} event={eventId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <EditProfileModal
          profile={profile}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <FollowListModal
        userId={profile.id}
        open={followListOpen}
        onOpenChange={setFollowListOpen}
        tab={followListTab}
      />
    </>
  )
}
