"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { Users, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  joinChallenge,
  leaveChallenge,
  getChallengeProgress,
} from "@/lib/actions/challenges"
import type { Challenge } from "@/lib/types"

const TYPE_LABELS: Record<Challenge["type"], string> = {
  solves: "solves",
  time: "minutes",
  streak: "days",
  events: "events",
}

const TYPE_DESCRIPTIONS: Record<Challenge["type"], (target: number) => string> =
  {
    solves: (t) => `Log ${t.toLocaleString()} solves`,
    time: (t) => `Practice for ${t.toLocaleString()} minutes`,
    streak: (t) => `Practice ${t} different days`,
    events: (t) => `Practice ${t} different events`,
  }

export function ChallengeCard({
  challenge,
  currentUserId,
  onUpdate,
  isPast = false,
}: {
  challenge: Challenge
  currentUserId: string | null
  onUpdate: (updated: Challenge) => void
  isPast?: boolean
}) {
  const [joining, setJoining] = useState(false)
  const [progress, setProgress] = useState<number | undefined>(
    challenge.user_progress
  )
  const [loadingProgress, setLoadingProgress] = useState(false)

  // Load progress when the user has joined
  useEffect(() => {
    if (challenge.has_joined && currentUserId && progress === undefined) {
      setLoadingProgress(true)
      getChallengeProgress(challenge.id).then((result) => {
        setProgress(result.progress)
        setLoadingProgress(false)
      }).catch(() => {
        setLoadingProgress(false)
      })
    }
  }, [challenge.has_joined, challenge.id, currentUserId, progress])

  async function handleJoin() {
    if (!currentUserId || joining) return
    setJoining(true)

    const result = await joinChallenge(challenge.id)
    if (result.success) {
      onUpdate({
        ...challenge,
        has_joined: true,
        participant_count: challenge.participant_count + 1,
      })
      // Load progress after joining
      const progressResult = await getChallengeProgress(challenge.id)
      setProgress(progressResult.progress)
    }
    setJoining(false)
  }

  async function handleLeave() {
    if (!currentUserId || joining) return
    setJoining(true)

    const result = await leaveChallenge(challenge.id)
    if (result.success) {
      onUpdate({
        ...challenge,
        has_joined: false,
        participant_count: Math.max(0, challenge.participant_count - 1),
      })
      setProgress(undefined)
    }
    setJoining(false)
  }

  const progressPercent =
    progress !== undefined && challenge.target_value > 0
      ? Math.min(100, Math.round((progress / challenge.target_value) * 100))
      : 0

  const isCompleted =
    progress !== undefined && progress >= challenge.target_value

  const startDate = format(parseISO(challenge.start_date), "MMM d")
  const endDate = format(parseISO(challenge.end_date), "MMM d")

  return (
    <div
      className={`rounded-lg border border-border/50 bg-card p-4 sm:p-5 ${
        isPast ? "opacity-60" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
              {challenge.title}
            </h3>
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            )}
          </div>
          {challenge.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {challenge.description}
            </p>
          )}
        </div>

        {/* Join/Leave button */}
        {currentUserId && !isPast && (
          <div className="shrink-0">
            {challenge.has_joined ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                disabled={joining}
                className="min-h-11 min-w-[80px] border-border/50 text-muted-foreground hover:border-destructive hover:text-destructive sm:min-h-0"
              >
                {joining ? "..." : "Joined"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleJoin}
                disabled={joining}
                className="min-h-11 min-w-[80px] bg-primary text-primary-foreground hover:bg-primary/90 sm:min-h-0"
              >
                {joining ? "..." : "Join"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
        <span>
          {startDate} &ndash; {endDate}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span className="font-mono">
            {challenge.participant_count}
          </span>{" "}
          participant{challenge.participant_count !== 1 ? "s" : ""}
        </span>
        <span className="font-medium text-foreground/70">
          {TYPE_DESCRIPTIONS[challenge.type](challenge.target_value)}
        </span>
      </div>

      {/* Progress bar (only if user has joined) */}
      {challenge.has_joined && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Your progress</span>
            <span className="font-mono">
              {loadingProgress
                ? "..."
                : `${(progress ?? 0).toLocaleString()} / ${challenge.target_value.toLocaleString()} ${TYPE_LABELS[challenge.type]}`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isCompleted && (
            <p className="mt-1.5 text-xs font-medium text-green-500">
              Challenge completed!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
