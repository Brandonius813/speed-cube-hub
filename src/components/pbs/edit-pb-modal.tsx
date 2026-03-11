"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { updatePB } from "@/lib/actions/personal-bests"
import type { PBRecord } from "@/lib/types"
import { formatEventTime } from "@/lib/utils"

/**
 * Format decimal seconds back into a readable time string for the input field.
 * e.g., 10.32 → "10.32", 83.45 → "1:23.45", 3661 → "1:01:01"
 */
function secondsToInput(seconds: number, eventId?: string): string {
  return formatEventTime(seconds, eventId, { showSecondsSuffix: false })
}

/**
 * Parse a time string into decimal seconds.
 * Accepts "12.34" (seconds), "1:23.45" (MM:SS.XX), or "1:23:45" (H:MM:SS).
 */
function parseTimeInput(value: string): number | null {
  if (!value.trim()) return null

  if (!value.includes(":")) {
    const num = Number(value)
    return !isNaN(num) && num > 0 ? num : null
  }

  const parts = value.split(":")

  if (parts.length === 3) {
    const hours = Number(parts[0])
    const minutes = Number(parts[1])
    const seconds = Number(parts[2])
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null
    const total = hours * 3600 + minutes * 60 + seconds
    return total > 0 ? total : null
  }

  if (parts.length === 2) {
    const minutes = Number(parts[0])
    const seconds = Number(parts[1])
    if (isNaN(minutes) || isNaN(seconds)) return null
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null
    const total = minutes * 60 + seconds
    return total > 0 ? total : null
  }

  return null
}

export function EditPBModal({
  pb,
  open,
  onOpenChange,
  onSaved,
}: {
  pb: PBRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const isMBLD = pb.event === "333mbf"

  const [time, setTime] = useState("")
  const [dateAchieved, setDateAchieved] = useState("")
  const [notes, setNotes] = useState("")
  const [mbldSolved, setMbldSolved] = useState("")
  const [mbldAttempted, setMbldAttempted] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Pre-fill form when modal opens
  useEffect(() => {
    if (open) {
      setTime(secondsToInput(pb.time_seconds, pb.event))
      setDateAchieved(pb.date_achieved)
      setNotes(pb.notes || "")
      setMbldSolved(pb.mbld_solved ? String(pb.mbld_solved) : "")
      setMbldAttempted(pb.mbld_attempted ? String(pb.mbld_attempted) : "")
      setError(null)
    }
  }, [open, pb])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isMBLD) {
      const solved = Number(mbldSolved)
      const attempted = Number(mbldAttempted)
      if (!mbldSolved || isNaN(solved) || solved < 1) {
        setError("Enter a valid number of cubes solved (at least 1).")
        return
      }
      if (!mbldAttempted || isNaN(attempted) || attempted < 2) {
        setError("Enter a valid number of cubes attempted (at least 2).")
        return
      }
      if (solved > attempted) {
        setError("Solved cannot be greater than attempted.")
        return
      }

      const timeSeconds = parseTimeInput(time)
      if (timeSeconds === null) {
        setError('Enter a valid time (e.g., "19:31" or "1:05:30").')
        return
      }

      setSubmitting(true)
      const result = await updatePB(pb.id, {
        time_seconds: timeSeconds,
        date_achieved: dateAchieved,
        notes: notes.trim() || undefined,
        mbld_solved: solved,
        mbld_attempted: attempted,
      })

      if (!result.success) {
        setError(result.error ?? "Failed to update PB")
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      onSaved()
      return
    }

    // Non-MBLD flow
    const timeSeconds = parseTimeInput(time)
    if (timeSeconds === null) {
      setError('Enter a valid time (e.g., "10.32" or "1:23.45")')
      return
    }

    setSubmitting(true)

    const result = await updatePB(pb.id, {
      time_seconds: timeSeconds,
      date_achieved: dateAchieved,
      notes: notes.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error ?? "Failed to update PB")
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit PB</DialogTitle>
          <DialogDescription>
            Update the time, date, or notes for this personal best.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isMBLD && (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="edit-mbld-solved">Solved</Label>
                <Input
                  id="edit-mbld-solved"
                  type="number"
                  min={1}
                  placeholder="e.g., 4"
                  value={mbldSolved}
                  onChange={(e) => setMbldSolved(e.target.value)}
                  className="font-mono"
                  required
                />
              </div>
              <div className="flex items-end pb-2 text-muted-foreground font-mono text-lg">/</div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="edit-mbld-attempted">Attempted</Label>
                <Input
                  id="edit-mbld-attempted"
                  type="number"
                  min={2}
                  placeholder="e.g., 5"
                  value={mbldAttempted}
                  onChange={(e) => setMbldAttempted(e.target.value)}
                  className="font-mono"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-pb-time">Time</Label>
            <Input
              id="edit-pb-time"
              type="text"
              placeholder={isMBLD ? 'e.g., "19:31" or "1:05:30"' : 'e.g., "10.32" or "1:23.45"'}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="font-mono"
              required
            />
            <p className="text-xs text-muted-foreground">
              {isMBLD
                ? "Minutes:seconds (19:31) or hours:minutes:seconds (1:05:30)"
                : "Seconds (10.32) or minutes:seconds (1:23.45)"}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-pb-date">Date Achieved</Label>
            <Input
              id="edit-pb-date"
              type="date"
              value={dateAchieved}
              onChange={(e) => setDateAchieved(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-pb-notes">
              Notes{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="edit-pb-notes"
              placeholder={isMBLD ? "e.g., Competition, 60 min time limit..." : "e.g., Full step, great cross..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-11"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
