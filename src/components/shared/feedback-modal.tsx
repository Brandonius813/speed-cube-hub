"use client"

import { useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { submitFeedback } from "@/lib/actions/feedback"

const CATEGORIES = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "general", label: "General Feedback" },
  { value: "other", label: "Other" },
] as const

type Category = (typeof CATEGORIES)[number]["value"]

export function FeedbackModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [category, setCategory] = useState<Category>("general")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    const result = await submitFeedback(
      category,
      message,
      window.location.href
    )

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSubmitted(true)
    setTimeout(() => {
      onOpenChange(false)
      // Reset after close animation
      setTimeout(() => {
        setSubmitted(false)
        setCategory("general")
        setMessage("")
      }, 200)
    }, 1500)
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      // Reset on close
      setTimeout(() => {
        setSubmitted(false)
        setError(null)
        setCategory("general")
        setMessage("")
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <MessageSquarePlus className="h-6 w-6" />
            </div>
            <p className="text-lg font-semibold">Thanks for your feedback!</p>
            <p className="text-sm text-muted-foreground">
              We appreciate you helping us improve Speed Cube Hub.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Feedback</DialogTitle>
              <DialogDescription>
                Help us improve Speed Cube Hub. Bug reports, feature ideas, or
                just general thoughts — we read everything.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="feedback-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as Category)}
                >
                  <SelectTrigger id="feedback-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="feedback-message">Message</Label>
                <Textarea
                  id="feedback-message"
                  placeholder="Tell us what's on your mind..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/1000
                </p>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
              >
                {submitting ? "Sending..." : "Send Feedback"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
