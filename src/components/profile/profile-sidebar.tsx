"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  ExternalLink,
  Eye,
  Globe,
  MapPin,
  Pencil,
} from "lucide-react"
import { EventBadge } from "@/components/shared/event-badge"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
import { FollowListModal } from "@/components/profile/follow-list-modal"
import { getWcaCountries } from "@/lib/actions/sor-kinch"
import type { Profile } from "@/lib/types"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function formatPracticeTime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  if (hours < 100) {
    const mins = totalMinutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${hours}h`
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#EF4444",
  instagram: "#F97316",
  tiktok: "#A855F7",
  x: "#6366F1",
  discord: "#22D3EE",
  wca: "#22D3EE",
  website: "#8B8BA3",
}

export function ProfileSidebar({
  profile,
  isOwner = false,
  followerCount = 0,
  followingCount = 0,
  totalPracticeMinutes = 0,
  followButton,
  onEditProfile,
}: {
  profile: Profile
  isOwner?: boolean
  followerCount?: number
  followingCount?: number
  totalPracticeMinutes?: number
  followButton?: React.ReactNode
  onEditProfile?: () => void
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

  const mainEvents =
    profile.main_events?.length > 0
      ? profile.main_events
      : profile.main_event
        ? [profile.main_event]
        : []

  return (
    <div className="hidden lg:block">
      <div className="sticky top-24 flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-5">
        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar className="h-28 w-28 border-2 border-primary/30">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            )}
            <AvatarFallback className="bg-primary/10 text-3xl font-bold text-primary">
              {getInitials(profile.display_name)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Main event badges */}
        {mainEvents.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {mainEvents.map((eventId) => (
              <EventBadge
                key={eventId}
                event={eventId}
                className="border-accent/30 bg-accent/10 text-accent"
              />
            ))}
          </div>
        )}

        {/* Name + handle */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">
            {profile.display_name}
          </h2>
          <p className="text-sm text-muted-foreground">@{profile.handle}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-center text-sm leading-relaxed text-foreground/80">
            {profile.bio}
          </p>
        )}

        {/* Meta rows */}
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Joined {formatJoinDate(profile.created_at)}</span>
          </div>
          {displayLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{displayLocation}</span>
            </div>
          )}
        </div>

        {/* Stats row: Followers / Following / Practice Time */}
        <div className="grid grid-cols-3 gap-2 border-y border-border/50 py-3">
          <button
            onClick={() => { setFollowListTab("followers"); setFollowListOpen(true) }}
            className="flex flex-col items-center gap-0.5 text-center transition-colors hover:text-foreground"
          >
            <span className="font-mono text-base font-bold text-foreground">
              {followerCount}
            </span>
            <span className="text-[11px] text-muted-foreground">Followers</span>
          </button>
          <button
            onClick={() => { setFollowListTab("following"); setFollowListOpen(true) }}
            className="flex flex-col items-center gap-0.5 text-center transition-colors hover:text-foreground"
          >
            <span className="font-mono text-base font-bold text-foreground">
              {followingCount}
            </span>
            <span className="text-[11px] text-muted-foreground">Following</span>
          </button>
          <div className="text-center">
            <div className="font-mono text-base font-bold text-foreground">
              {formatPracticeTime(totalPracticeMinutes)}
            </div>
            <div className="text-[11px] text-muted-foreground">Practice</div>
          </div>
        </div>

        {/* Follow / Edit button */}
        {isOwner ? (
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditProfile ?? (() => setEditOpen(true))}
              className="min-h-9 flex-1 gap-1.5 border-border/50"
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
              </Link>
            </Button>
          </div>
        ) : (
          followButton && <div className="w-full">{followButton}</div>
        )}

        {/* Social link icons */}
        {profile.links && profile.links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {profile.links.map((link, i) => {
              const color = PLATFORM_COLORS[link.platform] ?? "#6366F1"
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.label}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-secondary"
                  style={{ color }}
                >
                  {link.platform === "website" ? (
                    <ExternalLink className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </a>
              )
            })}
          </div>
        )}
      </div>

      {isOwner && !onEditProfile && (
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
    </div>
  )
}
