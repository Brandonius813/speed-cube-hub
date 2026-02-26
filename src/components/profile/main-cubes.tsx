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
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  History,
} from "lucide-react"
import { updateProfileCubes } from "@/lib/actions/profiles"
import type { ProfileCube, CubeHistoryEntry } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"

const PREVIEW_COUNT = 3

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
  const [expanded, setExpanded] = useState(false)

  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyEvent, setHistoryEvent] = useState<string | null>(null)

  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT)
  const hiddenCount = items.length - PREVIEW_COUNT

  function getEventLabel(eventId: string): string {
    return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
  }

  // Get history entries for a specific event, sorted newest first
  function getEventHistory(eventId: string): CubeHistoryEntry[] {
    return history
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

  // Don't render at all if not owner and no cubes
  if (!isOwner && items.length === 0) return null

  const eventHistoryForModal = historyEvent ? getEventHistory(historyEvent) : []
  const currentMainForModal = historyEvent
    ? items.find((c) => c.event === historyEvent)
    : null

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
                {visibleItems.map((cube, i) => {
                  const eventHistory = getEventHistory(cube.event)
                  const hasHistory = eventHistory.length > 0

                  return (
                    <div
                      key={i}
                      className={`group flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/50 p-4 ${
                        hasHistory ? "cursor-pointer transition-colors hover:border-primary/30" : ""
                      }`}
                      onClick={hasHistory ? () => openHistory(cube.event) : undefined}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <CubingIcon
                          event={cube.event}
                          className="text-lg text-primary"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {cube.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {cube.setup || getEventLabel(cube.event)}
                        </p>
                      </div>
                      {hasHistory && !isOwner && (
                        <div className="shrink-0">
                          <History className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      {isOwner && (
                        <div
                          className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasHistory && (
                            <button
                              onClick={() => openHistory(cube.event)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                              aria-label="View cube history"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleMove(i, "up")}
                            disabled={i === 0 || saving}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                            aria-label="Move cube up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(i, "down")}
                            disabled={i === items.length - 1 || saving}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                            aria-label="Move cube down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(i)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                            aria-label="Edit cube"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(i)}
                            disabled={saving}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                            aria-label="Delete cube"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/50 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                >
                  {expanded ? (
                    <>
                      Show less
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show all {items.length} cubes
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
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
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
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
            )}

            {/* History entries */}
            {eventHistoryForModal.length > 0 ? (
              eventHistoryForModal.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-secondary/30 p-3"
                >
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
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No previous mains for this event.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
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
