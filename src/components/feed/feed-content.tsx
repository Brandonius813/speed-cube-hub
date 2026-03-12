"use client"

import { Fragment, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Compass, Shield, Sparkles, Users } from "lucide-react"
import { AdSlot } from "@/components/ads/ad-slot"
import { ChallengeCard } from "@/components/challenges/challenge-card"
import { FeedComposer } from "@/components/feed/feed-composer"
import { FeedEntryCard } from "@/components/feed/feed-entry-card"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { Button } from "@/components/ui/button"
import { getFeed } from "@/lib/actions/feed"
import { ONBOARDING_TOURS, parseOnboardingTour } from "@/lib/onboarding"
import type { Challenge, FeedEntry } from "@/lib/types"

type FeedMode = "following" | "explore" | "clubs"

const tabs: { id: FeedMode; label: string; icon: typeof Compass }[] = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "following", label: "Following", icon: Users },
  { id: "clubs", label: "Clubs", icon: Shield },
]

export function FeedContent({
  initialItems,
  initialHighlights,
  initialCursor,
  currentUserId,
  showAds,
  feedInlineSlot,
}: {
  initialItems: FeedEntry[]
  initialHighlights: Challenge[]
  initialCursor: string | null
  currentUserId: string | null
  showAds: boolean
  feedInlineSlot: string | null
}) {
  const [items, setItems] = useState(initialItems)
  const [highlights, setHighlights] = useState(initialHighlights)
  const [cursor, setCursor] = useState(initialCursor)
  const [mode, setMode] = useState<FeedMode>("following")
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTour = parseOnboardingTour(searchParams.get("tour"))
  const feedTour = activeTour === "feed" ? activeTour : null

  function shouldRenderFeedAd(index: number) {
    return showAds && !!feedInlineSlot && index >= 2 && (index - 2) % 8 === 0
  }

  function clearTour() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tour")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  async function load(nextMode: FeedMode, nextCursor?: string | null, replace = false) {
    setLoading(true)
    try {
      const result = await getFeed({
        mode: nextMode,
        cursor: nextCursor ?? null,
      })

      if (replace) {
        setItems(result.items)
        setHighlights(result.highlights)
      } else {
        setItems((prev) => [...prev, ...result.items])
      }
      setCursor(result.nextCursor)
    } finally {
      setLoading(false)
    }
  }

  async function handleModeChange(nextMode: FeedMode) {
    if (nextMode === mode || loading) return
    setMode(nextMode)
    setCursor(null)
    setItems([])
    await load(nextMode, null, true)
  }

  if (items.length === 0 && !loading) {
    return (
      <>
        <div data-onboarding-target="feed-column" className="space-y-4">
          <div className="flex justify-end lg:absolute lg:right-0 lg:top-0 lg:z-10 lg:w-64">
            {currentUserId ? (
              <FeedComposer
                onCreated={(post) =>
                  setItems((prev) => [
                    {
                      ...post,
                      entry_type: "post",
                      entry_created_at: post.created_at,
                    },
                    ...prev,
                  ])
                }
              />
            ) : null}
          </div>

          <div className="flex gap-2 rounded-full border border-border/50 bg-card p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => void handleModeChange(id)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                  mode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {highlights.length > 0 ? (
            <div className="rounded-[1.75rem] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(24,24,27,0.96))] p-4 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.8)]">
              <div className="mb-4 rounded-2xl border border-amber-500/15 bg-black/10 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100">Challenges</p>
              </div>
              <div className="space-y-3">
                {highlights.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    currentUserId={currentUserId}
                    onUpdate={(updatedChallenge) =>
                      setHighlights((prev) =>
                        prev.map((challengeItem) =>
                          challengeItem.id === updatedChallenge.id ? updatedChallenge : challengeItem
                        )
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card p-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {mode === "following" ? "Your feed is empty" : "Explore is warming up"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "following"
                  ? "Follow more cubers or publish your first training update."
                  : mode === "clubs"
                    ? "Join a club or post into one to get this tab moving."
                    : "There are no recommended posts yet. Seed preview data or follow active cubers."}
              </p>
            </div>
            <Link href="/discover" data-onboarding-target="feed-highlight">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Discover Cubers
              </Button>
            </Link>
          </div>
        </div>

        {feedTour && (
          <OnboardingTour
            key={feedTour}
            open
            steps={ONBOARDING_TOURS[feedTour]}
            onClose={clearTour}
            onSkip={clearTour}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div data-onboarding-target="feed-column" className="flex flex-col gap-4">
        <div className="flex justify-end lg:absolute lg:right-0 lg:top-0 lg:z-10 lg:w-64">
          {currentUserId ? (
            <FeedComposer
              onCreated={(post) =>
                setItems((prev) => [
                  {
                    ...post,
                    entry_type: "post",
                    entry_created_at: post.created_at,
                  },
                  ...prev,
                ])
              }
            />
          ) : null}
        </div>

        <div className="flex gap-2 rounded-full border border-border/50 bg-card p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => void handleModeChange(id)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                mode === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {highlights.length > 0 ? (
          <div className="rounded-[1.75rem] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(24,24,27,0.96))] p-4 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.8)]">
            <div className="mb-4 rounded-2xl border border-amber-500/15 bg-black/10 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-100">Challenges</p>
            </div>
            <div className="space-y-3">
              {highlights.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUserId={currentUserId}
                  onUpdate={(updatedChallenge) =>
                    setHighlights((prev) =>
                      prev.map((challengeItem) =>
                        challengeItem.id === updatedChallenge.id ? updatedChallenge : challengeItem
                      )
                    )
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {items.map((item, index) => (
          <Fragment key={`${item.entry_type}-${item.id}`}>
            <div
              data-onboarding-target={index === 0 ? "feed-highlight" : undefined}
            >
              <FeedEntryCard entry={item} currentUserId={currentUserId} />
            </div>
            {shouldRenderFeedAd(index) ? (
              <AdSlot
                slotId={feedInlineSlot}
                className="mt-1"
                minHeight={250}
              />
            ) : null}
          </Fragment>
        ))}

        {cursor ? (
          <Button
            variant="outline"
            onClick={() => void load(mode, cursor)}
            disabled={loading}
            className="mx-auto min-h-11 w-full max-w-xs border-border/50"
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        ) : null}
      </div>

      {feedTour && (
        <OnboardingTour
          key={feedTour}
          open
          steps={ONBOARDING_TOURS[feedTour]}
          onClose={clearTour}
          onSkip={clearTour}
        />
      )}
    </>
  )
}
