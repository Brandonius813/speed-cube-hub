"use client"

import { useState } from "react"
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
import { createChallenge } from "@/lib/actions/challenges"
import type { Challenge } from "@/lib/types"

const CHALLENGE_TYPES = [
  { value: "solves", label: "Total Solves", hint: "e.g. Log 100 solves" },
  {
    value: "time",
    label: "Practice Minutes",
    hint: "e.g. Practice for 300 minutes",
  },
  {
    value: "streak",
    label: "Practice Days",
    hint: "e.g. Practice 7 different days",
  },
  {
    value: "events",
    label: "Different Events",
    hint: "e.g. Practice 5 different events",
  },
] as const

export function CreateChallengeModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (challenge: Challenge) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<Challenge["type"]>("solves")
  const [targetValue, setTargetValue] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await createChallenge({
      title,
      description,
      type,
      target_value: parseInt(targetValue, 10),
      start_date: startDate,
      end_date: endDate,
    })

    if (!result.success) {
      setError(result.error ?? "Failed to create challenge")
      setSubmitting(false)
      return
    }

    // Construct a Challenge object for optimistic UI
    const newChallenge: Challenge = {
      id: crypto.randomUUID(), // Temporary ID until revalidation
      title: title.trim(),
      description: description.trim() || null,
      type,
      target_value: parseInt(targetValue, 10),
      start_date: startDate,
      end_date: endDate,
      created_at: new Date().toISOString(),
      participant_count: 0,
      has_joined: false,
    }

    onCreated(newChallenge)
    setSubmitting(false)
  }

  const selectedTypeHint =
    CHALLENGE_TYPES.find((t) => t.value === type)?.hint ?? ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Challenge</DialogTitle>
          <DialogDescription>
            Create a community challenge for all cubers to join.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="challenge-title">Title</Label>
            <Input
              id="challenge-title"
              placeholder='e.g. "100 Solves This Week"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="challenge-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="challenge-description"
              placeholder="Describe the challenge..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Challenge Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as Challenge["type"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CHALLENGE_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeHint && (
              <p className="text-xs text-muted-foreground">
                {selectedTypeHint}
              </p>
            )}
          </div>

          {/* Target Value */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="challenge-target">Target Value</Label>
            <Input
              id="challenge-target"
              type="number"
              min={1}
              placeholder="e.g. 100"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
              className="font-mono"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-start">Start Date</Label>
              <Input
                id="challenge-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-end">End Date</Label>
              <Input
                id="challenge-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? "Creating..." : "Create Challenge"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
