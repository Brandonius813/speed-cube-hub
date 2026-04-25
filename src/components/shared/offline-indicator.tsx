"use client"

import { useEffect, useState } from "react"
import { CloudOff, Loader2, RefreshCw, WifiOff } from "lucide-react"
import { useNetworkStatus } from "@/lib/hooks/use-network-status"
import {
  flushPendingSaves,
  subscribePendingCount,
} from "@/lib/timer/pending-saves"

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState<number | null>(null)

  useEffect(() => {
    return subscribePendingCount(setPendingCount)
  }, [])

  useEffect(() => {
    if (!isOnline || pendingCount === 0) return
    let cancelled = false
    void (async () => {
      setIsSyncing(true)
      try {
        const result = await flushPendingSaves()
        if (cancelled) return
        if (result.succeeded > 0) {
          setJustSynced(result.succeeded)
          window.setTimeout(() => {
            setJustSynced(null)
          }, 4000)
        }
      } finally {
        if (!cancelled) setIsSyncing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOnline, pendingCount])

  async function handleManualRetry() {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const result = await flushPendingSaves()
      if (result.succeeded > 0) {
        setJustSynced(result.succeeded)
        window.setTimeout(() => setJustSynced(null), 4000)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  if (isOnline && pendingCount === 0 && justSynced === null) return null

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm text-orange-200 shadow-lg backdrop-blur">
          <WifiOff size={16} aria-hidden />
          <span className="font-medium">Offline</span>
          {pendingCount > 0 && (
            <span className="text-xs text-orange-200/80">
              · {pendingCount} session{pendingCount === 1 ? "" : "s"} waiting to sync
            </span>
          )}
        </div>
      </div>
    )
  }

  if (justSynced !== null && pendingCount === 0) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/15 px-4 py-2 text-sm text-green-200 shadow-lg backdrop-blur">
          <span aria-hidden>✓</span>
          <span>
            Synced {justSynced} offline session{justSynced === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onClick={handleManualRetry}
        disabled={isSyncing}
        className="flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm text-blue-200 shadow-lg backdrop-blur transition hover:bg-blue-500/25 disabled:cursor-progress"
      >
        {isSyncing ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : (
          <CloudOff size={16} aria-hidden />
        )}
        <span className="font-medium">
          {pendingCount} session{pendingCount === 1 ? "" : "s"} pending
        </span>
        {!isSyncing && (
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-blue-200/80">
            <RefreshCw size={12} aria-hidden /> retry
          </span>
        )}
      </button>
    </div>
  )
}
