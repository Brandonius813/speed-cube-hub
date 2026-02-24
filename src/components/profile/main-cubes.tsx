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
import { Box, Plus, Pencil, Trash2 } from "lucide-react"
import { updateProfileCubes } from "@/lib/actions/profiles"
import type { ProfileCube } from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"

export function MainCubes({
  cubes: initial,
  isOwner,
}: {
  cubes: ProfileCube[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [setup, setSetup] = useState("")
  const [event, setEvent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    const updated = [...items]
    const entry: ProfileCube = {
      name: name.trim(),
      setup: setup.trim(),
      event: event.trim(),
    }

    if (editIndex !== null) {
      updated[editIndex] = entry
    } else {
      updated.push(entry)
    }

    const result = await updateProfileCubes(updated)
    if (!result.success) {
      setError(result.error ?? "Something went wrong.")
      setSaving(false)
      return
    }

    setItems(updated)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete(index: number) {
    const updated = items.filter((_, i) => i !== index)
    setSaving(true)

    const result = await updateProfileCubes(updated)
    if (result.success) {
      setItems(updated)
      router.refresh()
    }
    setSaving(false)
  }

  function getEventLabel(eventId: string): string {
    return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
  }

  // Don't render at all if not owner and no cubes
  if (!isOwner && items.length === 0) return null

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
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((cube, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/50 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                    {getEventLabel(cube.event).replace("x", "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {cube.name}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {cube.setup || getEventLabel(cube.event)}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
