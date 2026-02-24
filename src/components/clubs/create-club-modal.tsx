"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { createClub } from "@/lib/actions/club-mutations"

export function CreateClubModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createClub(name, description)

      if (result.error) {
        setError(result.error)
        return
      }

      // Reset form
      setName("")
      setDescription("")
      onCreated()

      // Navigate to the new club
      if (result.clubId) {
        router.push(`/clubs/${result.clubId}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Club</DialogTitle>
          <DialogDescription>
            Start a new club for your cubing community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="club-name">Club Name *</Label>
            <Input
              id="club-name"
              placeholder="e.g., Bay Area Cubers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="club-description">Description</Label>
            <Textarea
              id="club-description"
              placeholder="What is this club about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? "Creating..." : "Create Club"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
