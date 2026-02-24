"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type ShareButtonProps = {
  /** "session" or "pb" */
  type: "session" | "pb"
  name: string
  handle: string
  event: string
  time?: string | null
  solves?: string | null
}

function buildShareUrl(props: ShareButtonProps): string {
  const params = new URLSearchParams()
  params.set("type", props.type)
  params.set("name", props.name)
  params.set("event", props.event)
  if (props.time) params.set("time", props.time)
  if (props.solves) params.set("solves", props.solves)
  if (props.handle) params.set("handle", props.handle)

  // Use the production domain for share URLs so the OG image always works
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.speedcubehub.com"

  return `${baseUrl}/api/og?${params.toString()}`
}

function buildShareText(props: ShareButtonProps): string {
  const eventLabels: Record<string, string> = {
    "222": "2x2", "333": "3x3", "444": "4x4", "555": "5x5",
    "666": "6x6", "777": "7x7", "333bf": "3x3 BLD", "444bf": "4x4 BLD",
    "555bf": "5x5 BLD", "333mbf": "Multi-BLD", "333oh": "3x3 OH",
    minx: "Megaminx", pyram: "Pyraminx", clock: "Clock",
    skewb: "Skewb", sq1: "Square-1", "333fm": "FMC",
  }
  const eventLabel = eventLabels[props.event] || props.event

  if (props.type === "pb") {
    return `${props.name} hit a new PB in ${eventLabel}! Check it out on SpeedCubeHub`
  }
  return `${props.name} logged a ${eventLabel} practice session on SpeedCubeHub`
}

export function ShareButton(props: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const shareUrl = buildShareUrl(props)
    const shareText = buildShareText(props)

    // Try the Web Share API first (available on mobile browsers)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "SpeedCubeHub",
          text: shareText,
          url: shareUrl,
        })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available — ignore silently
    }
  }

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        "hover:bg-secondary/50 active:scale-95",
        copied
          ? "text-green-500"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-label="Share session"
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {copied && (
        <span className="text-xs font-medium">Copied!</span>
      )}
    </button>
  )
}
