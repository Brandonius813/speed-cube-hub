"use client"

import { useState, useEffect } from "react"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  getCaseSet,
  hasCaseFiltering,
  type AlgorithmCase,
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

/** Group cases by their `group` field, preserving the order first seen. */
function groupCases(cases: AlgorithmCase[]): [string, AlgorithmCase[]][] {
  const map = new Map<string, AlgorithmCase[]>()
  for (const c of cases) {
    const key = c.group ?? "Other"
    const existing = map.get(key)
    if (existing) {
      existing.push(c)
    } else {
      map.set(key, [c])
    }
  }
  return Array.from(map.entries())
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

  const groups = groupCases(caseSet.cases)

  return (
    <div
      data-case-filter
      className="absolute left-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
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

      {/* Case grid — grouped by shape/category */}
      <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
        {groups.map(([groupName, cases]) => (
          <div key={groupName}>
            {/* Group header */}
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
              {groupName}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {cases.map((c) => {
                const isSelected = selectedSet.has(c.index)
                return (
                  <button
                    key={c.index}
                    onClick={() => onToggle(c.index)}
                    className={cn(
                      "flex items-center justify-center rounded-md text-xs font-semibold transition-all min-h-[44px] min-w-[44px] px-1",
                      isSelected
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : "bg-secondary/40 text-foreground border border-border hover:bg-secondary/70 hover:border-primary/40"
                    )}
                    title={c.name}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
