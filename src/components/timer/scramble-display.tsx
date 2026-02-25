"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type ScrambleDisplayProps = {
  scramble: string | null
  isLoading: boolean
}

export function ScrambleDisplay({ scramble, isLoading }: ScrambleDisplayProps) {
  const [copied, setCopied] = useState(false)

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

  if (isLoading) {
    return (
      <div className="w-full px-4 py-3 text-center">
        <div className="h-6 w-48 mx-auto bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!scramble) {
    return (
      <div className="w-full px-4 py-3 text-center text-muted-foreground text-sm">
        Select an event to generate a scramble
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-3">
      <div className="flex items-start justify-center gap-2">
        <p
          className={cn(
            "font-mono text-center leading-relaxed break-words max-w-full",
            getFontSize()
          )}
        >
          {scramble}
        </p>
        <button
          onClick={handleCopy}
          className="shrink-0 p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
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
  )
}
