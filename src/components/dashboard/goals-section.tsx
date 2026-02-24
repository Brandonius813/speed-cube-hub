"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, Plus, Trash2, Pencil, Trophy, Clock, CalendarX2 } from "lucide-react"
import { GoalModal } from "@/components/dashboard/goal-modal"
import { deleteGoal, getGoals } from "@/lib/actions/goals"
import { WCA_EVENTS } from "@/lib/constants"
import type { Goal } from "@/lib/types"

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label ?? eventId
}

function GoalCard({
  goal,
  currentAvg,
  onEdit,
  onDeleted,
}: {
  goal: Goal
  currentAvg: number | null
  onEdit: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const isAchieved = goal.status === "achieved"
  const isExpired = goal.status === "expired"
  const isActive = goal.status === "active"

  // Calculate progress percentage (how close current avg is to target)
  // Since lower times are better, progress = how far you've come from start toward target
  let progressPercent = 0
  if (currentAvg !== null && isActive) {
    if (currentAvg <= goal.target_avg) {
      progressPercent = 100
    } else {
      // Show progress as percentage of how close to target
      // e.g., target is 15s, current avg is 20s — you're at 75% (15/20)
      progressPercent = Math.min(
        Math.round((goal.target_avg / currentAvg) * 100),
        99
      )
    }
  }

  // Days remaining
  const today = new Date()
  const targetDate = new Date(goal.target_date + "T00:00:00")
  const daysRemaining = Math.ceil(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  async function handleDelete() {
    setDeleting(true)
    await deleteGoal(goal.id)
    onDeleted()
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        isAchieved
          ? "border-green-500/30 bg-green-500/5"
          : isExpired
            ? "border-muted-foreground/20 bg-muted/5"
            : "border-border/50 bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isAchieved ? (
            <Trophy className="h-4 w-4 text-green-400" />
          ) : isExpired ? (
            <CalendarX2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Target className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-semibold text-foreground">
            Sub-{formatTime(goal.target_avg)}
          </span>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-xs text-primary"
          >
            {getEventLabel(goal.event)}
          </Badge>
        </div>
        {isActive && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Edit goal"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar for active goals */}
      {isActive && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {currentAvg !== null ? (
                <>
                  Current avg:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {formatTime(currentAvg)}
                  </span>
                </>
              ) : (
                "No sessions yet"
              )}
            </span>
            <span>
              Target:{" "}
              <span className="font-mono font-medium text-foreground">
                {formatTime(goal.target_avg)}
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressPercent}% there</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {daysRemaining > 0
                ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`
                : "Due today"}
            </span>
          </div>
        </div>
      )}

      {/* Status badges */}
      {isAchieved && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
          <Trophy className="h-3 w-3" />
          Goal achieved!
          {goal.achieved_at && (
            <span className="text-muted-foreground">
              {" "}
              — {new Date(goal.achieved_at).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
      {isExpired && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarX2 className="h-3 w-3" />
          Expired on {new Date(goal.target_date + "T00:00:00").toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

export function GoalsSection({
  initialGoals,
  goalAverages,
}: {
  initialGoals: Goal[]
  goalAverages: Record<string, number | null>
}) {
  const router = useRouter()
  const [goals, setGoals] = useState(initialGoals)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  // Split into active and completed/expired
  const activeGoals = goals.filter((g) => g.status === "active")
  const pastGoals = goals.filter((g) => g.status !== "active")

  async function refreshGoals() {
    const result = await getGoals()
    if (result.data) setGoals(result.data)
  }

  async function handleSaved() {
    setModalOpen(false)
    setEditingGoal(null)
    await refreshGoals()
  }

  async function handleDeleted() {
    await refreshGoals()
  }

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Goals
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingGoal(null)
              setModalOpen(true)
            }}
            className="min-h-9 gap-1.5 border-border/50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Goal
          </Button>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Set a target to track your progress. Example: &quot;Sub-20 on 3x3
              by June 2026.&quot;
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currentAvg={goalAverages[goal.event] ?? null}
                  onEdit={() => {
                    setEditingGoal(goal)
                    setModalOpen(true)
                  }}
                  onDeleted={handleDeleted}
                />
              ))}
              {pastGoals.length > 0 && activeGoals.length > 0 && (
                <div className="my-1 border-t border-border/30" />
              )}
              {pastGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currentAvg={null}
                  onEdit={() => {}}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditingGoal(null)
        }}
        editingGoal={editingGoal}
        onSaved={handleSaved}
      />
    </>
  )
}
