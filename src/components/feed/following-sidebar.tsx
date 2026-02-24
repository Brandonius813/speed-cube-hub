"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users } from "lucide-react"
import type { FollowListUser } from "@/lib/actions/follows"

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
}: {
  following: FollowListUser[]
}) {
  if (following.length === 0) {
    return (
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
    )
  }

  return (
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
  )
}
