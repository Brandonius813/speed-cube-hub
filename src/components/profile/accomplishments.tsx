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
import { Trophy, Plus, Pencil, Trash2, Calendar } from "lucide-react"
import { updateProfileAccomplishments } from "@/lib/actions/profiles"
import type { ProfileAccomplishment } from "@/lib/types"

export function Accomplishments({
  accomplishments: initial,
  isOwner,
}: {
  accomplishments: ProfileAccomplishment[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setEditIndex(null)
    setTitle("")
    setDate("")
    setError(null)
    setEditOpen(true)
  }

  function openEdit(index: number) {
    setEditIndex(index)
    setTitle(items[index].title)
    setDate(items[index].date ?? "")
    setError(null)
    setEditOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setSaving(true)
    setError(null)

    const updated = [...items]
    const entry: ProfileAccomplishment = {
      title: title.trim(),
      date: date || null,
    }

    if (editIndex !== null) {
      updated[editIndex] = entry
    } else {
      updated.push(entry)
    }

    const result = await updateProfileAccomplishments(updated)
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

    const result = await updateProfileAccomplishments(updated)
    if (result.success) {
      setItems(updated)
      router.refresh()
    }
    setSaving(false)
  }

  // Don't render at all if not owner and no accomplishments
  if (!isOwner && items.length === 0) return null

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Trophy className="h-5 w-5 text-chart-3" />
              Notable Accomplishments
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
              No accomplishments added yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/50 p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-chart-3/10">
                    <Trophy className="h-4 w-4 text-chart-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.date && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(i)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        disabled={saving}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
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
              {editIndex !== null ? "Edit Accomplishment" : "Add Accomplishment"}
            </DialogTitle>
            <DialogDescription>
              Add a notable cubing milestone or achievement.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-title">Title</Label>
              <Input
                id="acc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sub-10 3x3 average"
                className="min-h-11"
                maxLength={200}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-date">
                Date{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="acc-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g., March 2024"
                className="min-h-11"
                maxLength={50}
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
              disabled={saving || !title.trim()}
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
