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
import { updatePBVisibleTypes, updatePBMainEvents } from "@/lib/actions/profiles"
import { WCA_EVENTS } from "@/lib/constants"
import { EventOrderTab } from "@/components/pbs/event-order-tab"

/**
 * All possible PB types across all events, in a logical order.
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

type Tab = "types" | "order"

export function PBSettingsModal({
  open,
  onOpenChange,
  currentVisibleTypes,
  currentMainEvents,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVisibleTypes: string[] | null
  currentMainEvents: string[] | null
  onSaved: (types: string[] | null, mainEvents: string[] | null) => void
}) {
  const [tab, setTab] = useState<Tab>("types")

  // ── PB Types state ──
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!currentVisibleTypes) return new Set(ALL_PB_TYPES.map((t) => t.id))
    return new Set(currentVisibleTypes)
  })

  // ── Event Order state ──
  // First 3 entries in the saved array are "main events", rest are ordered other events
  const [mainEvents, setMainEvents] = useState<string[]>(
    () => (currentMainEvents ?? []).slice(0, 3)
  )
  const [orderedOtherEvents, setOrderedOtherEvents] = useState<string[]>(
    () => (currentMainEvents ?? []).slice(3)
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── PB Types handlers ──
  function handleToggle(typeId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(typeId)) {
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

  const MAX_MAIN_EVENTS = 3

  // ── Event Order handlers ──
  function addToMain(eventId: string) {
    if (mainEvents.length >= MAX_MAIN_EVENTS) return
    setMainEvents((prev) => [...prev, eventId])
    setOrderedOtherEvents((prev) => prev.filter((id) => id !== eventId))
  }

  function removeFromMain(eventId: string) {
    setMainEvents((prev) => prev.filter((id) => id !== eventId))
  }

  function moveMainUp(index: number) {
    if (index === 0) return
    setMainEvents((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveMainDown(index: number) {
    setMainEvents((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function moveOtherUp(index: number) {
    if (index === 0) return
    setOrderedOtherEvents((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveOtherDown(index: number) {
    setOrderedOtherEvents((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function addToOtherEvents(eventId: string) {
    setOrderedOtherEvents((prev) => [...prev, eventId])
  }

  function removeFromOtherEvents(eventId: string) {
    setOrderedOtherEvents((prev) => prev.filter((id) => id !== eventId))
  }

  const mainEventSet = new Set(mainEvents)
  const orderedOtherSet = new Set(orderedOtherEvents)
  const unorderedEvents = WCA_EVENTS.filter(
    (e) => !mainEventSet.has(e.id) && !orderedOtherSet.has(e.id)
  )
  const mainLimitReached = mainEvents.length >= MAX_MAIN_EVENTS

  function getEventLabel(eventId: string): string {
    return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
  }

  // ── Save ──
  async function handleSave() {
    setError(null)
    setSaving(true)

    const typesToSave = allSelected
      ? null
      : ALL_PB_TYPES.filter((t) => selected.has(t.id)).map((t) => t.id)

    const fullOrder = [...mainEvents, ...orderedOtherEvents]
    const mainToSave = fullOrder.length === 0 ? null : fullOrder

    const [typesResult, mainResult] = await Promise.all([
      updatePBVisibleTypes(typesToSave),
      updatePBMainEvents(mainToSave),
    ])

    setSaving(false)

    if (!typesResult.success) {
      setError(typesResult.error ?? "Failed to save PB types.")
      return
    }
    if (!mainResult.success) {
      setError(mainResult.error ?? "Failed to save event order.")
      return
    }

    onSaved(typesToSave, mainToSave)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>PB Settings</DialogTitle>
          <DialogDescription>
            Customize which PB types to show and organize your events.
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
          <button
            onClick={() => setTab("types")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "types"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            PB Types
          </button>
          <button
            onClick={() => setTab("order")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "order"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Event Order
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "types" ? (
            <PBTypesTab
              selected={selected}
              allSelected={allSelected}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
            />
          ) : (
            <EventOrderTab
              mainEvents={mainEvents}
              maxMainEvents={MAX_MAIN_EVENTS}
              mainLimitReached={mainLimitReached}
              orderedOtherEvents={orderedOtherEvents}
              unorderedEvents={unorderedEvents}
              getEventLabel={getEventLabel}
              onAddToMain={addToMain}
              onRemoveFromMain={removeFromMain}
              onMoveMainUp={moveMainUp}
              onMoveMainDown={moveMainDown}
              onAddToOther={addToOtherEvents}
              onRemoveFromOther={removeFromOtherEvents}
              onMoveOtherUp={moveOtherUp}
              onMoveOtherDown={moveOtherDown}
            />
          )}
        </div>

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

// ── PB Types Tab ──
function PBTypesTab({
  selected,
  allSelected,
  onToggle,
  onSelectAll,
}: {
  selected: Set<string>
  allSelected: boolean
  onToggle: (id: string) => void
  onSelectAll: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {ALL_PB_TYPES.map((type) => (
        <label
          key={type.id}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 transition cursor-pointer hover:bg-secondary/80 min-h-11"
        >
          <input
            type="checkbox"
            checked={selected.has(type.id)}
            onChange={() => onToggle(type.id)}
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
      <button
        onClick={onSelectAll}
        disabled={allSelected}
        className="self-start text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline px-3 mt-1"
      >
        Select All
      </button>
    </div>
  )
}

