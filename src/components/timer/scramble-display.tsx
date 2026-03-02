"use client"

import { useState } from "react"
import { Check, Image, Plus, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrambleImage } from "@/components/timer/scramble-image"
import type { ScrambleSize } from "@/components/timer/timer-settings"

type ActiveTool = "cross" | "eo" | "analyzer" | null

type ScrambleDisplayProps = {
  scramble: string | null
  event?: string
  scrambleSize: ScrambleSize
  /** Currently open floating tool (controlled by timer-content) */
  activeTool?: ActiveTool
  /** Called when a tool button is clicked; timer-content renders the panel */
  onSetActiveTool?: (tool: ActiveTool) => void
}

export function ScrambleDisplay({
  scramble,
  event,
  scrambleSize,
  activeTool,
  onSetActiveTool,
}: ScrambleDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const is3x3 = event === "333"
  const isRelay = event?.startsWith("relay")
  const hasSolver = ["333", "333oh", "222", "pyram", "skewb"].includes(event ?? "")

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

  const toggleTool = (tool: "cross" | "analyzer") => {
    if (!onSetActiveTool) return
    onSetActiveTool(activeTool === tool ? null : tool)
  }

  const getFontSize = () => {
    if (scrambleSize === "small") return "text-xs sm:text-sm"
    if (scrambleSize === "medium") return "text-sm sm:text-base md:text-lg"
    if (scrambleSize === "large") return "text-lg sm:text-xl md:text-2xl"
    // Auto: scale based on scramble length
    if (!scramble) return "text-base sm:text-lg"
    const len = scramble.length
    if (len < 30) return "text-lg sm:text-xl md:text-2xl"
    if (len < 60) return "text-base sm:text-lg md:text-xl"
    if (len < 100) return "text-sm sm:text-base md:text-lg"
    return "text-xs sm:text-sm md:text-base"
  }

  if (!scramble) {
    return (
      <div className="w-full py-1 text-center text-muted-foreground text-sm">
        Select an event to generate a scramble
      </div>
    )
  }

  return (
    <div className="w-full py-1 space-y-1.5">
      <div className="flex items-start justify-center gap-2">
        {isRelay && scramble.includes("\n") ? (
          <div className="w-full space-y-2 font-mono">
            {scramble.split("\n").filter(Boolean).map((line, i) => {
              const match = line.match(/^(\d+)\)\s*(.+)$/)
              const cubeSize = match ? match[1] : String(i + 2)
              const moves = match ? match[2].trim() : line.trim()
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="shrink-0 text-xs font-semibold bg-secondary/70 text-muted-foreground rounded px-1.5 py-0.5 mt-0.5">
                    {cubeSize}x{cubeSize}
                  </span>
                  <span className={cn("leading-relaxed break-words min-w-0", getFontSize())}>
                    {moves}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <button
            onClick={handleCopy}
            className={cn(
              "text-center leading-relaxed break-words max-w-full font-mono cursor-pointer hover:text-foreground/80 transition-colors",
              getFontSize(),
              copied && "text-green-400"
            )}
            title={copied ? "Copied!" : "Click to copy scramble"}
          >
            {scramble}
          </button>
        )}
        <div className="flex shrink-0 gap-0.5">
          {copied && (
            <span className="p-1.5 text-green-400">
              <Check className="h-4 w-4" />
            </span>
          )}
          {hasSolver && onSetActiveTool && (
            <button
              onClick={() => toggleTool("analyzer")}
              className={cn(
                "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                activeTool === "analyzer" && "bg-secondary text-foreground"
              )}
              title={activeTool === "analyzer" ? "Hide analysis" : "Show puzzle analysis"}
            >
              <Zap className="h-4 w-4" />
            </button>
          )}
          {is3x3 && onSetActiveTool && (
            <button
              onClick={() => toggleTool("cross")}
              className={cn(
                "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                activeTool === "cross" && "bg-secondary text-foreground"
              )}
              title={activeTool === "cross" ? "Hide cross solutions" : "Show cross solutions"}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {!isRelay && (
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
          )}
        </div>
      </div>
      {showImage && event && scramble && (
        <ScrambleImage scramble={scramble} event={event} />
      )}
    </div>
  )
}
