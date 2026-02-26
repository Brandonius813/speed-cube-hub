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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Camera, Check, ChevronsUpDown, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateProfile, uploadAvatar, deleteAvatar, updateProfileLinks } from "@/lib/actions/profiles"
import { getWcaCountries } from "@/lib/actions/sor-kinch"
import type { WcaCountry } from "@/lib/actions/sor-kinch"
import { WCA_EVENTS } from "@/lib/constants"
import { DEFAULT_AVATARS } from "@/lib/avatar-defaults"
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal"
import type { Profile, ProfileLink } from "@/lib/types"

const US_STATES = [
  { value: "Alabama", label: "Alabama" },
  { value: "Alaska", label: "Alaska" },
  { value: "Arizona", label: "Arizona" },
  { value: "Arkansas", label: "Arkansas" },
  { value: "California", label: "California" },
  { value: "Colorado", label: "Colorado" },
  { value: "Connecticut", label: "Connecticut" },
  { value: "Delaware", label: "Delaware" },
  { value: "Florida", label: "Florida" },
  { value: "Georgia", label: "Georgia" },
  { value: "Hawaii", label: "Hawaii" },
  { value: "Idaho", label: "Idaho" },
  { value: "Illinois", label: "Illinois" },
  { value: "Indiana", label: "Indiana" },
  { value: "Iowa", label: "Iowa" },
  { value: "Kansas", label: "Kansas" },
  { value: "Kentucky", label: "Kentucky" },
  { value: "Louisiana", label: "Louisiana" },
  { value: "Maine", label: "Maine" },
  { value: "Maryland", label: "Maryland" },
  { value: "Massachusetts", label: "Massachusetts" },
  { value: "Michigan", label: "Michigan" },
  { value: "Minnesota", label: "Minnesota" },
  { value: "Mississippi", label: "Mississippi" },
  { value: "Missouri", label: "Missouri" },
  { value: "Montana", label: "Montana" },
  { value: "Nebraska", label: "Nebraska" },
  { value: "Nevada", label: "Nevada" },
  { value: "New Hampshire", label: "New Hampshire" },
  { value: "New Jersey", label: "New Jersey" },
  { value: "New Mexico", label: "New Mexico" },
  { value: "New York", label: "New York" },
  { value: "North Carolina", label: "North Carolina" },
  { value: "North Dakota", label: "North Dakota" },
  { value: "Ohio", label: "Ohio" },
  { value: "Oklahoma", label: "Oklahoma" },
  { value: "Oregon", label: "Oregon" },
  { value: "Pennsylvania", label: "Pennsylvania" },
  { value: "Rhode Island", label: "Rhode Island" },
  { value: "South Carolina", label: "South Carolina" },
  { value: "South Dakota", label: "South Dakota" },
  { value: "Tennessee", label: "Tennessee" },
  { value: "Texas", label: "Texas" },
  { value: "Utah", label: "Utah" },
  { value: "Vermont", label: "Vermont" },
  { value: "Virginia", label: "Virginia" },
  { value: "Washington", label: "Washington" },
  { value: "West Virginia", label: "West Virginia" },
  { value: "Wisconsin", label: "Wisconsin" },
  { value: "Wyoming", label: "Wyoming" },
  { value: "District of Columbia", label: "District of Columbia" },
]

