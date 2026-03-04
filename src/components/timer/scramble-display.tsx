"use client"

import { useState, useRef, useEffect } from "react"
import { Copy, Check, Image, Plus, Pencil, X, Settings, Play, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrambleImage } from "@/components/timer/scramble-image"
import { ScrambleAnimator } from "@/components/timer/scramble-animator"
import { CrossSolverPanel } from "@/components/timer/cross-solver-panel"
import { SolverPanel } from "@/components/timer/solver-panel"

type ScrambleSize = "auto" | "small" | "medium" | "large"
type ScrambleFont = "mono" | "sans"

const SCRAMBLE_SIZE_KEY = "sch_scramble_size"
const SCRAMBLE_FONT_KEY = "sch_scramble_font"
const SCRAMBLE_COMPACT_KEY = "sch_scramble_compact"

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
  const [showSettings, setShowSettings] = useState(false)
  const [showAnimator, setShowAnimator] = useState(false)
  const [showSolver, setShowSolver] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const is3x3 = event === "333"
  const isRelay = event?.startsWith("relay")
  const hasSolver = ["333", "333oh", "222", "pyram", "skewb"].includes(event ?? "")

  // Scramble display settings (persisted to localStorage)
  const [scrambleSize, setScrambleSize] = useState<ScrambleSize>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SCRAMBLE_SIZE_KEY)
      if (stored === "small" || stored === "medium" || stored === "large") return stored
    }
    return "auto"
  })
  const [scrambleFont, setScrambleFont] = useState<ScrambleFont>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SCRAMBLE_FONT_KEY) === "sans" ? "sans" : "mono"
    }
    return "mono"
  })
  const [compactMode, setCompactMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SCRAMBLE_COMPACT_KEY) === "true"
    }
    return false
  })

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showSettings])

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

  // Adjust font size based on scramble length or manual override
  const getFontSize = () => {
    if (scrambleSize === "small") return "text-sm sm:text-base"
    if (scrambleSize === "medium") return "text-base sm:text-lg md:text-xl"
    if (scrambleSize === "large") return "text-xl sm:text-2xl md:text-3xl"
    // Auto: scale based on scramble length
    if (!scramble) return "text-lg sm:text-xl"
    const len = scramble.length
    if (len < 30) return "text-xl sm:text-2xl md:text-3xl"
    if (len < 60) return "text-lg sm:text-xl md:text-2xl"
    if (len < 100) return "text-base sm:text-lg md:text-xl"
    return "text-sm sm:text-base md:text-lg"
  }

  const handleSizeChange = (size: ScrambleSize) => {
    setScrambleSize(size)
    localStorage.setItem(SCRAMBLE_SIZE_KEY, size)
  }

  const handleFontChange = (font: ScrambleFont) => {
    setScrambleFont(font)
    localStorage.setItem(SCRAMBLE_FONT_KEY, font)
  }

  const handleCompactChange = (compact: boolean) => {
    setCompactMode(compact)
    localStorage.setItem(SCRAMBLE_COMPACT_KEY, String(compact))
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
        ) : isRelay && scramble && scramble.includes("\n") ? (
          <div
            className={cn(
              "w-full space-y-2",
              scrambleFont === "mono" ? "font-mono" : "font-sans",
              onManualScramble && "cursor-pointer hover:text-foreground/80 transition-colors",
              isManualScramble && "text-blue-400",
              compactMode && "max-h-[6em] overflow-y-auto"
            )}
            onClick={onManualScramble ? handleStartEdit : undefined}
            title={onManualScramble ? "Click to edit scramble" : undefined}
          >
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
        ) : scramble && scramble.includes("\n") ? (
          <div
            className={cn(
              "text-center leading-relaxed break-words max-w-full space-y-1",
              scrambleFont === "mono" ? "font-mono" : "font-sans",
              getFontSize(),
              onManualScramble && "cursor-pointer hover:text-foreground/80 transition-colors",
              isManualScramble && "text-blue-400",
              compactMode && "max-h-[6em] overflow-y-auto"
            )}
            onClick={onManualScramble ? handleStartEdit : undefined}
            title={onManualScramble ? "Click to edit scramble" : undefined}
          >
            {scramble.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : (
          <p
            className={cn(
              "text-center leading-relaxed break-words max-w-full",
              scrambleFont === "mono" ? "font-mono" : "font-sans",
              getFontSize(),
              onManualScramble && "cursor-pointer hover:text-foreground/80 transition-colors",
              isManualScramble && "text-blue-400",
              compactMode && "max-h-[3.5em] overflow-y-auto"
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
            {hasSolver && (
              <button
                onClick={() => setShowSolver(!showSolver)}
                className={cn(
                  "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                  showSolver && "bg-secondary text-foreground"
                )}
                title={showSolver ? "Hide analysis" : "Show puzzle analysis"}
              >
                <Zap className="h-4 w-4" />
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
            {!isRelay && (
              <>
                <button
                  onClick={() => { setShowAnimator(!showAnimator); if (!showAnimator) setShowImage(false) }}
                  className={cn(
                    "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                    showAnimator && "bg-secondary text-foreground"
                  )}
                  title={showAnimator ? "Hide scramble animation" : "Animate scramble"}
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowImage(!showImage); if (!showImage) setShowAnimator(false) }}
                  className={cn(
                    "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                    showImage && "bg-secondary text-foreground"
                  )}
                  title={showImage ? "Hide scramble image" : "Show scramble image"}
                >
                  <Image className="h-4 w-4" />
                </button>
              </>
            )}
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
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
                  showSettings && "bg-secondary text-foreground"
                )}
                title="Scramble display settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 py-2 px-3 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Size</span>
                    <div className="flex gap-1 mt-1">
                      {(["auto", "small", "medium", "large"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSizeChange(s)}
                          className={cn(
                            "px-2 py-1 text-xs rounded transition-colors capitalize",
                            scrambleSize === s
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Font</span>
                    <div className="flex gap-1 mt-1">
                      {(["mono", "sans"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => handleFontChange(f)}
                          className={cn(
                            "px-2 py-1 text-xs rounded transition-colors capitalize",
                            scrambleFont === f
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                          )}
                        >
                          {f === "mono" ? "Monospace" : "Sans-serif"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-muted-foreground">Compact mode</span>
                    <button
                      onClick={() => handleCompactChange(!compactMode)}
                      className={cn(
                        "relative w-8 h-4.5 rounded-full transition-colors",
                        compactMode ? "bg-primary" : "bg-secondary"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform",
                        compactMode && "translate-x-3.5"
                      )} />
                    </button>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {showAnimator && event && scramble && (
        <ScrambleAnimator scramble={scramble} event={event} />
      )}
      {showImage && !showAnimator && event && scramble && (
        <ScrambleImage scramble={scramble} event={event} />
      )}
      {showCross && is3x3 && scramble && (
        <CrossSolverPanel scramble={scramble} />
      )}
      {showSolver && hasSolver && scramble && (
        <SolverPanel scramble={scramble} event={event!} />
      )}
    </div>
  )
}
