"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Link2, Link2Off, Copy, Check, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"

const SEED_KEY = "sch_race_seed"

type SeedInputProps = {
  seed: string | null
  onSeedChange: (seed: string | null) => void
}

/** Generate a short random seed code (6 chars, uppercase alphanumeric) */
function generateSeedCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no I/O/0/1 for readability
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function SeedInput({ seed, onSeedChange }: SeedInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editValue, setEditValue] = useState(seed ?? "")
  const [copied, setCopied] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  const handleApply = useCallback(() => {
    const trimmed = editValue.trim().toUpperCase()
    if (trimmed) {
      onSeedChange(trimmed)
      localStorage.setItem(SEED_KEY, trimmed)
    }
    setIsOpen(false)
  }, [editValue, onSeedChange])

  const handleClear = useCallback(() => {
    onSeedChange(null)
    setEditValue("")
    localStorage.removeItem(SEED_KEY)
    setIsOpen(false)
  }, [onSeedChange])

  const handleGenerate = useCallback(() => {
    const code = generateSeedCode()
    setEditValue(code)
    onSeedChange(code)
    localStorage.setItem(SEED_KEY, code)
  }, [onSeedChange])

  const handleCopy = useCallback(async () => {
    if (!seed) return
    try {
      await navigator.clipboard.writeText(seed)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [seed])

  const isActive = seed !== null

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => {
          setEditValue(seed ?? "")
          setIsOpen(!isOpen)
        }}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
          "hover:bg-secondary/80",
          isActive
            ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            : "bg-secondary/50 text-muted-foreground"
        )}
        title={isActive ? `Race seed: ${seed}` : "Set race seed for shared scrambles"}
      >
        {isActive ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
        {isActive ? seed : "Race"}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Race Seed</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Share the same seed with a friend to get identical scrambles. Same seed + same event = same scramble sequence.
            </p>
          </div>

          <div className="flex gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply()
                if (e.key === "Escape") setIsOpen(false)
              }}
              placeholder="Enter seed code"
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50"
              maxLength={20}
            />
            <button
              onClick={handleGenerate}
              className="p-1.5 rounded-md border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Generate random seed"
            >
              <Shuffle className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              disabled={!editValue.trim()}
              className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply Seed
            </button>
            {isActive && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy seed"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Load persisted seed from localStorage */
export function loadPersistedSeed(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(SEED_KEY)
}
