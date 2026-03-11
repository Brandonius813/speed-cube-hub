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
import { createChallenge, updateChallenge } from "@/lib/actions/challenges"
import type { Challenge, Club } from "@/lib/types"

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
  onSaved,
  challenge,
  clubs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (challenge: Challenge) => void
  challenge: Challenge | null
  clubs: Club[]
}) {
  const [title, setTitle] = useState(challenge?.title ?? "")
  const [description, setDescription] = useState(challenge?.description ?? "")
  const [type, setType] = useState<Challenge["type"]>(challenge?.type ?? "solves")
  const [scope, setScope] = useState<Challenge["scope"]>(challenge?.scope ?? "official")
  const [clubId, setClubId] = useState(challenge?.club_id ?? "")
  const [targetValue, setTargetValue] = useState(challenge ? String(challenge.target_value) : "")
  const [startDate, setStartDate] = useState(challenge?.start_date ?? "")
  const [endDate, setEndDate] = useState(challenge?.end_date ?? "")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const payload = {
      title,
      description,
      type,
      scope,
      club_id: scope === "club" ? clubId : null,
      target_value: parseInt(targetValue, 10),
      start_date: startDate,
      end_date: endDate,
    }

    const result = challenge
      ? await updateChallenge(challenge.id, payload)
      : await createChallenge(payload)

    if (!result.success || !result.challenge) {
      setError(result.error ?? (challenge ? "Failed to update challenge" : "Failed to create challenge"))
      setSubmitting(false)
      return
    }

    onSaved(result.challenge)
    setSubmitting(false)
  }

  const selectedTypeHint =
    CHALLENGE_TYPES.find((t) => t.value === type)?.hint ?? ""
  const isEditing = !!challenge

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Challenge" : "Create Challenge"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the challenge details and save the changes."
              : "Create a community challenge for all cubers to join."}
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

          <div className="flex flex-col gap-1.5">
            <Label>Challenge Scope</Label>
            <Select
              value={scope}
              onValueChange={(value) => {
                const nextScope = value as Challenge["scope"]
                setScope(nextScope)
                if (nextScope === "official") setClubId("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="official">Official / Community-wide</SelectItem>
                <SelectItem value="club">Club-only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "club" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Club</Label>
              <Select value={clubId} onValueChange={setClubId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clubs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Join or create a club before creating a club challenge.
                </p>
              ) : null}
            </div>
          ) : null}

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
            disabled={submitting || (scope === "club" && !clubId)}
            className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Challenge"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
