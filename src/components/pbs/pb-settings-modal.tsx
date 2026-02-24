"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { updatePBVisibleTypes } from "@/lib/actions/profiles"

/**
 * All possible PB types across all events, in a logical order.
 * Users toggle which ones they want displayed on their PBs page.
 */
const ALL_PB_TYPES = [
  { id: "Single", label: "Single", description: "Best single solve" },
  { id: "Mo3", label: "Mo3", description: "Mean of 3 (BLD, 6x6, 7x7, FMC)" },
  { id: "Ao5", label: "Ao5", description: "Average of 5" },
  { id: "Ao12", label: "Ao12", description: "Average of 12" },
  { id: "Ao25", label: "Ao25", description: "Average of 25 (4x4, 5x5)" },
  { id: "Ao50", label: "Ao50", description: "Average of 50" },
  { id: "Ao100", label: "Ao100", description: "Average of 100" },
  { id: "Ao200", label: "Ao200", description: "Average of 200 (3x3)" },
  { id: "Ao1000", label: "Ao1000", description: "Average of 1000 (3x3)" },
]

export function PBSettingsModal({
  open,
  onOpenChange,
  currentVisibleTypes,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVisibleTypes: string[] | null
  onSaved: (types: string[] | null) => void
}) {
  // If null (no preference), all types are selected
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!currentVisibleTypes) {
      return new Set(ALL_PB_TYPES.map((t) => t.id))
    }
    return new Set(currentVisibleTypes)
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleToggle(typeId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(typeId)) {
        // Don't allow deselecting everything — keep at least Single
        if (next.size <= 1) return prev
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return next
    })
  }

  function handleSelectAll() {
    setSelected(new Set(ALL_PB_TYPES.map((t) => t.id)))
  }

  const allSelected = selected.size === ALL_PB_TYPES.length

  async function handleSave() {
    setError(null)
    setSaving(true)

    // If all types are selected, save null (meaning "show all" — no filter)
    const typesToSave = allSelected
      ? null
      : ALL_PB_TYPES.filter((t) => selected.has(t.id)).map((t) => t.id)

    const result = await updatePBVisibleTypes(typesToSave)
    setSaving(false)

    if (!result.success) {
      setError(result.error ?? "Failed to save settings.")
      return
    }

    onSaved(typesToSave)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Customize PB Types</DialogTitle>
          <DialogDescription>
            Choose which PB types to show on your page. Uncheck the ones you
            don&apos;t track.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          {ALL_PB_TYPES.map((type) => (
            <label
              key={type.id}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 transition cursor-pointer hover:bg-secondary/80 min-h-11"
            >
              <input
                type="checkbox"
                checked={selected.has(type.id)}
                onChange={() => handleToggle(type.id)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {type.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {type.description}
                </span>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSelectAll}
          disabled={allSelected}
          className="self-start text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline px-3"
        >
          Select All
        </button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
