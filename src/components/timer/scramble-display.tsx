"use client"

import { useState } from "react"
import { Copy, Check, Image, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrambleImage } from "@/components/timer/scramble-image"
import { CrossSolverPanel } from "@/components/timer/cross-solver-panel"

type ScrambleDisplayProps = {
  scramble: string | null
  event?: string
}

export function ScrambleDisplay({ scramble, event }: ScrambleDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [showCross, setShowCross] = useState(false)
  const is3x3 = event === "333"

  const handleCopy = async () => {
    if (!scramble) return
    try {
      await navigator.clipboard.writeText(scramble)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  // Adjust font size based on scramble length
  const getFontSize = () => {
    if (!scramble) return "text-base sm:text-lg"
    const len = scramble.length
    if (len < 30) return "text-lg sm:text-xl md:text-2xl"
    if (len < 60) return "text-base sm:text-lg md:text-xl"
    if (len < 100) return "text-sm sm:text-base md:text-lg"
    return "text-xs sm:text-sm md:text-base"
  }

  if (!scramble) {
    return (
      <div className="w-full px-4 py-3 text-center text-muted-foreground text-sm">
        Select an event to generate a scramble
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-3 space-y-2">
      <div className="flex items-start justify-center gap-2">
        <p
          className={cn(
            "font-mono text-center leading-relaxed break-words max-w-full",
            getFontSize()
          )}
        >
          {scramble}
        </p>
        <div className="flex shrink-0 gap-0.5">
          {is3x3 && (
            <button
              onClick={() => setShowCross(!showCross)}
              className={cn(
                "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                showCross && "bg-secondary text-foreground"
              )}
              title={showCross ? "Hide cross solutions" : "Show cross solutions"}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowImage(!showImage)}
            className={cn(
              "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
              showImage && "bg-secondary text-foreground"
            )}
            title={showImage ? "Hide scramble image" : "Show scramble image"}
          >
            <Image className="h-4 w-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Copy scramble"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {showImage && event && (
        <ScrambleImage scramble={scramble} event={event} />
      )}
      {showCross && is3x3 && (
        <CrossSolverPanel scramble={scramble} />
      )}
    </div>
  )
}
