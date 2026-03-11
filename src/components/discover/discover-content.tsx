"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Calendar, MapPin, Search, Star, UserCheck, UserPlus, VolumeX } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FeedEntryCard } from "@/components/feed/feed-entry-card"
import { joinClub, leaveClub } from "@/lib/actions/club-mutations"
import {
  favoriteUser,
  muteUser,
  unfavoriteUser,
  unmuteUser,
} from "@/lib/actions/follows"
import { searchAll } from "@/lib/actions/profiles"
import { FollowButton } from "@/components/profile/follow-button"
import { WCA_EVENTS } from "@/lib/constants"
import type { FeedEntry, Profile, SearchResults, SearchTab } from "@/lib/types"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getEventLabel(eventId: string) {
  return WCA_EVENTS.find((event) => event.id === eventId)?.label || eventId
}

function PeopleCard({
  profile,
  currentUserId,
  isFollowing,
  isFavorite,
  isMuted,
  onFollowChange,
  onFollowToggle,
  onFavoriteToggle,
  onMuteToggle,
  previewMode,
}: {
  profile: Profile
  currentUserId: string | null
  isFollowing: boolean
  isFavorite: boolean
  isMuted: boolean
  onFollowChange: (value: boolean) => void
  onFollowToggle: () => void
  onFavoriteToggle: () => void
  onMuteToggle: () => void
  previewMode: boolean
}) {
  return (
    <Link href={`/profile/${profile.handle}`}>
      <Card className="border-border/50 bg-card transition-colors hover:border-primary/30">
        <CardContent className="flex items-center gap-3 p-4">
          <Avatar className="h-12 w-12 shrink-0 border border-primary/20">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 font-bold text-primary">
              {getInitials(profile.display_name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-foreground">{profile.display_name}</p>
              {profile.main_events?.slice(0, 1).map((event) => (
                <Badge
                  key={event}
                  variant="outline"
                  className="border-border/50 bg-secondary/50 text-xs"
                >
                  {getEventLabel(event)}
                </Badge>
              ))}
              {isFavorite ? (
                <Badge className="bg-amber-500/15 text-amber-300">Favorite</Badge>
              ) : null}
              {isMuted ? (
                <Badge variant="outline" className="border-border/50 text-muted-foreground">
                  Muted
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">@{profile.handle}</p>
            {profile.location ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </p>
            ) : null}
            {profile.bio ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {profile.bio}
              </p>
            ) : null}
          </div>

          {currentUserId && currentUserId !== profile.id ? (
            <div
              className="flex shrink-0 flex-col gap-2"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              {previewMode ? (
                <Button
                  type="button"
                  onClick={onFollowToggle}
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  className={`min-h-9 gap-1.5 ${
                    isFollowing
                      ? "border-border/50"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isFollowing ? (
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
              ) : (
                <FollowButton
                  targetUserId={profile.id}
                  initialIsFollowing={isFollowing}
                  onFollowChange={onFollowChange}
                />
              )}
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={onFavoriteToggle}>
                  <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-current text-amber-300" : ""}`} />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onMuteToggle}>
                  <VolumeX className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}

export function DiscoverContent({
  initialResults,
  currentUserId,
  initialFollowingIds,
  initialFavoriteIds,
  initialMutedIds,
}: {
  initialResults: SearchResults
  currentUserId: string | null
  initialFollowingIds: string[]
  initialFavoriteIds: string[]
  initialMutedIds: string[]
}) {
  const previewMode = process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_MODE === "1"
  const [results, setResults] = useState(initialResults)
  const [tab, setTab] = useState<SearchTab>("all")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [followingIds, setFollowingIds] = useState(new Set(initialFollowingIds))
  const [favoriteIds, setFavoriteIds] = useState(new Set(initialFavoriteIds))
  const [mutedIds, setMutedIds] = useState(new Set(initialMutedIds))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function queueSearch(nextQuery: string) {
    setQuery(nextQuery)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await searchAll(nextQuery)
        setResults(result.results)
      } finally {
        setLoading(false)
      }
    }, 250)
  }

  async function handleFavoriteToggle(profileId: string) {
    if (previewMode) {
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (next.has(profileId)) next.delete(profileId)
        else next.add(profileId)
        return next
      })
      return
    }

    const isFavorite = favoriteIds.has(profileId)
    const result = isFavorite
      ? await unfavoriteUser(profileId)
      : await favoriteUser(profileId)

    if (result.success) {
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFavorite) {
          next.delete(profileId)
        } else {
          next.add(profileId)
        }
        return next
      })
    }
  }

  async function handleMuteToggle(profileId: string) {
    if (previewMode) {
      setMutedIds((prev) => {
        const next = new Set(prev)
        if (next.has(profileId)) next.delete(profileId)
        else next.add(profileId)
        return next
      })
      return
    }

    const isMuted = mutedIds.has(profileId)
    const result = isMuted ? await unmuteUser(profileId) : await muteUser(profileId)

    if (result.success) {
      setMutedIds((prev) => {
        const next = new Set(prev)
        if (isMuted) {
          next.delete(profileId)
        } else {
          next.add(profileId)
        }
        return next
      })
    }
  }

  async function handleJoinLeave(clubId: string, isMember: boolean) {
    if (previewMode) {
      setResults((prev) => ({
        ...prev,
        clubs: prev.clubs.map((club) =>
          club.id === clubId
            ? {
                ...club,
                is_member: !isMember,
                member_count: isMember ? club.member_count - 1 : club.member_count + 1,
              }
            : club
        ),
      }))
      return
    }

    const result = isMember ? await leaveClub(clubId) : await joinClub(clubId)
    if (!result.success) return
    setResults((prev) => ({
      ...prev,
      clubs: prev.clubs.map((club) =>
        club.id === clubId
          ? {
              ...club,
              is_member: !isMember,
              member_count: isMember ? club.member_count - 1 : club.member_count + 1,
            }
          : club
      ),
    }))
  }

  function renderPeople(profiles: Profile[]) {
    if (profiles.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">No people found.</p>
    }

    return (
      <div className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <PeopleCard
            key={profile.id}
            profile={profile}
            currentUserId={currentUserId}
            isFollowing={followingIds.has(profile.id)}
            isFavorite={favoriteIds.has(profile.id)}
            isMuted={mutedIds.has(profile.id)}
            onFollowChange={(value) =>
              setFollowingIds((prev) => {
                const next = new Set(prev)
                if (value) next.add(profile.id)
                else next.delete(profile.id)
                return next
              })
            }
            onFollowToggle={() =>
              setFollowingIds((prev) => {
                const next = new Set(prev)
                if (next.has(profile.id)) next.delete(profile.id)
                else next.add(profile.id)
                return next
              })
            }
            onFavoriteToggle={() => void handleFavoriteToggle(profile.id)}
            onMuteToggle={() => void handleMuteToggle(profile.id)}
            previewMode={previewMode}
          />
        ))}
      </div>
    )
  }

  function renderPosts() {
    if (results.posts.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">No posts found.</p>
    }

    const entries: FeedEntry[] = results.posts.map((post) => ({
      ...post,
      entry_type: "post",
      entry_created_at: post.created_at,
    }))

    return (
      <div className="flex flex-col gap-4">
        {entries.map((entry) => (
          <FeedEntryCard key={entry.id} entry={entry} currentUserId={currentUserId} />
        ))}
      </div>
    )
  }

  function renderClubs() {
    if (results.clubs.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">No clubs found.</p>
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {results.clubs.map((club) => (
          <Card key={club.id} className="border-border/50 bg-card">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/clubs/${club.id}`}
                    className="text-lg font-semibold text-foreground hover:text-primary"
                  >
                    {club.name}
                  </Link>
                  {club.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {club.description}
                    </p>
                  ) : null}
                </div>
                <Badge variant="outline" className="border-border/50 bg-secondary/50">
                  {club.visibility}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{club.member_count} members</span>
                {currentUserId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={club.is_member ? "outline" : "default"}
                    onClick={() => void handleJoinLeave(club.id, club.is_member)}
                  >
                    {club.is_member ? "Joined" : "Join"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  function renderEvents() {
    if (results.events.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">No events found.</p>
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {results.events.map((event) => (
          <a
            key={event.id}
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-border/50 bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{event.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.city}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(event.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(event.end_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    )
  }

  const tabs: { id: SearchTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "people", label: "People" },
    { id: "posts", label: "Posts" },
    { id: "clubs", label: "Clubs" },
    { id: "events", label: "Events" },
  ]

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => queueSearch(event.target.value)}
          placeholder="Search people, posts, clubs, and upcoming comps..."
          className="min-h-12 pl-10"
        />
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-full border border-border/50 bg-card p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors ${
                tab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Searching...</p> : null}

      {tab === "all" ? (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">People</h2>
            {renderPeople(results.profiles.slice(0, 4))}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Posts</h2>
            {renderPosts()}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Clubs</h2>
            {renderClubs()}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Events</h2>
            {renderEvents()}
          </section>
        </div>
      ) : null}

      {tab === "people" ? renderPeople(results.profiles) : null}
      {tab === "posts" ? renderPosts() : null}
      {tab === "clubs" ? renderClubs() : null}
      {tab === "events" ? renderEvents() : null}
    </div>
  )
}
