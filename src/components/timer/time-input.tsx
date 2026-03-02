"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type TimeInputProps = {
  onSubmit: (timeMs: number) => void
  disabled?: boolean
  onSpacebar?: () => void
}

/**
 * Convert a raw digit string to milliseconds.
 * Last 2 digits = centiseconds, next 2 = seconds, rest = minutes.
 */
function digitsToMs(digits: string): number {
  if (digits.length === 0) return 0

  const padded = digits.padStart(5, "0")
  const cs = parseInt(padded.slice(-2), 10)
  const sec = parseInt(padded.slice(-4, -2), 10)
  const min = parseInt(padded.slice(0, -4), 10)

  return min * 60000 + sec * 1000 + cs * 10
}

export function TimeInput({ onSubmit, disabled = false, onSpacebar }: TimeInputProps) {
  const [digits, setDigits] = useState("")
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Re-focus after submission
  useEffect(() => {
    if (hasSubmitted) {
      inputRef.current?.focus()
      setHasSubmitted(false)
    }
  }, [hasSubmitted])

  const handleSubmit = useCallback(() => {
    if (digits.length === 0) return

    const timeMs = digitsToMs(digits)
    if (timeMs <= 0) return

    onSubmit(timeMs)
    setDigits("")
    setHasSubmitted(true)
  }, [digits, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      // Spacebar → trigger inspection callback
      if (e.key === " ") {
        e.preventDefault()
        onSpacebar?.()
        return
      }

      // Enter = submit
      if (e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
        return
      }

      // Escape = clear
      if (e.key === "Escape") {
        e.preventDefault()
        setDigits("")
        return
      }

      // Backspace = remove last digit
      if (e.key === "Backspace") {
        e.preventDefault()
        setDigits((prev) => prev.slice(0, -1))
        return
      }

      // Only allow digits 0-9, max 7 digits (up to 99:59.99)
      if (/^[0-9]$/.test(e.key) && digits.length < 7) {
        e.preventDefault()
        setDigits((prev) => {
          const next = prev + e.key
          return next.replace(/^0+(?=\d)/, "")
        })
        return
      }

      // Block everything else from modifying the value
      if (e.key !== "Tab") {
        e.preventDefault()
      }
    },
    [disabled, digits, handleSubmit, onSpacebar]
  )

  // Global keyboard listener so user can type anywhere on the page
  useEffect(() => {
    if (disabled) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement &&
        e.target !== inputRef.current
      ) {
        return
      }
      if (e.target instanceof HTMLTextAreaElement) return

      if (/^[0-9]$/.test(e.key) || e.key === "Backspace" || e.key === "Enter" || e.key === "Escape") {
        inputRef.current?.focus()
      }

      // Route spacebar to the hidden input so handleKeyDown catches it
      if (e.key === " ") {
        e.preventDefault()
        onSpacebar?.()
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [disabled, onSpacebar])

  const hasValue = digits.length > 0

  return (
    // label wrapping the input means clicking anywhere in the area focuses the input
    <label className="flex flex-col items-center justify-center flex-1 cursor-text relative">
      {/* Hidden input — tiny + invisible, but fully functional (no clip, so it works in all browsers) */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className="absolute top-0 left-0 w-px h-px opacity-0 border-0 outline-none"
        value={digits}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-label="Type time"
      />

      {/* Large clickable input area — like csTimer / CubeDesk */}
      <div
        className={cn(
          "w-full max-w-2xl mx-auto rounded-2xl border-2 bg-background/50 transition-colors flex items-center justify-center h-40 sm:h-52",
          hasValue
            ? "border-primary/60 shadow-[0_0_30px_-4px] shadow-primary/20"
            : "border-border/60 hover:border-border"
        )}
      >
        {/* Blinking cursor — sized to match the box */}
        <span className="font-mono text-6xl sm:text-7xl text-muted-foreground/40 animate-pulse select-none leading-none">|</span>
      </div>
    </label>
  )
}
