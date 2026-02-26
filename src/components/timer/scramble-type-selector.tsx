"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getTrainingTypes,
  NORMAL_SCRAMBLE_ID,
  type TrainingScrambleType,
} from "@/lib/timer/training-scrambles"

type ScrambleTypeSelectorProps = {
  eventId: string
  selectedTypeId: string
  onTypeChange: (typeId: string) => void
}

export function ScrambleTypeSelector({
  eventId,
  selectedTypeId,
  onTypeChange,
}: ScrambleTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const trainingTypes = getTrainingTypes(eventId)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  // Don't render if no training types for this event
  if (trainingTypes.length === 0) return null

  const selectedType = trainingTypes.find((t) => t.id === selectedTypeId)
  const label = selectedType?.label ?? "Normal"
  const isTraining = selectedTypeId !== NORMAL_SCRAMBLE_ID

  const handleSelect = (typeId: string) => {
    onTypeChange(typeId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
          "hover:bg-secondary/80",
          isTraining
            ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
            : "bg-secondary/50 text-muted-foreground"
        )}
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
          {/* Normal option */}
          <button
            onClick={() => handleSelect(NORMAL_SCRAMBLE_ID)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors",
              selectedTypeId === NORMAL_SCRAMBLE_ID
                ? "bg-secondary/50 text-foreground"
                : "hover:bg-secondary/50 text-muted-foreground"
            )}
          >
            <span className="font-medium">Normal</span>
            <span className="block text-xs text-muted-foreground">
              Standard random-state scramble
            </span>
          </button>

          {/* Divider */}
          <div className="h-px bg-border my-1" />

          {/* Training types grouped by category */}
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Training
            </span>
          </div>

          {trainingTypes.map((type) => (
            <TrainingOption
              key={type.id}
              type={type}
              isSelected={selectedTypeId === type.id}
              onSelect={() => handleSelect(type.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrainingOption({
  type,
  isSelected,
  onSelect,
}: {
  type: TrainingScrambleType
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2 text-sm transition-colors",
        isSelected
          ? "bg-amber-500/10 text-amber-400"
          : "hover:bg-secondary/50 text-foreground"
      )}
    >
      <span className="font-medium">{type.label}</span>
      <span className="block text-xs text-muted-foreground">
        {type.description}
      </span>
    </button>
  )
}
