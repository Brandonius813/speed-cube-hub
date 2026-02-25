"use client"

import { useState, useRef, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Camera, X } from "lucide-react"
import { updateProfile, uploadAvatar, deleteAvatar } from "@/lib/actions/profiles"
import { WCA_EVENTS } from "@/lib/constants"
import { DEFAULT_AVATARS } from "@/lib/avatar-defaults"
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal"
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
  const [mainEvent, setMainEvent] = useState(profile.main_event ?? "")

  // Avatar state
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedDefault, setSelectedDefault] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  // Crop modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Revoke object URLs on cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
      if (cropImageSrc?.startsWith("blob:")) URL.revokeObjectURL(cropImageSrc)
    }
  }, [avatarPreview, cropImageSrc])

  // Determine what avatar to show in the preview
  const currentAvatarUrl = removeAvatar
    ? null
    : selectedDefault ?? avatarPreview ?? profile.avatar_url

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Accept any image type (iOS auto-converts HEIC to JPEG)
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.")
      return
    }

    // Allow up to 10MB since the crop modal compresses to ~50KB
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.")
      return
    }

    setError(null)

    // Revoke old crop source URL if any
    if (cropImageSrc?.startsWith("blob:")) URL.revokeObjectURL(cropImageSrc)

    const objectUrl = URL.createObjectURL(file)
    setCropImageSrc(objectUrl)
    setShowCropModal(true)

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleCropApply(blob: Blob) {
    // Revoke old preview URL if any
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)

    setAvatarBlob(blob)
    setAvatarPreview(URL.createObjectURL(blob))
    setSelectedDefault(null)
    setRemoveAvatar(false)
    setShowCropModal(false)
  }

  function handleCropCancel() {
    setShowCropModal(false)
  }

  function handleSelectDefault(src: string) {
    // Clear any custom upload state
    setAvatarBlob(null)
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    setSelectedDefault(src)
    setRemoveAvatar(false)
    setError(null)
  }

  function handleRemoveAvatar() {
    setAvatarBlob(null)
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    setSelectedDefault(null)
    setRemoveAvatar(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSave() {
    setError(null)
    setSaving(true)

    try {
      // Determine the new avatar URL
      let newAvatarUrl: string | null | undefined

      if (avatarBlob) {
        // Upload the cropped image
        const formData = new FormData()
        formData.append("avatar", avatarBlob, "avatar.jpg")
        const uploadResult = await uploadAvatar(formData)
        if (!uploadResult.success) {
          setError(uploadResult.error ?? "Failed to upload avatar.")
          setSaving(false)
          return
        }
        newAvatarUrl = uploadResult.url
      } else if (selectedDefault) {
        // Use a default avatar (static path, no upload needed)
        newAvatarUrl = selectedDefault
      } else if (removeAvatar) {
        // Delete the file from storage and clear the URL
        await deleteAvatar()
        newAvatarUrl = null
      }

      const result = await updateProfile({
        display_name: displayName,
        ...(handle !== profile.handle ? { handle } : {}),
        bio: bio || null,
        location: location || null,
        sponsor: sponsor || null,
        main_event: mainEvent || null,
        ...(newAvatarUrl !== undefined ? { avatar_url: newAvatarUrl } : {}),
      })

      if (!result.success) {
        setError(result.error ?? "Something went wrong.")
        setSaving(false)
        return
      }

      setSaving(false)
      onOpenChange(false)

      if (handle !== profile.handle && pathname.startsWith("/profile/")) {
        router.replace(`/profile/${handle}`)
      } else {
        router.refresh()
      }
    } catch {
      setError("Something went wrong. Check your internet connection and try again.")
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name, bio, and avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Avatar section */}
            <div className="flex flex-col items-center gap-3">
              {/* Current avatar preview */}
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

              {/* Default avatar options */}
              <div className="flex items-center gap-2">
                {DEFAULT_AVATARS.map((da) => (
                  <button
                    key={da.id}
                    type="button"
                    onClick={() => handleSelectDefault(da.src)}
                    className={`h-10 w-10 overflow-hidden rounded-full border-2 transition-all ${
                      currentAvatarUrl === da.src
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                    aria-label={da.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={da.src}
                      alt={da.label}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
                Pick a default or upload your own photo.
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
              <Label htmlFor="edit-main-event">
                Main Event{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Select
                value={mainEvent || "none"}
                onValueChange={(v) => setMainEvent(v === "none" ? "" : v)}
              >
                <SelectTrigger id="edit-main-event" className="min-h-11 border-border/50 text-sm">
                  <SelectValue placeholder="Select your main event" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">None</SelectItem>
                  {WCA_EVENTS.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The event you compete in or practice the most.
              </p>
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

      {/* Crop modal (rendered outside main dialog to avoid z-index issues) */}
      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          open={showCropModal}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}
