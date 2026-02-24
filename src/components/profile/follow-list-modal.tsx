"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getFollowers, getFollowing } from "@/lib/actions/follows"
import type { FollowListUser } from "@/lib/actions/follows"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function UserRow({ user }: { user: FollowListUser }) {
  return (
    <Link
      href={`/profile/${user.handle}`}
      className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
    >
      <Avatar className="h-10 w-10 border border-border/50">
        {user.avatar_url && (
          <AvatarImage src={user.avatar_url} alt={user.display_name} />
        )}
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
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
  )
}

export function FollowListModal({
  userId,
  open,
  onOpenChange,
  tab,
}: {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: "followers" | "following"
}) {
  const [activeTab, setActiveTab] = useState(tab)
  const [followers, setFollowers] = useState<FollowListUser[]>([])
  const [following, setFollowing] = useState<FollowListUser[]>([])
  const [loading, setLoading] = useState(false)

  // Sync tab when prop changes (e.g. user clicks different count)
  useEffect(() => {
    setActiveTab(tab)
  }, [tab])

  // Fetch data when modal opens
  useEffect(() => {
    if (!open) return

    async function fetchData() {
      setLoading(true)
      const [followersList, followingList] = await Promise.all([
        getFollowers(userId),
        getFollowing(userId),
      ])
      setFollowers(followersList)
      setFollowing(followingList)
      setLoading(false)
    }

    fetchData()
  }, [open, userId])

  const list = activeTab === "followers" ? followers : following

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {activeTab === "followers" ? "Followers" : "Following"}
          </DialogTitle>
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            <button
              onClick={() => setActiveTab("followers")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "followers"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Followers ({followers.length})
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "following"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Following ({following.length})
            </button>
          </div>
        </DialogHeader>

        <div className="-mx-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                {activeTab === "followers"
                  ? "No followers yet"
                  : "Not following anyone yet"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {list.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
