"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { updateProfile } from "@/lib/actions/profiles"
import type { Profile } from "@/lib/types"

export function EditProfileModal({
  profile,
  open,
  onOpenChange,
}: {
  profile: Profile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError(null)
    setSaving(true)

    const result = await updateProfile({
      display_name: displayName,
      bio: bio || null,
      avatar_url: avatarUrl || null,
    })

    if (!result.success) {
      setError(result.error ?? "Something went wrong.")
      setSaving(false)
      return
    }

    setSaving(false)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your display name, bio, and avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-display-name">Display Name</Label>
            <Input
              id="edit-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="min-h-11"
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-bio">
              Bio{" "}
              <span className="font-normal text-muted-foreground">
                ({500 - bio.length} characters remaining)
              </span>
            </Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other cubers about yourself..."
              className="min-h-[80px] resize-none"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-avatar-url">
              Avatar URL{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-avatar-url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              className="min-h-11"
              type="url"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
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
            disabled={saving || !displayName.trim()}
            className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
