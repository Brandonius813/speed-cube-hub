"use client"

import { useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

export type ProfileTab = "pbs" | "stats" | "overview" | "cubes" | "official"

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "pbs", label: "PBs" },
  { id: "stats", label: "Stats" },
  { id: "overview", label: "Overview" },
  { id: "cubes", label: "Main Puzzles" },
  { id: "official", label: "Official Results" },
]

const SWIPE_THRESHOLD = 60

export function ProfileTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: ProfileTab
  onTabChange?: (tab: ProfileTab) => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const touchStartX = useRef<number | null>(null)

  const setTab = useCallback(
    (tab: ProfileTab) => {
      onTabChange?.(tab)
      const params = new URLSearchParams(searchParams.toString())
      if (tab === "overview") {
        params.delete("tab")
      } else {
        params.set("tab", tab)
      }
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : "?", { scroll: false })
    },
    [onTabChange, router, searchParams]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const deltaX = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null

      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return

      const currentIndex = TABS.findIndex((t) => t.id === activeTab)
      if (deltaX > 0 && currentIndex > 0) {
        setTab(TABS[currentIndex - 1].id)
      } else if (deltaX < 0 && currentIndex < TABS.length - 1) {
        setTab(TABS[currentIndex + 1].id)
      }
    },
    [activeTab, setTab]
  )

  return (
    <div
      data-onboarding-target="profile-tabs"
      className="flex w-full overflow-x-auto border-b border-border/50 scrollbar-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={cn(
            "relative min-w-0 flex-1 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:px-5",
            activeTab === tab.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  )
}

/** Parse the ?tab= param from the URL. Defaults to "overview" if missing/invalid. */
export function parseTabParam(tab: string | null | undefined): ProfileTab {
  const valid: ProfileTab[] = ["pbs", "stats", "overview", "cubes", "official"]
  if (tab && valid.includes(tab as ProfileTab)) return tab as ProfileTab
  return "overview"
}
