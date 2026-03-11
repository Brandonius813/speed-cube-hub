"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Loader2, Plus, Upload, X } from "lucide-react"
import { getEventLabel, getPBTypesForEvent, getPracticeTypesForEvent, WCA_EVENTS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createPost, uploadPostImage } from "@/lib/actions/posts"
import { buildSocialPreviewPost } from "@/lib/social-preview/mock-data"
import type { Post, PostType } from "@/lib/types"
import { cn } from "@/lib/utils"

const POST_TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "text", label: "Post" },
  { value: "session_recap", label: "Session Recap" },
  { value: "pb", label: "PB Post" },
  { value: "competition", label: "Comp Recap" },
]

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

type SelectedImage = {
  id: string
  file: File
  previewUrl: string
}

type ComposerTag = {
  tagType: "session" | "pb" | "challenge" | "competition" | "puzzle"
  label: string
  referenceId?: string | null
  metadata?: Record<string, unknown>
}

function numberOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function FeedComposer({
  onCreated,
  clubId,
  triggerLabel = "Create Post",
}: {
  onCreated: (post: Post) => void
  clubId?: string | null
  triggerLabel?: string
}) {
  const previewMode = process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_MODE === "1"
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [postType, setPostType] = useState<PostType>("text")
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pbEvent, setPbEvent] = useState("333")
  const [pbType, setPbType] = useState("Single")
  const [pbTime, setPbTime] = useState("")
  const [pbScramble, setPbScramble] = useState("")
  const [sessionEvent, setSessionEvent] = useState("333")
  const [sessionPracticeType, setSessionPracticeType] = useState("Solves")
  const [sessionMean, setSessionMean] = useState("")
  const [sessionBestSingle, setSessionBestSingle] = useState("")
  const [sessionBestAo5, setSessionBestAo5] = useState("")
  const [sessionBestAo12, setSessionBestAo12] = useState("")
  const [sessionBestAo25, setSessionBestAo25] = useState("")
  const [sessionSolves, setSessionSolves] = useState("")
  const [sessionDuration, setSessionDuration] = useState("")

  const pbTypeOptions = useMemo(() => getPBTypesForEvent(pbEvent), [pbEvent])
  const practiceTypeOptions = useMemo(
    () => getPracticeTypesForEvent(sessionEvent),
    [sessionEvent]
  )

  const resetComposer = useCallback(() => {
    setTitle("")
    setContent("")
    setPostType("text")
    setPbEvent("333")
    setPbType("Single")
    setPbTime("")
    setPbScramble("")
    setSessionEvent("333")
    setSessionPracticeType("Solves")
    setSessionMean("")
    setSessionBestSingle("")
    setSessionBestAo5("")
    setSessionBestAo12("")
    setSessionBestAo25("")
    setSessionSolves("")
    setSessionDuration("")
    setSelectedImages((prev) => {
      for (const image of prev) {
        URL.revokeObjectURL(image.previewUrl)
      }
      return []
    })
  }, [])

  const addFiles = useCallback((files: File[]) => {
    setError(null)
    const accepted = files.filter((file) => ALLOWED_IMAGE_TYPES.includes(file.type))

    if (accepted.length === 0) {
      setError("Only JPG, PNG, and WebP images are supported.")
      return
    }

    setSelectedImages((prev) => {
      const next = [...prev]
      for (const file of accepted) {
        if (next.length >= 4) break
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }
      return next
    })
  }, [])

  function removeImage(imageId: string) {
    setSelectedImages((prev) => {
      const image = prev.find((item) => item.id === imageId)
      if (image) {
        URL.revokeObjectURL(image.previewUrl)
      }
      return prev.filter((item) => item.id !== imageId)
    })
  }

  function getStructuredTags(): ComposerTag[] {
    const autoTags: ComposerTag[] = []

    if (postType === "pb") {
      const timeSeconds = numberOrNull(pbTime)
      if (timeSeconds === null) {
        throw new Error("PB posts need a PB time.")
      }

      autoTags.push({
        tagType: "pb",
        label: `${getEventLabel(pbEvent)} ${pbType.toLowerCase()}`,
        metadata: {
          event: pbEvent,
          pb_type: pbType.toLowerCase(),
          time_seconds: timeSeconds,
          scramble: pbScramble.trim() || null,
        },
      })
    }

    if (postType === "session_recap") {
      autoTags.push({
        tagType: "session",
        label: `${getEventLabel(sessionEvent)} session`,
        metadata: {
          event: sessionEvent,
          practice_type: sessionPracticeType,
          avg_time: numberOrNull(sessionMean),
          best_time: numberOrNull(sessionBestSingle),
          best_ao5: numberOrNull(sessionBestAo5),
          best_ao12: numberOrNull(sessionBestAo12),
          best_ao25: numberOrNull(sessionBestAo25),
          num_solves: numberOrNull(sessionSolves),
          duration_minutes: numberOrNull(sessionDuration),
        },
      })
    }

    return autoTags
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      if (!title.trim() && !content.trim() && selectedImages.length === 0) {
        setError("Post cannot be empty.")
        return
      }

      let structuredTags: ComposerTag[]
      try {
        structuredTags = getStructuredTags()
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Please complete the required fields.")
        return
      }

      if (previewMode) {
        const post = buildSocialPreviewPost({
          title,
          content,
          postType,
          clubId,
          imageUrls: selectedImages.map((image) => image.previewUrl),
          tags: structuredTags,
        })

        setOpen(false)
        resetComposer()
        onCreated(post)
        return
      }

      const uploadedImages: { url: string; altText: string | null }[] = []
      for (const image of selectedImages) {
        const formData = new FormData()
        formData.set("image", image.file)
        const uploadResult = await uploadPostImage(formData)
        if (!uploadResult.success || !uploadResult.url) {
          setError(uploadResult.error ?? "Failed to upload an image.")
          return
        }
        uploadedImages.push({
          url: uploadResult.url,
          altText: title.trim() || image.file.name,
        })
      }

      const result = await createPost({
        title,
        content,
        postType,
        clubId,
        imageUrls: uploadedImages,
        tags: structuredTags,
      })

      if (!result.success || !result.post) {
        setError(result.error ?? "Failed to publish post.")
        return
      }

      setOpen(false)
      resetComposer()
      onCreated(result.post)
    } finally {
      setSubmitting(false)
    }
  }

  function handleDialogChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setError(null)
      resetComposer()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share training, PBs, session recaps, photos, and challenge updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title (optional)"
                className="min-h-11"
                maxLength={140}
              />
            </div>

            <Select value={postType} onValueChange={(value) => setPostType(value as PostType)}>
              <SelectTrigger className="min-h-11 w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {postType === "pb" ? (
            <div className="grid gap-3 rounded-2xl border border-border/50 bg-secondary/20 p-4 sm:grid-cols-2">
              <Select value={pbEvent} onValueChange={setPbEvent}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WCA_EVENTS.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={pbType} onValueChange={setPbType}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pbTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={pbTime}
                onChange={(event) => setPbTime(event.target.value)}
                placeholder="PB time in seconds"
                className="min-h-11"
                inputMode="decimal"
              />

              <Input
                value={pbScramble}
                onChange={(event) => setPbScramble(event.target.value)}
                placeholder="Scramble"
                className="min-h-11"
                maxLength={200}
              />
            </div>
          ) : null}

          {postType === "session_recap" ? (
            <div className="space-y-3 rounded-2xl border border-border/50 bg-secondary/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={sessionEvent}
                  onValueChange={(value) => {
                    setSessionEvent(value)
                    setSessionPracticeType(getPracticeTypesForEvent(value)[0] ?? "Solves")
                  }}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WCA_EVENTS.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sessionPracticeType} onValueChange={setSessionPracticeType}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {practiceTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  value={sessionMean}
                  onChange={(event) => setSessionMean(event.target.value)}
                  placeholder="Session mean"
                  className="min-h-11"
                  inputMode="decimal"
                />
                <Input
                  value={sessionBestSingle}
                  onChange={(event) => setSessionBestSingle(event.target.value)}
                  placeholder="Best single"
                  className="min-h-11"
                  inputMode="decimal"
                />
                <Input
                  value={sessionBestAo5}
                  onChange={(event) => setSessionBestAo5(event.target.value)}
                  placeholder="Best Ao5"
                  className="min-h-11"
                  inputMode="decimal"
                />
                <Input
                  value={sessionBestAo12}
                  onChange={(event) => setSessionBestAo12(event.target.value)}
                  placeholder="Best Ao12"
                  className="min-h-11"
                  inputMode="decimal"
                />
                <Input
                  value={sessionBestAo25}
                  onChange={(event) => setSessionBestAo25(event.target.value)}
                  placeholder="Best Ao25"
                  className="min-h-11"
                  inputMode="decimal"
                />
                <Input
                  value={sessionSolves}
                  onChange={(event) => setSessionSolves(event.target.value)}
                  placeholder="Solve count"
                  className="min-h-11"
                  inputMode="numeric"
                />
              </div>

              <Input
                value={sessionDuration}
                onChange={(event) => setSessionDuration(event.target.value)}
                placeholder="Session duration in minutes"
                className="min-h-11 sm:max-w-xs"
                inputMode="numeric"
              />
            </div>
          ) : null}

          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share what you worked on, what you learned, or what happened..."
            maxLength={2000}
            className="min-h-28"
          />

          <div
            onDrop={(event) => {
              event.preventDefault()
              setDragActive(false)
              addFiles(Array.from(event.dataTransfer.files ?? []))
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border/50 bg-secondary/20 hover:border-primary/50 hover:bg-secondary/30"
            )}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Drag and drop images here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to 4 images. JPG, PNG, or WebP.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              multiple
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []))
                event.target.value = ""
              }}
              className="hidden"
            />
          </div>

          {selectedImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {selectedImages.map((image) => (
                <div key={image.id} className="relative overflow-hidden rounded-2xl border border-border/50 bg-secondary/30">
                  <img
                    src={image.previewUrl}
                    alt={image.file.name}
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    aria-label={`Remove ${image.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Training-first posts with optional photos.
            </p>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="min-h-11 min-w-28"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
