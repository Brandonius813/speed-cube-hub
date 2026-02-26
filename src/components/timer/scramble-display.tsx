"use client"

import { useState, useRef, useEffect } from "react"
import { Copy, Check, Image, Plus, Pencil, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrambleImage } from "@/components/timer/scramble-image"
import { CrossSolverPanel } from "@/components/timer/cross-solver-panel"

type ScrambleDisplayProps = {
  scramble: string | null
  event?: string
  isManualScramble?: boolean
  onManualScramble?: (scramble: string) => void
  onClearManualScramble?: () => void
}

export function ScrambleDisplay({
  scramble,
  event,
  isManualScramble,
  onManualScramble,
  onClearManualScramble,
}: ScrambleDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [showCross, setShowCross] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
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

  const handleStartEdit = () => {
    setEditValue(scramble ?? "")
    setIsEditing(true)
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && onManualScramble) {
      onManualScramble(trimmed)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmitEdit()
    } else if (e.key === "Escape") {
      handleCancelEdit()
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

  if (!scramble && !isEditing) {
    return (
      <div className="w-full px-4 py-3 text-center text-muted-foreground text-sm">
        Select an event to generate a scramble
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-3 space-y-2">
      <div className="flex items-start justify-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Enter scramble notation (e.g. R U R' U')"
              className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 font-mono text-sm sm:text-base text-center resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex items-center justify-center gap-3">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSubmitEdit}
                className="text-xs text-primary hover:underline"
              >
                Apply (Enter)
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCancelEdit}
                className="text-xs text-muted-foreground hover:underline"
              >
                Cancel (Esc)
              </button>
            </div>
          </div>
        ) : (
          <p
            className={cn(
              "font-mono text-center leading-relaxed break-words max-w-full",
              getFontSize(),
              onManualScramble && "cursor-pointer hover:text-foreground/80 transition-colors",
              isManualScramble && "text-blue-400"
            )}
            onClick={onManualScramble ? handleStartEdit : undefined}
            title={onManualScramble ? "Click to edit scramble" : undefined}
          >
            {scramble}
          </p>
        )}
        {!isEditing && (
          <div className="flex shrink-0 gap-0.5">
            {isManualScramble && onClearManualScramble && (
              <button
                onClick={onClearManualScramble}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-blue-400 hover:text-blue-300"
                title="Clear manual scramble (return to auto)"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {onManualScramble && (
              <button
                onClick={handleStartEdit}
                className={cn(
                  "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                  isManualScramble && "text-blue-400"
                )}
                title="Edit scramble"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
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
        )}
      </div>
      {showImage && event && scramble && (
        <ScrambleImage scramble={scramble} event={event} />
      )}
      {showCross && is3x3 && scramble && (
        <CrossSolverPanel scramble={scramble} />
      )}
    </div>
  )
}
