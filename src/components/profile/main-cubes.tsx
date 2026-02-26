"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Box,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  History,
} from "lucide-react"
import { updateProfileCubes } from "@/lib/actions/profiles"
import type { ProfileCube, CubeHistoryEntry } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"

export function MainCubes({
  cubes: initial,
  cubeHistory: initialHistory,
  isOwner,
}: {
  cubes: ProfileCube[]
  cubeHistory: CubeHistoryEntry[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [history, setHistory] = useState(initialHistory)
  const [editOpen, setEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [setup, setSetup] = useState("")
  const [event, setEvent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyEvent, setHistoryEvent] = useState<string | null>(null)
  // Index into the full `history` array for the entry being edited (null = not editing)
  const [editingHistoryIdx, setEditingHistoryIdx] = useState<number | null>(null)
  const [addingHistory, setAddingHistory] = useState(false)
  const [historyName, setHistoryName] = useState("")
  const [historySetup, setHistorySetup] = useState("")
  const [historyDate, setHistoryDate] = useState("")


  function getEventLabel(eventId: string): string {
    return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
  }

  // Get history entries for a specific event, sorted newest first
  // Returns each entry along with its real index in the full `history` array
  function getEventHistory(eventId: string): (CubeHistoryEntry & { _idx: number })[] {
    return history
      .map((h, idx) => ({ ...h, _idx: idx }))
      .filter((h) => h.event === eventId)
      .sort((a, b) => new Date(b.retired_at).getTime() - new Date(a.retired_at).getTime())
  }

  function openAdd() {
    setEditIndex(null)
    setName("")
    setSetup("")
    setEvent("333")
    setError(null)
    setEditOpen(true)
  }

  function openEdit(index: number) {
    const cube = items[index]
    setEditIndex(index)
    setName(cube.name)
    setSetup(cube.setup ?? "")
    setEvent(cube.event)
    setError(null)
    setEditOpen(true)
  }

  function openHistory(eventId: string) {
    setHistoryEvent(eventId)
    setHistoryOpen(true)
  }

  // Find if there's already a main for this event (excluding the cube being edited)
  function findExistingMain(eventId: string): { cube: ProfileCube; index: number } | null {
    const idx = items.findIndex(
      (c, i) => c.event === eventId && i !== editIndex
    )
    if (idx === -1) return null
    return { cube: items[idx], index: idx }
  }

  // The replacement warning shown in the add/edit dialog
  const existingMain = event ? findExistingMain(event) : null

  async function handleSave() {
    if (!name.trim()) {
      setError("Cube name is required.")
      return
    }
    if (!event.trim()) {
      setError("Event is required.")
      return
    }
    setSaving(true)
    setError(null)

    let updated = [...items]
    let updatedHistory = [...history]

    const entry: ProfileCube = {
      name: name.trim(),
      setup: setup.trim(),
      event: event.trim(),
    }

    // If there's an existing main for this event, archive it
    if (existingMain) {
      const archived: CubeHistoryEntry = {
        name: existingMain.cube.name,
        setup: existingMain.cube.setup,
        event: existingMain.cube.event,
        retired_at: new Date().toISOString(),
      }
      updatedHistory = [archived, ...updatedHistory]
      // Remove the old main from the array
      updated = updated.filter((_, i) => i !== existingMain.index)
    }

    if (editIndex !== null) {
      // Find the correct index after potential removal
      const adjustedIndex = existingMain && existingMain.index < editIndex
        ? editIndex - 1
        : editIndex
      updated[adjustedIndex] = entry
    } else {
      updated.push(entry)
    }

    const result = await updateProfileCubes(updated, updatedHistory)
    if (!result.success) {
      setError(result.error ?? "Something went wrong.")
      setSaving(false)
      return
    }

    setItems(updated)
    setHistory(updatedHistory)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete(index: number) {
    const updated = items.filter((_, i) => i !== index)
    setSaving(true)

    const result = await updateProfileCubes(updated, history)
    if (result.success) {
      setItems(updated)
      router.refresh()
    }
    setSaving(false)
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= items.length) return

    const updated = [...items]
    ;[updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]]

    // Optimistically update UI
    setItems(updated)

    const result = await updateProfileCubes(updated, history)
    if (!result.success) {
      // Revert on failure
      setItems(items)
    } else {
      router.refresh()
    }
  }

  function startEditHistory(realIdx: number) {
    const entry = history[realIdx]
    setAddingHistory(false)
    setEditingHistoryIdx(realIdx)
    setHistoryName(entry.name)
    setHistorySetup(entry.setup ?? "")
    // Format as YYYY-MM-DD for the date input
    setHistoryDate(new Date(entry.retired_at).toISOString().slice(0, 10))
  }

  function startAddHistory() {
    setEditingHistoryIdx(null)
    setAddingHistory(true)
    setHistoryName("")
    setHistorySetup("")
    setHistoryDate("")
  }

  function cancelEditHistory() {
    setEditingHistoryIdx(null)
    setAddingHistory(false)
    setHistoryName("")
    setHistorySetup("")
    setHistoryDate("")
  }

  async function saveEditHistory() {
    if (editingHistoryIdx === null) return
    if (!historyName.trim()) return
    if (!historyDate) return
    setSaving(true)

    const updated = [...history]
    updated[editingHistoryIdx] = {
      ...updated[editingHistoryIdx],
      name: historyName.trim(),
      setup: historySetup.trim(),
      retired_at: new Date(historyDate + "T12:00:00").toISOString(),
    }

    const result = await updateProfileCubes(items, updated)
    if (result.success) {
      setHistory(updated)
      setEditingHistoryIdx(null)
      setHistoryDate("")
      router.refresh()
    }
    setSaving(false)
  }

  async function saveAddHistory() {
    if (!historyName.trim()) return
    if (!historyDate) return
    if (!historyEvent) return
    setSaving(true)

    const newEntry: CubeHistoryEntry = {
      name: historyName.trim(),
      setup: historySetup.trim(),
      event: historyEvent,
      retired_at: new Date(historyDate + "T12:00:00").toISOString(),
    }
    const updated = [newEntry, ...history]

    const result = await updateProfileCubes(items, updated)
    if (result.success) {
      setHistory(updated)
      setAddingHistory(false)
      setHistoryName("")
      setHistorySetup("")
      setHistoryDate("")
      router.refresh()
    }
    setSaving(false)
  }

  async function deleteHistoryEntry(realIdx: number) {
    setSaving(true)
    const updated = history.filter((_, i) => i !== realIdx)

    const result = await updateProfileCubes(items, updated)
    if (result.success) {
      setHistory(updated)
      // If we were editing this entry, clear the edit state
      if (editingHistoryIdx === realIdx) setEditingHistoryIdx(null)
      router.refresh()
    }
    setSaving(false)
  }

  // Don't render at all if not owner and no cubes
  if (!isOwner && items.length === 0) return null

  const eventHistoryForModal = historyEvent ? getEventHistory(historyEvent) : []
  const currentMainIdx = historyEvent
    ? items.findIndex((c) => c.event === historyEvent)
    : -1
  const currentMainForModal = currentMainIdx >= 0 ? items[currentMainIdx] : null

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Box className="h-5 w-5 text-primary" />
              Main Cubes
            </CardTitle>
            {isOwner && (
              <div className="flex items-center gap-2">
                {editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openAdd}
                    className="min-h-9 gap-1.5 border-border/50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                )}
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className={`min-h-9 gap-1.5 ${editMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border/50"}`}
                >
                  {editMode ? (
                    <>Done</>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No cubes added yet. Add your main puzzles!
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((cube, i) => {
                  const eventHistory = getEventHistory(cube.event)
                  const hasHistory = eventHistory.length > 0
                  const isClickable = hasHistory && !editMode

                  return (
                    <div
                      key={i}
                      className={`flex flex-col rounded-lg border border-border/50 bg-secondary/50 ${
                        isClickable ? "cursor-pointer transition-colors hover:border-primary/30" : ""
                      }`}
                    >
                      <div
                        className="flex items-start gap-3 p-4"
                        onClick={isClickable ? () => openHistory(cube.event) : undefined}
                      >
                        <div className="flex shrink-0 flex-col items-center gap-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <CubingIcon
                              event={cube.event}
                              className="text-lg text-primary"
                            />
                          </div>
                          <span className="text-[10px] font-medium leading-tight text-muted-foreground">
                            {getEventLabel(cube.event)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">
                            {cube.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {cube.setup || getEventLabel(cube.event)}
                          </p>
                        </div>
                        {hasHistory && !editMode && (
                          <div className="shrink-0 pt-0.5">
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Edit mode controls */}
                      {isOwner && editMode && (
                        <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMove(i, "up")}
                              disabled={i === 0 || saving}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Move cube up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleMove(i, "down")}
                              disabled={i === items.length - 1 || saving}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Move cube down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            {hasHistory && (
                              <button
                                onClick={() => openHistory(cube.event)}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                                aria-label="View cube history"
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(i)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                              aria-label="Edit cube"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(i)}
                              disabled={saving}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                              aria-label="Delete cube"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? "Edit Cube" : "Add Cube"}
            </DialogTitle>
            <DialogDescription>
              Add details about your puzzle setup.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cube-event">Event</Label>
              <select
                id="cube-event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="min-h-11 rounded-md border border-border/50 bg-secondary px-3 text-sm text-foreground"
              >
                {WCA_EVENTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Replacement warning */}
            {existingMain && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-400">
                This will replace your current {getEventLabel(event)} main:{" "}
                <span className="font-medium">{existingMain.cube.name}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="cube-name">Cube Name</Label>
              <Input
                id="cube-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., GAN 13 MagLev"
                className="min-h-11"
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cube-setup">
                Setup{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="cube-setup"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                placeholder="e.g., UV Coated, Spring 4, Tight tensions"
                className="min-h-11"
                maxLength={200}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving
                ? "Saving..."
                : existingMain
                  ? "Replace & Save"
                  : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open)
          if (!open) cancelEditHistory()
        }}
      >
        <DialogContent className="border-border/50 bg-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {historyEvent && (
                <CubingIcon event={historyEvent} className="text-lg text-primary" />
              )}
              {historyEvent ? getEventLabel(historyEvent) : ""} Main History
            </DialogTitle>
            <DialogDescription>
              Your current and previous main cubes for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {/* Current main */}
            {currentMainForModal && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                        Current
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{currentMainForModal.name}</p>
                    {currentMainForModal.setup && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {currentMainForModal.setup}
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => {
                          setHistoryOpen(false)
                          openEdit(currentMainIdx)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                        aria-label="Edit current main"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await handleDelete(currentMainIdx)
                          // Close modal if we just removed the only cube for this event
                          if (!items.some((c, i) => c.event === historyEvent && i !== currentMainIdx)) {
                            setHistoryOpen(false)
                          }
                        }}
                        disabled={saving}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                        aria-label="Delete current main"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History entries */}
            {eventHistoryForModal.length > 0 ? (
              eventHistoryForModal.map((entry) => {
                const isEditing = editingHistoryIdx === entry._idx

                if (isEditing) {
                  return (
                    <HistoryEntryForm
                      key={entry._idx}
                      name={historyName}
                      setup={historySetup}
                      date={historyDate}
                      saving={saving}
                      onNameChange={setHistoryName}
                      onSetupChange={setHistorySetup}
                      onDateChange={setHistoryDate}
                      onSave={saveEditHistory}
                      onCancel={cancelEditHistory}
                    />
                  )
                }

                return (
                  <div
                    key={entry._idx}
                    className="rounded-lg border border-border/50 bg-secondary/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{entry.name}</p>
                        {entry.setup && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {entry.setup}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Retired {formatRetiredDate(entry.retired_at)}
                        </p>
                      </div>
                      {isOwner && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            onClick={() => startEditHistory(entry._idx)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                            aria-label="Edit history entry"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteHistoryEntry(entry._idx)}
                            disabled={saving}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                            aria-label="Delete history entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : !addingHistory ? (
              <p className="text-sm text-muted-foreground py-2">
                No previous mains for this event.
              </p>
            ) : null}

            {/* Add past cube form */}
            {isOwner && addingHistory && (
              <HistoryEntryForm
                name={historyName}
                setup={historySetup}
                date={historyDate}
                saving={saving}
                onNameChange={setHistoryName}
                onSetupChange={setHistorySetup}
                onDateChange={setHistoryDate}
                onSave={saveAddHistory}
                onCancel={cancelEditHistory}
              />
            )}

            {/* Add past cube button */}
            {isOwner && !addingHistory && editingHistoryIdx === null && (
              <button
                type="button"
                onClick={startAddHistory}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Past Cube
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HistoryEntryForm({
  name,
  setup,
  date,
  saving,
  onNameChange,
  onSetupChange,
  onDateChange,
  onSave,
  onCancel,
}: {
  name: string
  setup: string
  date: string
  saving: boolean
  onNameChange: (v: string) => void
  onSetupChange: (v: string) => void
  onDateChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-secondary/30 p-3">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Cube name"
        className="min-h-9 text-sm"
        maxLength={100}
      />
      <Input
        value={setup}
        onChange={(e) => onSetupChange(e.target.value)}
        placeholder="Setup (optional)"
        className="min-h-9 text-sm"
        maxLength={200}
      />
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Retired date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="min-h-9 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || !name.trim() || !date}
          className="min-h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="min-h-8 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

function formatRetiredDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}
