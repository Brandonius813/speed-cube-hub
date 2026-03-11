"use client"

import { useState } from "react"
import Link from "next/link"
import { Compass, Sparkles, Users } from "lucide-react"
import { ChallengeCard } from "@/components/challenges/challenge-card"
import { Button } from "@/components/ui/button"
import { FeedComposer } from "@/components/feed/feed-composer"
import { FeedEntryCard } from "@/components/feed/feed-entry-card"
import { getFeed } from "@/lib/actions/feed"
import type { Challenge, FeedEntry } from "@/lib/types"

type FeedMode = "following" | "explore"

export function FeedContent({
  initialItems,
  initialHighlights,
  initialCursor,
  currentUserId,
}: {
  initialItems: FeedEntry[]
  initialHighlights: Challenge[]
  initialCursor: string | null
  currentUserId: string | null
}) {
  const [items, setItems] = useState(initialItems)
  const [highlights, setHighlights] = useState(initialHighlights)
  const [cursor, setCursor] = useState(initialCursor)
  const [mode, setMode] = useState<FeedMode>("following")
  const [loading, setLoading] = useState(false)

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
      <div className="space-y-4">
        <div className="flex gap-2 rounded-full border border-border/50 bg-card p-1">
          <button
            type="button"
            onClick={() => void handleModeChange("explore")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
              mode === "explore"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="h-4 w-4" />
            Explore
          </button>
          <button
            type="button"
            onClick={() => void handleModeChange("following")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
              mode === "following"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Following
          </button>
        </div>

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

        {highlights.length > 0 ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Challenge Spotlight
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                High-signal community goals that deserve to spill into the home feed.
              </p>
            </div>
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
                : "There are no recommended posts yet. Seed preview data or follow active cubers."}
            </p>
          </div>
          <Link href="/discover">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Discover Cubers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-full border border-border/50 bg-card p-1">
        <button
          type="button"
          onClick={() => void handleModeChange("explore")}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
            mode === "explore"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="h-4 w-4" />
          Explore
        </button>
        <button
          type="button"
          onClick={() => void handleModeChange("following")}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
            mode === "following"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Following
        </button>
      </div>

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

      {highlights.length > 0 ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Challenge Spotlight
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Official and club challenges with enough signal to belong in the main feed.
            </p>
          </div>
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
      ) : null}

      {items.map((item) => (
        <FeedEntryCard key={`${item.entry_type}-${item.id}`} entry={item} currentUserId={currentUserId} />
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
  )
}