const PLATFORM_OPTIONS = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
  { value: "discord", label: "Discord" },
  { value: "wca", label: "WCA" },
  { value: "website", label: "Website" },
] as const

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
  const [countryId, setCountryId] = useState(profile.country_id ?? "")
  const [countries, setCountries] = useState<WcaCountry[]>([])
  const [countryOpen, setCountryOpen] = useState(false)
  const [mainEvents, setMainEvents] = useState<string[]>(profile.main_events ?? [])
  const [links, setLinks] = useState<ProfileLink[]>(profile.links ?? [])

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

  // Reset form fields whenever modal opens with fresh profile data
  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name)
      setHandle(profile.handle)
      setBio(profile.bio ?? "")
      // Parse state from composed location (e.g., "California, USA" → "California")
      const rawLocation = profile.location ?? ""
      if (profile.country_id === "US" && rawLocation.endsWith(", USA")) {
        setLocation(rawLocation.slice(0, -5))
      } else {
        setLocation(rawLocation)
      }
      setCountryId(profile.country_id ?? "")
      setMainEvents(profile.main_events ?? [])
      setLinks(profile.links ?? [])
      setAvatarBlob(null)
      setAvatarPreview(null)
      setSelectedDefault(null)
      setRemoveAvatar(false)
      setError(null)

      // Fetch countries list for the dropdown
      if (countries.length === 0) {
        getWcaCountries().then((data) => setCountries(data))
      }
    }
  }, [open, profile]) // eslint-disable-line react-hooks/exhaustive-deps

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

      // Compose display location from country + state for the location field
      let displayLocation: string | null = null
      if (countryId) {
        const countryName = countries.find((c) => c.id === countryId)?.name ?? countryId
        if (countryId === "US" && location && location !== "__none__") {
          displayLocation = `${location}, USA`
        } else {
          displayLocation = countryName
        }
      }

      const result = await updateProfile({
        display_name: displayName,
        ...(handle !== profile.handle ? { handle } : {}),
        bio: bio || null,
        location: displayLocation,
        country_id: countryId || null,
        main_event: mainEvents[0] || null,
        main_events: mainEvents,
        ...(newAvatarUrl !== undefined ? { avatar_url: newAvatarUrl } : {}),
      })

      if (!result.success) {
        setError(result.error ?? "Something went wrong.")
        setSaving(false)
        return
      }

      // Save social links (only non-empty URLs)
      const linksToSave = links
        .filter((l) => l.url.trim())
        .map((l) => ({
          ...l,
          label: l.label.trim() || PLATFORM_OPTIONS.find((p) => p.value === l.platform)?.label || l.platform,
        }))
      const linksResult = await updateProfileLinks(linksToSave)
      if (!linksResult.success) {
        setError(linksResult.error ?? "Failed to save links.")
        setSaving(false)
        return
      }

      setSaving(false)
      onOpenChange(false)

      // Notify navbar to refresh avatar/display name
      window.dispatchEvent(new Event("profile-updated"))

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
        <DialogContent className="max-h-[90vh] border-border/50 bg-card flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name, bio, and avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
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
              <Label>
                Main Events{" "}
                <span className="font-normal text-muted-foreground">(up to 3)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {mainEvents.map((eventId) => {
                  const label = WCA_EVENTS.find((e) => e.id === eventId)?.label ?? eventId
                  return (
                    <button
                      key={eventId}
                      type="button"
                      onClick={() => setMainEvents((prev) => prev.filter((e) => e !== eventId))}
                      className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-destructive/10 hover:border-destructive/30"
                    >
                      {label}
                      <X className="h-3 w-3" />
                    </button>
                  )
                })}
              </div>
              {mainEvents.length < 3 && (
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v && !mainEvents.includes(v)) {
                      setMainEvents((prev) => [...prev, v])
                    }
                  }}
                >
                  <SelectTrigger className="min-h-11 border-border/50 text-sm">
                    <SelectValue placeholder="Add a main event..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {WCA_EVENTS.filter((e) => !mainEvents.includes(e.id)).map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                The events you compete in or practice the most.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex flex-col gap-2">
              <Label>Social Links</Label>
              <div className="flex flex-col gap-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={link.platform}
                      onValueChange={(v) => {
                        setLinks((prev) =>
                          prev.map((l, idx) => (idx === i ? { ...l, platform: v } : l))
                        )
                      }}
                    >
                      <SelectTrigger className="min-h-11 w-[140px] shrink-0 border-border/50 text-sm">
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={link.url}
                      onChange={(e) => {
                        setLinks((prev) =>
                          prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l))
                        )
                      }}
                      placeholder="https://..."
                      className="min-h-11 min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove link"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {links.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLinks((prev) => [
                      ...prev,
                      { platform: "youtube", url: "", label: "" },
                    ])
                  }
                  className="min-h-9 w-fit gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Link
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Up to 10 links. URLs must start with https://
              </p>
            </div>

            {/* Country picker */}
            <div className="flex flex-col gap-2">
              <Label>
                Country{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    className="min-h-11 w-full justify-between border-border/50 text-sm font-normal"
                  >
                    {countryId
                      ? countries.find((c) => c.id === countryId)?.name ?? countryId
                      : "Select a country..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search countries..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {/* Option to clear selection */}
                        <CommandItem
                          value="__clear__"
                          onSelect={() => {
                            setCountryId("")
                            setLocation("")
                            setCountryOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !countryId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          None
                        </CommandItem>
                        {countries.map((country) => (
                          <CommandItem
                            key={country.id}
                            value={country.name}
                            onSelect={() => {
                              const newId = country.id === countryId ? "" : country.id
                              setCountryId(newId)
                              // Clear state if switching away from US
                              if (newId !== "US") setLocation("")
                              setCountryOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                countryId === country.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {country.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* US State picker (only shown when country is US) */}
            {countryId === "US" && (
              <div className="flex flex-col gap-2">
                <Label>
                  State{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Select
                  value={location}
                  onValueChange={setLocation}
                >
                  <SelectTrigger className="min-h-11 border-border/50 text-sm">
                    <SelectValue placeholder="Select a state..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="__none__">None</SelectItem>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
