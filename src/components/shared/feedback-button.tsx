"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { MessageSquarePlus } from "lucide-react"

const FeedbackModal = dynamic(
  () =>
    import("@/components/shared/feedback-modal").then(
      (module) => module.FeedbackModal
    ),
  {
    ssr: false,
  }
)

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [shouldRenderModal, setShouldRenderModal] = useState(false)

  return (
    <>
      <button
        type="button"
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => {
          setShouldRenderModal(true)
          setOpen(true)
        }}
      >
        <MessageSquarePlus className="h-4 w-4" />
        Send Feedback
      </button>
      {shouldRenderModal ? (
        <FeedbackModal open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  )
}
