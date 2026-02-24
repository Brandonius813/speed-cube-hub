"use client"

import { useState, useOptimistic, useTransition } from "react"
import { Heart } from "lucide-react"
import { likeSession, unlikeSession } from "@/lib/actions/likes"
import { cn } from "@/lib/utils"

export function LikeButton({
  sessionId,
  initialCount,
  initialHasLiked,
}: {
  sessionId: string
  initialCount: number
  initialHasLiked: boolean
}) {
  const [count, setCount] = useState(initialCount)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [isPending, startTransition] = useTransition()

  // Optimistic state for instant UI feedback
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(hasLiked)
  const [optimisticCount, setOptimisticCount] = useOptimistic(count)

  function handleClick() {
    const newLiked = !optimisticLiked
    const newCount = newLiked ? count + 1 : Math.max(0, count - 1)

    startTransition(async () => {
      // Apply optimistic update immediately
      setOptimisticLiked(newLiked)
      setOptimisticCount(newCount)

      const result = newLiked
        ? await likeSession(sessionId)
        : await unlikeSession(sessionId)

      if (result.success) {
        // Commit the optimistic state
        setHasLiked(newLiked)
        setCount(newCount)
      }
      // If it fails, the optimistic state will revert automatically
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-secondary/50 active:scale-95",
        optimisticLiked
          ? "text-red-500"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-label={optimisticLiked ? "Unlike session" : "Like session"}
    >
      <Heart
        className={cn(
          "h-4.5 w-4.5 transition-all",
          optimisticLiked && "fill-red-500"
        )}
      />
      {optimisticCount > 0 && (
        <span className="font-mono text-xs font-medium">{optimisticCount}</span>
      )}
    </button>
  )
}
