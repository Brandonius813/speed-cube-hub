"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type TimeInputProps = {
  onSubmit: (timeMs: number) => void
  disabled?: boolean
}

/**
 * Format a raw digit string into stackmat display format.
 * Digits fill right-to-left: last 2 = centiseconds, next 2 = seconds, rest = minutes.
 *
 * Examples:
 *   "1032"  → "10.32"      (10.32 seconds)
 *   "532"   → "5.32"       (5.32 seconds)
 *   "10326" → "1:03.26"    (1 min 3.26 sec)
 *   "50000" → "5:00.00"    (5 min 0 sec)
 *   ""      → "0.00"
 */
function formatStackmat(digits: string): string {
  if (digits.length === 0) return "0.00"

  const padded = digits.padStart(5, "0")
  const cs = padded.slice(-2)
  const sec = padded.slice(-4, -2)
  const min = padded.slice(0, -4)

  const minNum = parseInt(min, 10)

  if (minNum > 0) {
    return `${minNum}:${sec}.${cs}`
  }
  return `${parseInt(sec, 10)}.${cs}`
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

export function TimeInput({ onSubmit, disabled = false }: TimeInputProps) {
  const [digits, setDigits] = useState("")
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the hidden input on mount
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
        // Strip leading zeros as user types (except the digit itself)
        setDigits((prev) => {
          const next = prev + e.key
          // Remove leading zeros
          return next.replace(/^0+/, "") || e.key === "0" ? next.replace(/^0+(?=\d)/, "") : next
        })
        return
      }

      // Block everything else
      e.preventDefault()
    },
    [disabled, digits, handleSubmit]
  )

  // Global keyboard listener so user doesn't have to click the input
  useEffect(() => {
    if (disabled) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't capture if focused on another input
      if (
        e.target instanceof HTMLInputElement &&
        e.target !== inputRef.current
      ) {
        return
      }
      if (e.target instanceof HTMLTextAreaElement) return

      // Focus our hidden input so it captures the keystroke
      if (/^[0-9]$/.test(e.key) || e.key === "Backspace" || e.key === "Enter" || e.key === "Escape") {
        inputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [disabled])

  const displayText = formatStackmat(digits)
  const timeMs = digitsToMs(digits)
  const hasValue = digits.length > 0

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 select-none"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Hidden input to capture keyboard */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className="sr-only"
        value={digits}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-label="Type time"
      />

      {/* Big time display */}
      <div
        className={cn(
          "font-mono text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tabular-nums tracking-tight transition-colors duration-150",
          hasValue ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {displayText}
      </div>

      {/* Hint text */}
      <p className="mt-4 text-sm text-muted-foreground">
        {hasValue
          ? `Press Enter to log${timeMs >= 60000 ? "" : ""} · Esc to clear`
          : "Type a time (e.g. 1032 = 10.32s)"}
      </p>
    </div>
  )
}
