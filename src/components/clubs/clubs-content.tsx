"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { Search, Plus, Users, Shield } from "lucide-react"
import { markOnboardingStepComplete } from "@/lib/actions/onboarding"
import { getClubs } from "@/lib/actions/clubs"
import { joinClub, leaveClub } from "@/lib/actions/club-mutations"
import { CreateClubModal } from "@/components/clubs/create-club-modal"
import {
  ONBOARDING_TOURS,
  parseOnboardingTour,
  shouldTrackClubSearch,
} from "@/lib/onboarding"
import type { Club } from "@/lib/types"

export function ClubsContent({
  initialClubs,
  currentUserId,
}: {
  initialClubs: Club[]
  currentUserId: string | null
}) {
  const [clubs, setClubs] = useState(initialClubs)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSearching, startSearch] = useTransition()
  const [joiningClubId, setJoiningClubId] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTour = parseOnboardingTour(searchParams.get("tour"))
  const clubsTour = activeTour === "clubs-search" ? activeTour : null

  function handleSearch(query: string) {
    setSearchQuery(query)
    startSearch(async () => {
      const result = await getClubs(query || undefined)
      setClubs(result.clubs)
      if (shouldTrackClubSearch(query)) {
        await markOnboardingStepComplete("clubs_searched")
      }
    })
  }

  function clearTour() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tour")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  async function handleJoinLeave(clubId: string, isMember: boolean) {
    if (!currentUserId) return
    setJoiningClubId(clubId)

    const result = isMember
      ? await leaveClub(clubId)
      : await joinClub(clubId)

    if (result.success) {
      setClubs((prev) =>
        prev.map((c) =>
          c.id === clubId
            ? {
                ...c,
                is_member: !isMember,
                member_count: isMember ? c.member_count - 1 : c.member_count + 1,
                user_role: isMember ? null : "member",
              }
            : c
        )
      )
    }
    setJoiningClubId(null)
  }

  function handleClubCreated() {
    setShowCreateModal(false)
    // Refresh the club list
    startSearch(async () => {
      const result = await getClubs(searchQuery || undefined)
      setClubs(result.clubs)
    })
  }

  return (
    <>
      {/* Search + Create */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-onboarding-target="clubs-search"
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Club
        </Button>
      </div>

      {/* Loading state */}
      {isSearching && (
        <p className="mb-4 text-sm text-muted-foreground">Searching...</p>
      )}

      {/* Club grid */}
      {clubs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-card p-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {searchQuery ? "No clubs found" : "No clubs yet"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery
                ? "Try a different search term."
                : "Be the first to create a club!"}
            </p>
          </div>
          {!searchQuery && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Club
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clubs.map((club) => (
            <Card key={club.id} className="border-border/50 bg-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/clubs/${club.id}`} className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-foreground hover:text-primary transition-colors">
                      {club.name}
                    </h3>
                    {club.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {club.description}
                      </p>
                    )}
                  </Link>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="font-mono">{club.member_count}</span>
                    <span>{club.member_count === 1 ? "member" : "members"}</span>
                  </div>

                  {currentUserId && (
                    <Button
                      size="sm"
                      variant={club.is_member ? "outline" : "default"}
                      disabled={joiningClubId === club.id}
                      onClick={() => handleJoinLeave(club.id, club.is_member)}
                      className={
                        club.is_member
                          ? "border-border/50"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }
                    >
                      {joiningClubId === club.id
                        ? "..."
                        : club.is_member
                          ? "Joined"
                          : "Join"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create club modal */}
      <CreateClubModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={handleClubCreated}
      />

      {clubsTour && (
        <OnboardingTour
          key={clubsTour}
          open
          steps={ONBOARDING_TOURS[clubsTour]}
          onClose={clearTour}
          onSkip={clearTour}
        />
      )}
    </>
  )
}
