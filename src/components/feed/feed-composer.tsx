"use client"

import { useState } from "react"
import { ImagePlus, Loader2, Plus, X } from "lucide-react"
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
import { createPost } from "@/lib/actions/posts"
import { buildSocialPreviewPost } from "@/lib/social-preview/mock-data"
import type { Post, PostTagType, PostType } from "@/lib/types"

const POST_TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "text", label: "Post" },
  { value: "session_recap", label: "Session Recap" },
  { value: "pb", label: "PB Post" },
  { value: "competition", label: "Comp Recap" },
]

const TAG_TYPE_OPTIONS: { value: PostTagType; label: string }[] = [
  { value: "session", label: "Session" },
  { value: "pb", label: "PB" },
  { value: "challenge", label: "Challenge" },
  { value: "competition", label: "Competition" },
  { value: "puzzle", label: "Puzzle" },
]

export function FeedComposer({
  onCreated,
}: {
  onCreated: (post: Post) => void
}) {
  const previewMode = process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_MODE === "1"
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [postType, setPostType] = useState<PostType>("text")
  const [imageUrls, setImageUrls] = useState([""])
  const [tagType, setTagType] = useState<PostTagType>("session")
  const [tagLabel, setTagLabel] = useState("")
  const [tags, setTags] = useState<{ tagType: PostTagType; label: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function addTag() {
    const label = tagLabel.trim()
    if (!label) return
    setTags((prev) => [...prev, { tagType, label }].slice(0, 5))
    setTagLabel("")
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      const trimmedImages = imageUrls.map((url) => url.trim()).filter(Boolean)

      if (previewMode) {
        if (!title.trim() && !content.trim() && trimmedImages.length === 0) {
          setError("Post cannot be empty.")
          return
        }

        const post = buildSocialPreviewPost({
          title,
          content,
          postType,
          imageUrls: trimmedImages,
          tags,
        })

        setTitle("")
        setContent("")
        setPostType("text")
        setImageUrls([""])
        setTags([])
        setTagLabel("")
        setOpen(false)
        onCreated(post)
        return
      }

      const result = await createPost({
        title,
        content,
        postType,
        imageUrls: trimmedImages.map((url) => ({ url, altText: title.trim() || "Feed image" })),
        tags,
      })

      if (!result.success || !result.post) {
        setError(result.error ?? "Failed to publish post.")
        return
      }

      setTitle("")
      setContent("")
      setPostType("text")
      setImageUrls([""])
      setTags([])
      setTagLabel("")
      setOpen(false)
      onCreated(result.post)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="min-h-11 self-start bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Create Post
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

        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Share what you worked on, what you learned, or what happened at the comp..."
          maxLength={2000}
          className="min-h-28"
        />

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            {imageUrls.map((imageUrl, index) => (
              <div key={`image-${index}`} className="relative flex gap-2">
                <div className="relative flex-1">
                  <ImagePlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={imageUrl}
                    onChange={(event) =>
                      setImageUrls((prev) => prev.map((value, currentIndex) => currentIndex === index ? event.target.value : value))
                    }
                    placeholder={`Image URL ${index + 1} (optional for preview)`}
                    className="min-h-11 pl-10"
                  />
                </div>
                {imageUrls.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() =>
                      setImageUrls((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {imageUrls.length < 4 ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setImageUrls((prev) => [...prev, ""])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Image
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Select value={tagType} onValueChange={(value) => setTagType(value as PostTagType)}>
              <SelectTrigger className="min-h-11 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAG_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={tagLabel}
              onChange={(event) => setTagLabel(event.target.value)}
              placeholder="Tag label"
              className="min-h-11"
              maxLength={60}
            />
            <Button type="button" variant="outline" className="min-h-11" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={`${tag.tagType}-${tag.label}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-secondary/50 px-3 py-1 text-xs text-foreground"
              >
                {tag.tagType}: {tag.label}
                <button
                  type="button"
                  onClick={() =>
                    setTags((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                  }
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Remove ${tag.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Training-first posts with optional photos and tags.
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
