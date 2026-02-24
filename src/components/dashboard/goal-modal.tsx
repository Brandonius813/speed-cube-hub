"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createGoal, updateGoal } from "@/lib/actions/goals"
import { WCA_EVENTS } from "@/lib/constants"
import type { Goal } from "@/lib/types"

export function GoalModal({
  open,
  onOpenChange,
  editingGoal,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingGoal: Goal | null
  onSaved: (goal: Goal, mode: "created" | "updated") => void
}) {
  const [event, setEvent] = useState(editingGoal?.event ?? "333")
  const [targetAvg, setTargetAvg] = useState(
    editingGoal ? String(editingGoal.target_avg) : ""
  )
  const [targetDate, setTargetDate] = useState(editingGoal?.target_date ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sync form fields every time the modal opens (handles both Add and Edit correctly)
  useEffect(() => {
    if (open) {
      setEvent(editingGoal?.event ?? "333")
      setTargetAvg(editingGoal ? String(editingGoal.target_avg) : "")
      setTargetDate(editingGoal?.target_date ?? "")
      setError(null)
    }
  }, [editingGoal, open])

  async function handleSave() {
    setError(null)

    const avgNum = parseFloat(targetAvg)
    if (!targetAvg || isNaN(avgNum) || avgNum <= 0) {
      setError("Enter a valid target time in seconds (e.g., 15.00).")
      return
    }
    if (!targetDate) {
      setError("Pick a target date.")
      return
    }

    setSaving(true)

    if (editingGoal) {
      const result = await updateGoal(editingGoal.id, {
        event,
        target_avg: avgNum,
        target_date: targetDate,
      })
      if (!result.success || !result.data) {
        setError(result.error ?? "Something went wrong.")
        setSaving(false)
        return
      }
      setSaving(false)
      onSaved(result.data, "updated")
    } else {
      const result = await createGoal({
        event,
        target_avg: avgNum,
        target_date: targetDate,
      })
      if (!result.success || !result.data) {
        setError(result.error ?? "Something went wrong.")
        setSaving(false)
        return
      }
      setSaving(false)
      onSaved(result.data, "created")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle>{editingGoal ? "Edit Goal" : "Set a New Goal"}</DialogTitle>
          <DialogDescription>
            {editingGoal
              ? "Update your goal details."
              : "Set a target average time for an event. We'll track your progress automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-event">Event</Label>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger id="goal-event" className="min-h-11">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {WCA_EVENTS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-target">Target Average (seconds)</Label>
            <Input
              id="goal-target"
              type="number"
              step="0.01"
              min="0.01"
              value={targetAvg}
              onChange={(e) => setTargetAvg(e.target.value)}
              placeholder="e.g., 15.00"
              className="min-h-11 font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your goal average solve time in seconds. For example, enter 20 for
              sub-20.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-date">Target Date</Label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="min-h-11"
              min={new Date().toISOString().split("T")[0]}
            />
            <p className="text-xs text-muted-foreground">
              When do you want to reach this goal by?
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !targetAvg || !targetDate}
            className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
