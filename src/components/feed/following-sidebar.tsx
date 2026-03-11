"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users } from "lucide-react"
import type { FollowListUser } from "@/lib/actions/follows"
import type { Club } from "@/lib/types"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function FollowingSidebar({
  following,
  clubs,
}: {
  following: FollowListUser[]
  clubs: Club[]
}) {
  if (following.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4" />
            Following
          </h2>
          <p className="text-sm text-muted-foreground">
            You&apos;re not following anyone yet.
          </p>
          <Link
            href="/discover"
            className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80"
          >
            Discover cubers
          </Link>
        </div>

        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Your Clubs</h2>
          {clubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Join or create a club to keep a faster path back here.
            </p>
          ) : (
            <div className="space-y-2">
              {clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/clubs/${club.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-9 w-9 border border-border/50">
                    {club.avatar_url ? <AvatarImage src={club.avatar_url} alt={club.name} /> : null}
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(club.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{club.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{club.visibility}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/clubs"
            className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
          >
            Browse clubs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4" />
          Following ({following.length})
        </h2>
        <div className="flex flex-col gap-1">
          {following.map((user) => (
            <Link
              key={user.id}
              href={`/profile/${user.handle}`}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              <Avatar className="h-8 w-8 border border-border/50">
                {user.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={user.display_name} />
                )}
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(user.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.display_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{user.handle}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <Link
          href="/discover"
          className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
        >
          Discover more cubers
        </Link>
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Your Clubs</h2>
        {clubs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Join or create a club to keep a faster path back here.
          </p>
        ) : (
          <div className="space-y-2">
            {clubs.map((club) => (
              <Link
                key={club.id}
                href={`/clubs/${club.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-9 w-9 border border-border/50">
                  {club.avatar_url ? <AvatarImage src={club.avatar_url} alt={club.name} /> : null}
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(club.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{club.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{club.visibility}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link
          href="/clubs"
          className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
        >
          Browse clubs
        </Link>
      </div>
    </div>
  )
}
