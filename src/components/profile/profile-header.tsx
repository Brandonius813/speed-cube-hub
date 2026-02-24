"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
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
              <h1 className="text-2xl font-bold text-foreground">
                {profile.display_name}
              </h1>
              {(followerCount !== undefined || followingCount !== undefined) && (
                <div className="mt-1 flex items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                  <span>
                    <span className="font-semibold text-foreground">{followerCount ?? 0}</span>{" "}
                    {followerCount === 1 ? "follower" : "followers"}
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">{followingCount ?? 0}</span>{" "}
                    following
                  </span>
                </div>
              )}
            </div>
            {isOwner ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="min-h-9 gap-1.5 border-border/50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
            ) : (
              followButton
            )}
          </div>
          {profile.bio && (
            <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              {profile.bio}
            </p>
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
    </>
  )
}
