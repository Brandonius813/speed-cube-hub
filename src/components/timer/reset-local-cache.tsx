"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { clearLocalTimerCache } from "@/lib/timer/clear-local-cache"

export function ResetLocalCacheSection() {
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset() {
    const confirmed = window.confirm(
      "Reset this device's timer cache?\n\nYour solves are saved in your account and will reload from the server on the next page load. This only clears the local copy on this device."
    )
    if (!confirmed) return

    setError(null)
    setIsClearing(true)
    try {
      await clearLocalTimerCache()
      window.location.reload()
    } catch {
      setIsClearing(false)
      setError(
        "Couldn't fully clear the local cache. Try clearing site data in your browser settings."
      )
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
        Troubleshooting
      </label>
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-sm font-medium">Reset local cache</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Clears this device&apos;s saved solve cache, then reloads the page so the timer pulls fresh data from your account. Use this if the solve list shows duplicates, wrong session groupings, or counts that don&apos;t match your dashboard. Nothing on the server is touched.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isClearing}
          className="w-full"
        >
          {isClearing ? "Clearing…" : "Reset local cache"}
        </Button>
      </div>
    </div>
  )
}
