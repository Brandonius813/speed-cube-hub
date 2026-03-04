"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPracticeTypesForEvent } from "@/lib/constants"

type PracticeModeSelectorProps = {
  eventId: string
  selectedType: string
  onTypeChange: (type: string) => void
}

const COMMON_TYPES = new Set(["Solves", "Slow Solves", "Comp Sim", "Untimed Practice"])

export function PracticeModeSelector({
  eventId,
  selectedType,
  onTypeChange,
}: PracticeModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  const allTypes = getPracticeTypesForEvent(eventId)
  const commonTypes = allTypes.filter((t) => COMMON_TYPES.has(t))
  const eventTypes = allTypes.filter((t) => !COMMON_TYPES.has(t))
  const isNonDefault = selectedType !== "Solves"

  const handleSelect = (type: string) => {
    onTypeChange(type)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
          "hover:bg-secondary/80",
          isNonDefault
            ? "bg-primary/15 text-primary hover:bg-primary/25"
            : "bg-secondary/50 text-muted-foreground"
        )}
      >
        {selectedType}
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-[70vh] overflow-y-auto">
          {commonTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition-colors",
                selectedType === type
                  ? "bg-secondary/50 text-foreground font-medium"
                  : "hover:bg-secondary/50 text-muted-foreground"
              )}
            >
              {type}
            </button>
          ))}

          {eventTypes.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="px-3 py-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Event-Specific
                </span>
              </div>
              {eventTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors",
                    selectedType === type
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-secondary/50 text-foreground"
                  )}
                >
                  {type}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
