"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { Trash2 } from "lucide-react"
import { WCA_EVENTS, getPracticeTypesForEvent } from "@/lib/constants"
import { updateSession, deleteSession } from "@/lib/actions/sessions"
import { parseDuration, formatDuration } from "@/lib/utils"
import type { Session } from "@/lib/types"

const CUSTOM_VALUE = "__custom__"

export function EditSessionModal({
  open,
  onOpenChange,
  session,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState(session.event)
  const [practiceType, setPracticeType] = useState(session.practice_type)
  const [customType, setCustomType] = useState("")

  const practiceTypes = useMemo(() => getPracticeTypesForEvent(event), [event])

  // Check if the session's practice type is a custom one (not in the standard list)
  const isCustomPracticeType = useMemo(() => {
    const types = getPracticeTypesForEvent(session.event)
    return !types.includes(session.practice_type)
  }, [session.event, session.practice_type])

  // Reset form state when modal opens with new session data
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setEvent(session.event)
      if (isCustomPracticeType) {
        setPracticeType(CUSTOM_VALUE)
        setCustomType(session.practice_type)
      } else {
        setPracticeType(session.practice_type)
        setCustomType("")
      }
      setError(null)
    }
    onOpenChange(isOpen)
  }

  function handleEventChange(newEvent: string) {
    setEvent(newEvent)
    setPracticeType("Solves")
    setCustomType("")
  }

  function handlePracticeTypeChange(value: string) {
    setPracticeType(value)
    if (value !== CUSTOM_VALUE) {
      setCustomType("")
    }
  }

  // Format duration_minutes back to the h:mm or minutes string for the input
  function durationToInput(minutes: number): string {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return `${h}:${String(m).padStart(2, "0")}`
    }
    return String(minutes)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    const sessionDate = formData.get("date") as string
    const numSolves = parseInt(formData.get("solves") as string, 10)
    const durationMinutes = parseDuration(formData.get("time") as string)
    const avgTimeStr = (formData.get("avg") as string)?.trim()
    const bestTimeStr = (formData.get("best") as string)?.trim()
    const title = (formData.get("title") as string)?.trim()
    const notes = (formData.get("notes") as string)?.trim()

    const finalPracticeType =
      practiceType === CUSTOM_VALUE ? customType.trim() : practiceType

    if (!sessionDate || !event || !finalPracticeType || !numSolves || !durationMinutes) {
      setError(
        !durationMinutes && (formData.get("time") as string)?.trim()
          ? 'Invalid time format. Use minutes (e.g. "90") or h:mm (e.g. "1:30").'
          : "Please fill in all required fields."
      )
      setLoading(false)
      return
    }

    const result = await updateSession(session.id, {
      session_date: sessionDate,
      event,
      practice_type: finalPracticeType,
      num_solves: numSolves,
      duration_minutes: durationMinutes,
      avg_time: avgTimeStr ? parseFloat(avgTimeStr) : null,
      best_time: bestTimeStr ? parseFloat(bestTimeStr) : null,
      title: title || null,
      notes: notes || null,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setLoading(false)
    onOpenChange(false)
    onSaved()
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteSession(session.id)

    if (result.error) {
      setError(result.error)
      setDeleting(false)
      return
    }

    setDeleting(false)
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <DialogDescription>
            Update or delete this practice session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                name="date"
                type="date"
                defaultValue={session.session_date}
                required
                className="min-h-11 border-border bg-secondary/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Event</Label>
              <Select value={event} onValueChange={handleEventChange}>
                <SelectTrigger className="min-h-11 w-full border-border bg-secondary/50">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {WCA_EVENTS.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Practice Type</Label>
              <Select value={practiceType} onValueChange={handlePracticeTypeChange}>
                <SelectTrigger className="min-h-11 w-full border-border bg-secondary/50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {practiceTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_VALUE}>Custom...</SelectItem>
                </SelectContent>
              </Select>
              {practiceType === CUSTOM_VALUE && (
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Enter custom practice type"
                  className="min-h-11 border-border bg-secondary/50"
                  autoFocus
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-solves">Number of Solves</Label>
              <Input
                id="edit-solves"
                name="solves"
                type="number"
                defaultValue={session.num_solves}
                min={1}
                required
                className="min-h-11 border-border bg-secondary/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-time">
                Time Practiced
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (e.g. 1:30 or 90)
                </span>
              </Label>
              <Input
                id="edit-time"
                name="time"
                type="text"
                inputMode="numeric"
                defaultValue={durationToInput(session.duration_minutes)}
                required
                className="min-h-11 border-border bg-secondary/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-avg">
                Result Average
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="edit-avg"
                name="avg"
                type="text"
                defaultValue={session.avg_time?.toString() ?? ""}
                className="min-h-11 border-border bg-secondary/50 font-mono"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-best">
                Best Single
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="edit-best"
                name="best"
                type="text"
                defaultValue={session.best_time?.toString() ?? ""}
                className="min-h-11 border-border bg-secondary/50 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-title">
              Title
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="edit-title"
              name="title"
              type="text"
              defaultValue={session.title ?? ""}
              maxLength={100}
              className="min-h-11 border-border bg-secondary/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-notes">
              Description
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="edit-notes"
              name="notes"
              defaultValue={session.notes ?? ""}
              rows={3}
              className="border-border bg-secondary/50"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this practice session. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Delete Session"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
