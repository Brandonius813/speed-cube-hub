"use client"

import { useState, useEffect } from "react"
import { Filter, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  getCaseSet,
  hasCaseFiltering,
  type AlgorithmCaseSet,
} from "@/lib/timer/algorithm-cases"

type CaseFilterPanelProps = {
  cstimerType: string
  selectedCases: number[] | null // null = all cases (no filter)
  onSelectedCasesChange: (cases: number[] | null) => void
}

const STORAGE_PREFIX = "sch_case_filter_"

/**
 * Load persisted case filter for a given cstimer type.
 * Returns null (all cases) if nothing is stored.
 */
export function loadCaseFilter(cstimerType: string): number[] | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${cstimerType}`)
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Save case filter to localStorage.
 * Pass null to clear the filter (all cases).
 */
export function saveCaseFilter(cstimerType: string, cases: number[] | null) {
  if (typeof window === "undefined") return
  if (cases === null) {
    localStorage.removeItem(`${STORAGE_PREFIX}${cstimerType}`)
  } else {
    localStorage.setItem(`${STORAGE_PREFIX}${cstimerType}`, JSON.stringify(cases))
  }
}

export function CaseFilterPanel({
  cstimerType,
  selectedCases,
  onSelectedCasesChange,
}: CaseFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const caseSet = getCaseSet(cstimerType)

  if (!caseSet || !hasCaseFiltering(cstimerType)) return null

  const allIndices = caseSet.cases.map((c) => c.index)
  const isAllSelected = selectedCases === null
  const selectedSet = new Set(selectedCases ?? allIndices)
  const selectedCount = isAllSelected ? caseSet.totalCases : selectedCases!.length

  const toggleCase = (index: number) => {
    if (isAllSelected) {
      // Switch from "all" to "all except this one"
      const newCases = allIndices.filter((i) => i !== index)
      onSelectedCasesChange(newCases)
    } else {
      const current = selectedCases!
      if (current.includes(index)) {
        const newCases = current.filter((i) => i !== index)
        // If none selected, reset to all
        onSelectedCasesChange(newCases.length === 0 ? null : newCases)
      } else {
        const newCases = [...current, index].sort((a, b) => a - b)
        // If all selected, set to null (all)
        onSelectedCasesChange(
          newCases.length === caseSet.totalCases ? null : newCases
        )
      }
    }
  }

  const selectAll = () => onSelectedCasesChange(null)

  const deselectAll = () => {
    // Select only the first case to avoid having zero
    onSelectedCasesChange([allIndices[0]])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
          "hover:bg-secondary/80",
          !isAllSelected
            ? "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25"
            : "bg-secondary/50 text-muted-foreground"
        )}
      >
        <Filter className="h-3 w-3" />
        {isAllSelected ? "All" : `${selectedCount}/${caseSet.totalCases}`}
      </button>

      {isOpen && (
        <CaseFilterDropdown
          caseSet={caseSet}
          selectedSet={selectedSet}
          isAllSelected={isAllSelected}
          selectedCount={selectedCount}
          onToggle={toggleCase}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

function CaseFilterDropdown({
  caseSet,
  selectedSet,
  isAllSelected,
  selectedCount,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
}: {
  caseSet: AlgorithmCaseSet
  selectedSet: Set<number>
  isAllSelected: boolean
  selectedCount: number
  onToggle: (index: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onClose: () => void
}) {
  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-case-filter]")) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  return (
    <div
      data-case-filter
      className="absolute left-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">
          {caseSet.label} Cases ({selectedCount}/{caseSet.totalCases})
        </span>
        <button onClick={onClose} className="p-0.5 hover:bg-secondary/50 rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-1 px-3 py-2 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onSelectAll}
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onDeselectAll}
        >
          Deselect All
        </Button>
      </div>

      {/* Case grid */}
      <div className="max-h-[50vh] overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-1">
          {caseSet.cases.map((c) => {
            const isSelected = selectedSet.has(c.index)
            return (
              <button
                key={c.index}
                onClick={() => onToggle(c.index)}
                className={cn(
                  "relative flex items-center justify-center px-1 py-1.5 rounded text-xs font-medium transition-colors min-h-[32px]",
                  isSelected
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-secondary/30 text-muted-foreground border border-transparent hover:bg-secondary/50"
                )}
              >
                {isSelected && (
                  <Check className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-primary" />
                )}
                <span className="truncate">{c.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
