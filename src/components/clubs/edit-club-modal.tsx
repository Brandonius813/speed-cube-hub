"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function EditClubModal({
  open,
  onOpenChange,
  clubName,
  clubDescription,
  clubVisibility,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubName: string
  clubDescription: string
  clubVisibility: "public" | "private"
  onSave: (name: string, description: string, visibility: "public" | "private") => void
}) {
  const [name, setName] = useState(clubName)
  const [description, setDescription] = useState(clubDescription)
  const [visibility, setVisibility] = useState<"public" | "private">(clubVisibility)

  // Reset form when modal opens with new data
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setName(clubName)
      setDescription(clubDescription)
      setVisibility(clubVisibility)
    }
    onOpenChange(isOpen)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name, description, visibility)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Club</DialogTitle>
          <DialogDescription>
            Update your club&apos;s name and description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-club-name">Club Name *</Label>
            <Input
              id="edit-club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-club-description">Description</Label>
            <Textarea
              id="edit-club-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as "public" | "private")}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
