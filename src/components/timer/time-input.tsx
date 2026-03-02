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

/**
 * Format raw digit string as a time display: M:SS.cs or SS.cs
 */
function formatDigits(digits: string): string {
  if (digits.length === 0) return ""

  const padded = digits.padStart(5, "0")
  const cs = padded.slice(-2)
  const sec = padded.slice(-4, -2)
  const min = parseInt(padded.slice(0, -4), 10)

  if (min > 0) {
    return `${min}:${sec}.${cs}`
  }
  return `${parseInt(sec, 10)}.${cs}`
}

export function TimeInput({ onSubmit, disabled = false, onSpacebar }: TimeInputProps) {
  const [digits, setDigits] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    if (digits.length === 0) return
    const timeMs = digitsToMs(digits)
    if (timeMs <= 0) return
    onSubmit(timeMs)
    setDigits("")
    inputRef.current?.focus()
  }, [digits, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return

      // Spacebar → inspection callback
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

      // Block everything else
      if (e.key !== "Tab") {
        e.preventDefault()
      }
    },
    [disabled, digits, handleSubmit, onSpacebar]
  )

  const displayValue = formatDigits(digits)
  const hasValue = digits.length > 0

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={() => {}} // controlled via keyDown only
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Type solve time"
        className={cn(
          "w-full max-w-2xl h-40 sm:h-52 rounded-2xl border-2 bg-background/50 transition-colors",
          "font-mono text-7xl sm:text-8xl text-center outline-none cursor-text",
          hasValue
            ? "border-primary/60 shadow-[0_0_30px_-4px] shadow-primary/20 text-foreground"
            : "border-border/60 hover:border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
  )
}
