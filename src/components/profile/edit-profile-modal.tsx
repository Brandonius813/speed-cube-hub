"use client"

import { useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Camera, X } from "lucide-react"
import { updateProfile, uploadAvatar } from "@/lib/actions/profiles"
import type { Profile } from "@/lib/types"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

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
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [handle, setHandle] = useState(profile.handle)
  const [bio, setBio] = useState(profile.bio ?? "")
  const [location, setLocation] = useState(profile.location ?? "")
  const [sponsor, setSponsor] = useState(profile.sponsor ?? "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const currentAvatarUrl = removeAvatar ? null : (avatarPreview ?? profile.avatar_url)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are allowed.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB.")
      return
    }

    setError(null)
    setAvatarFile(file)
    setRemoveAvatar(false)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleRemoveAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSave() {
    setError(null)
    setSaving(true)

    // Upload new avatar if a file was selected
    let newAvatarUrl: string | null | undefined
    if (avatarFile) {
      const formData = new FormData()
      formData.append("avatar", avatarFile)
      const uploadResult = await uploadAvatar(formData)
      if (!uploadResult.success) {
        setError(uploadResult.error ?? "Failed to upload avatar.")
        setSaving(false)
        return
      }
      newAvatarUrl = uploadResult.url
    } else if (removeAvatar) {
      newAvatarUrl = null
    }

    const result = await updateProfile({
      display_name: displayName,
      ...(handle !== profile.handle ? { handle } : {}),
      bio: bio || null,
      location: location || null,
      sponsor: sponsor || null,
      ...(newAvatarUrl !== undefined ? { avatar_url: newAvatarUrl } : {}),
    })

    if (!result.success) {
      setError(result.error ?? "Something went wrong.")
      setSaving(false)
      return
    }

    setSaving(false)
    onOpenChange(false)

    // If handle changed and we're on a handle-based URL, redirect to the new handle
    if (handle !== profile.handle && pathname.startsWith("/profile/")) {
      router.replace(`/profile/${handle}`)
    } else {
      router.refresh()
    }
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
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/30">
                {currentAvatarUrl && (
                  <AvatarImage src={currentAvatarUrl} alt={displayName} />
                )}
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {getInitials(displayName || "?")}
                </AvatarFallback>
              </Avatar>
              {currentAvatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                  aria-label="Remove avatar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-9 gap-1.5"
            >
              <Camera className="h-3.5 w-3.5" />
              {currentAvatarUrl ? "Change Photo" : "Upload Photo"}
            </Button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, or WebP. Max 2MB.
            </p>
          </div>

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
            <Label htmlFor="edit-handle">Username</Label>
            <div className="flex items-center gap-0">
              <span className="flex min-h-11 items-center rounded-l-md border border-r-0 border-border/50 bg-secondary px-3 text-sm text-muted-foreground">
                speedcubehub.com/profile/
              </span>
              <Input
                id="edit-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="brandontrue"
                className="min-h-11 rounded-l-none"
                maxLength={30}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Letters, numbers, hyphens, and underscores only. This is your public profile URL.
            </p>
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
            <Label htmlFor="edit-location">
              Location{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., San Diego, CA"
              className="min-h-11"
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-sponsor">
              Sponsor{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-sponsor"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder="e.g., GAN, MoYu, SpeedCubeShop"
              className="min-h-11"
              maxLength={100}
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
