"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UserPlus, UserCheck } from "lucide-react"
import { followUser, unfollowUser } from "@/lib/actions/follows"

export function FollowButton({
  targetUserId,
  initialIsFollowing,
}: {
  targetUserId: string
  initialIsFollowing: boolean
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)

    if (following) {
      const result = await unfollowUser(targetUserId)
      if (result.success) {
        setFollowing(false)
        router.refresh()
      }
    } else {
      const result = await followUser(targetUserId)
      if (result.success) {
        setFollowing(true)
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant={following ? "outline" : "default"}
      size="sm"
      className={`min-h-9 gap-1.5 ${
        following
          ? "border-border/50"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      {following ? (
        <>
          <UserCheck className="h-3.5 w-3.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </Button>
  )
}
