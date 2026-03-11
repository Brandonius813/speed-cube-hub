"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { CheckCircle2, Pencil, Shield, Swords, Target, Trash2, Users } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  deleteChallenge,
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

function ChallengeArt({
  scope,
  completed,
}: {
  scope: Challenge["scope"]
  completed: boolean
}) {
  const Icon = scope === "club" ? Swords : Shield

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.26),rgba(15,23,42,0.16))] shadow-[0_18px_40px_-26px_rgba(250,204,21,0.85)]">
      <div className="absolute inset-3 rounded-[1.2rem] border border-white/10 bg-black/15" />
      <Icon className="relative h-8 w-8 text-amber-200" />
      {completed ? (
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  )
}

export function ChallengeCard({
  challenge,
  currentUserId,
  canManage = false,
  onUpdate,
  onEdit,
  onDelete,
  isPast = false,
}: {
  challenge: Challenge
  currentUserId: string | null
  canManage?: boolean
  onUpdate: (updated: Challenge) => void
  onEdit?: (challenge: Challenge) => void
  onDelete?: (challengeId: string) => void
  isPast?: boolean
}) {
  const [joining, setJoining] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | undefined>(
    challenge.user_progress
  )

  // Load progress when the user has joined
  useEffect(() => {
    if (challenge.has_joined && currentUserId && progress === undefined) {
      let cancelled = false
      getChallengeProgress(challenge.id).then((result) => {
        if (cancelled) return
        setProgress(result.progress)
      }).catch(() => {
        if (cancelled) return
      })
      return () => {
        cancelled = true
      }
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

  async function handleDelete() {
    if (!canManage || deleting) return

    setDeleteError(null)
    setDeleting(true)

    const result = await deleteChallenge(challenge.id)
    if (!result.success) {
      setDeleteError(result.error ?? "Failed to delete challenge")
      setDeleting(false)
      return
    }

    onDelete?.(challenge.id)
    setDeleting(false)
  }

  const progressPercent =
    progress !== undefined && challenge.target_value > 0
      ? Math.min(100, Math.round((progress / challenge.target_value) * 100))
      : 0

  const isCompleted =
    progress !== undefined && progress >= challenge.target_value

  const startDate = format(parseISO(challenge.start_date), "MMM d")
  const endDate = format(parseISO(challenge.end_date), "MMM d")
  const showManageControls = canManage && challenge.scope === "official"

  return (
    <div
      className={`overflow-hidden rounded-[1.75rem] border border-border/50 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(18,18,22,0.96))] p-4 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.8)] sm:p-5 ${
        isPast ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <ChallengeArt scope={challenge.scope} completed={isCompleted} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-500/25 bg-amber-500/15 text-[10px] uppercase tracking-[0.22em] text-amber-100">
                {challenge.scope === "club" ? "Club Challenge" : "Official Challenge"}
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-background/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {challenge.type}
              </Badge>
            </div>

            <h3 className="mt-3 text-lg font-semibold text-foreground sm:text-xl">
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {challenge.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
              <span>
                {startDate} - {endDate}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="font-mono text-foreground">
                  {challenge.participant_count}
                </span>
                participant{challenge.participant_count !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-foreground/75">
                <Target className="h-3.5 w-3.5 text-amber-300" />
                {TYPE_DESCRIPTIONS[challenge.type](challenge.target_value)}
              </span>
            </div>
          </div>
        </div>

        {(showManageControls || (currentUserId && !isPast)) && (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {showManageControls ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(challenge)}
                  className="min-h-11 border-border/50 bg-background/50 sm:min-h-0"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 border-border/50 bg-background/50 text-destructive hover:border-destructive hover:text-destructive sm:min-h-0"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete challenge?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the challenge for everyone and also deletes all participant progress tied to it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={deleting}
                        onClick={handleDelete}
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : null}

            {currentUserId && !isPast ? (
              challenge.has_joined ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeave}
                  disabled={joining}
                  className="min-h-11 min-w-[96px] border-border/50 bg-background/50 text-muted-foreground hover:border-destructive hover:text-destructive sm:min-h-0"
                >
                  {joining ? "..." : "Joined"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleJoin}
                  disabled={joining}
                  className="min-h-11 min-w-[96px] bg-primary text-primary-foreground hover:bg-primary/90 sm:min-h-0"
                >
                  {joining ? "..." : "Join"}
                </Button>
              )
            ) : null}

            {deleteError ? (
              <p className="max-w-[240px] text-xs text-destructive sm:text-right">
                {deleteError}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {challenge.has_joined && (
        <div className="mt-4 rounded-2xl border border-border/50 bg-background/50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>Your progress</span>
              <span className="font-mono text-foreground">
              {progress === undefined
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
            <p className="mt-2 text-xs font-medium text-green-500">
              Challenge completed!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
