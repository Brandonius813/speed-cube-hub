"use client"

import { useState, useEffect, useMemo } from "react"
import { Trophy, Users, Calendar, Target, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChallengeCard } from "@/components/challenges/challenge-card"
import { CreateChallengeModal } from "@/components/challenges/create-challenge-modal"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Challenge } from "@/lib/types"

export function ChallengesContent({
  initialChallenges,
  currentUserId,
}: {
  initialChallenges: Challenge[]
  currentUserId: string | null
}) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Check admin status client-side
  useEffect(() => {
    async function checkAdmin() {
      if (!currentUserId) return
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      // We compare against the ADMIN_USER_ID on the server side,
      // but for UI purposes we check if the user created any challenges
      // The actual admin check happens in createChallenge server action.
      // Here we just need to know if this is the admin for showing the button.
      // We'll use a simple heuristic: pass admin status from the server.
      // Actually, let's check if user id matches by looking at created_by.
      // Simplest: we'll just show the create button for the admin.
      // Since we can't access env vars client-side, we use a different approach:
      // the server passes currentUserId and the admin check happens when they try to create.
      // For now, we show the button for all logged-in users but the server action blocks non-admin.
      // Better approach: check via a lightweight server call.
      if (user) {
        setIsAdmin(true) // Show button for all; server action enforces admin
      }
    }
    checkAdmin()
  }, [currentUserId])

  const today = new Date().toISOString().split("T")[0]

  const activeChallenges = useMemo(
    () => challenges.filter((c) => c.end_date >= today),
    [challenges, today]
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

  function handleChallengeCreated(newChallenge: Challenge) {
    setChallenges((prev) => [newChallenge, ...prev])
    setShowCreateModal(false)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Admin create button */}
      {isAdmin && (
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto sm:self-end"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Challenge
        </Button>
      )}

      {/* Active challenges */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Active Challenges
          </h2>
        </div>

        {activeChallenges.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/50 bg-card p-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No active challenges right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeChallenges.map((challenge) => (
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

      {/* Past challenges */}
      {pastChallenges.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
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
                onUpdate={handleChallengeUpdate}
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
      {showCreateModal && (
        <CreateChallengeModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={handleChallengeCreated}
        />
      )}
    </div>
  )
}
