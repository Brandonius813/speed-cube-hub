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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WCA_EVENTS } from "@/lib/constants"
import { getPBTypesForEvent } from "@/lib/constants"
import { logNewPB } from "@/lib/actions/personal-bests"
import { getTodayPacific } from "@/lib/utils"

/**
 * Parse a time string into decimal seconds.
 * Accepts "12.34" (seconds), "1:23.45" (MM:SS.XX), or "1:23:45" (H:MM:SS).
 */
function parseTimeInput(value: string): number | null {
  if (!value.trim()) return null

  // Plain decimal seconds (no colon)
  if (!value.includes(":")) {
    const num = Number(value)
    return !isNaN(num) && num > 0 ? num : null
  }

  const parts = value.split(":")

  // H:MM:SS format
  if (parts.length === 3) {
    const hours = Number(parts[0])
    const minutes = Number(parts[1])
    const seconds = Number(parts[2])
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null
    const total = hours * 3600 + minutes * 60 + seconds
    return total > 0 ? total : null
  }

  // MM:SS or MM:SS.XX format
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

export function LogPBModal({
  open,
  onOpenChange,
  defaultEvent,
  defaultPBType,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultEvent?: string
  defaultPBType?: string
  onSaved: () => void
}) {
  const [event, setEvent] = useState(defaultEvent || "")
  const [pbType, setPbType] = useState(defaultPBType || "")
  const [time, setTime] = useState("")
  const [dateAchieved, setDateAchieved] = useState(getTodayPacific())
  const [notes, setNotes] = useState("")
  const [mbldSolved, setMbldSolved] = useState("")
  const [mbldAttempted, setMbldAttempted] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isMBLD = event === "333mbf"

  // Reset form when modal opens with new defaults
  useEffect(() => {
    if (open) {
      setEvent(defaultEvent || "")
      setPbType(defaultPBType || "")
      setTime("")
      setDateAchieved(getTodayPacific())
      setNotes("")
      setMbldSolved("")
      setMbldAttempted("")
      setError(null)
    }
  }, [open, defaultEvent, defaultPBType])

  // Reset PB type when event changes (unless it's still valid)
  useEffect(() => {
    if (event) {
      const validTypes = getPBTypesForEvent(event)
      if (!validTypes.includes(pbType)) {
        setPbType("")
      }
    }
  }, [event, pbType])

  const availableTypes = event ? getPBTypesForEvent(event) : []

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
      const result = await logNewPB({
        event,
        pb_type: pbType,
        time_seconds: timeSeconds,
        date_achieved: dateAchieved,
        notes: notes.trim() || undefined,
        mbld_solved: solved,
        mbld_attempted: attempted,
      })

      if (!result.success) {
        setError(result.error ?? "Failed to save PB")
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
      setError(
        'Enter a valid time (e.g., "10.32" or "1:23.45")'
      )
      return
    }

    setSubmitting(true)

    const result = await logNewPB({
      event,
      pb_type: pbType,
      time_seconds: timeSeconds,
      date_achieved: dateAchieved,
      notes: notes.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error ?? "Failed to save PB")
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
          <DialogTitle>Log New PB</DialogTitle>
          <DialogDescription>
            Add a personal best to your records.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Event</Label>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger>
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

          <div className="flex flex-col gap-1.5">
            <Label>PB Type</Label>
            <Select
              value={pbType}
              onValueChange={setPbType}
              disabled={!event}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select PB type" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isMBLD && (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="mbld-solved">Solved</Label>
                <Input
                  id="mbld-solved"
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
                <Label htmlFor="mbld-attempted">Attempted</Label>
                <Input
                  id="mbld-attempted"
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
            <Label htmlFor="pb-time">Time</Label>
            <Input
              id="pb-time"
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
            <Label htmlFor="pb-date">Date Achieved</Label>
            <Input
              id="pb-date"
              type="date"
              value={dateAchieved}
              onChange={(e) => setDateAchieved(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-notes">
              Notes{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="pb-notes"
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
              disabled={submitting || !event || !pbType}
              className="flex-1 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Saving..." : "Save PB"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
