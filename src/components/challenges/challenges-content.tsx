"use client"

import { useMemo, useState } from "react"
import { Flag, Plus, Target, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChallengeCard } from "@/components/challenges/challenge-card"
import { CreateChallengeModal } from "@/components/challenges/create-challenge-modal"
import type { Challenge, Club } from "@/lib/types"

export function ChallengesContent({
  initialChallenges,
  currentUserId,
  isAdmin,
  availableClubs,
}: {
  initialChallenges: Challenge[]
  currentUserId: string | null
  isAdmin: boolean
  availableClubs: Club[]
}) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [modalChallenge, setModalChallenge] = useState<Challenge | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  const activeChallenges = useMemo(
    () => challenges.filter((c) => c.end_date >= today),
    [challenges, today]
  )
  const activeOfficialChallenges = useMemo(
    () => activeChallenges.filter((challenge) => challenge.scope === "official"),
    [activeChallenges]
  )
  const activeClubChallenges = useMemo(
    () => activeChallenges.filter((challenge) => challenge.scope === "club"),
    [activeChallenges]
  )

  const pastChallenges = useMemo(
    () => challenges.filter((c) => c.end_date < today),
    [challenges, today]
  )

  function handleChallengeUpdate(updatedChallenge: Challenge) {
    setChallenges((prev) =>
      prev.map((c) => (c.id === updatedChallenge.id ? updatedChallenge : c))
    )
  }

  function handleChallengeSaved(savedChallenge: Challenge) {
    setChallenges((prev) => {
      const existingIndex = prev.findIndex((challenge) => challenge.id === savedChallenge.id)
      if (existingIndex === -1) {
        return [savedChallenge, ...prev]
      }

      return prev.map((challenge) =>
        challenge.id === savedChallenge.id
          ? {
              ...savedChallenge,
              participant_count: challenge.participant_count,
              has_joined: challenge.has_joined,
              user_progress: challenge.user_progress,
            }
          : challenge
      )
    })
    setModalChallenge(null)
    setShowCreateModal(false)
  }

  function handleChallengeDeleted(challengeId: string) {
    setChallenges((prev) => prev.filter((challenge) => challenge.id !== challengeId))
    setModalChallenge((prev) => (prev?.id === challengeId ? null : prev))
  }

  return (
    <div className="flex flex-col gap-8">
      {isAdmin && (
        <section className="rounded-[1.5rem] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.18),rgba(24,24,27,0.88))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
                Super Admin
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                Manage whole-community challenges
              </h2>
              <p className="text-sm text-muted-foreground">
                Official challenges can be created, edited, or removed here no matter who originally added them.
              </p>
            </div>
            <Button
              onClick={() => {
                setModalChallenge(null)
                setShowCreateModal(true)
              }}
              className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Challenge
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="mb-1 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Official Challenges
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Whole-app community pushes that belong in the home feed and give everyone something to chase together.
        </p>

        {activeOfficialChallenges.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/50 bg-card p-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No official challenges are live right now.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeOfficialChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                currentUserId={currentUserId}
                canManage={isAdmin}
                onUpdate={handleChallengeUpdate}
                onEdit={setModalChallenge}
                onDelete={handleChallengeDeleted}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="mb-1 flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Club Challenges
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Smaller accountability loops for clubs and private groups.
        </p>

        {activeClubChallenges.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/50 bg-card p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No club challenges are active right now.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeClubChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                currentUserId={currentUserId}
                onUpdate={handleChallengeUpdate}
              />
            ))}
          </div>
        )}
      </section>

      {pastChallenges.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              Past Challenges
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {pastChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                currentUserId={currentUserId}
                canManage={isAdmin}
                onUpdate={handleChallengeUpdate}
                onEdit={setModalChallenge}
                onDelete={handleChallengeDeleted}
                isPast
              />
            ))}
          </div>
        </section>
      )}

      {/* No challenges at all */}
      {challenges.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              No challenges yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Community challenges will appear here when they are created.
            </p>
          </div>
        </div>
      )}

      {/* Create challenge modal */}
      {(showCreateModal || modalChallenge) && (
        <CreateChallengeModal
          key={modalChallenge?.id ?? "new-challenge"}
          open={showCreateModal || !!modalChallenge}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false)
              setModalChallenge(null)
            }
          }}
          challenge={modalChallenge}
          onSaved={handleChallengeSaved}
          clubs={availableClubs}
        />
      )}
    </div>
  )
}
