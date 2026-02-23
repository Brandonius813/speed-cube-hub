"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ExternalLink, Link2, Loader2 } from "lucide-react"
import { updateWcaId } from "@/lib/actions/wca"

export function WcaLink({
  currentWcaId,
  onUpdate,
}: {
  currentWcaId: string | null
  onUpdate: (wcaId: string | null) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [wcaId, setWcaId] = useState(currentWcaId || "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateWcaId(wcaId || null)
      if (result.error) {
        setError(result.error)
      } else {
        onUpdate(wcaId || null)
        setIsEditing(false)
      }
    })
  }

  function handleCancel() {
    setWcaId(currentWcaId || "")
    setError(null)
    setIsEditing(false)
  }

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      const result = await updateWcaId(null)
      if (result.error) {
        setError(result.error)
      } else {
        setWcaId("")
        onUpdate(null)
        setIsEditing(false)
      }
    })
  }

  if (!isEditing && currentWcaId) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/50 p-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: "#22D3EE20" }}
        >
          <Link2 className="h-4 w-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">WCA Profile</p>
          <p className="truncate text-xs text-muted-foreground">
            {currentWcaId}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={`https://www.worldcubeassociation.org/persons/${currentWcaId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-xs text-muted-foreground"
          >
            Edit
          </Button>
        </div>
      </div>
    )
  }

  if (!isEditing && !currentWcaId) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border/50 bg-secondary/30 p-3 text-left transition-colors hover:border-primary/30"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: "#22D3EE20" }}
        >
          <Link2 className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Link WCA ID</p>
          <p className="text-xs text-muted-foreground">
            Show your official results
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/50 p-4">
      <label className="text-sm font-medium text-foreground">
        WCA ID
      </label>
      <p className="mb-2 text-xs text-muted-foreground">
        Find it on worldcubeassociation.org (e.g., 2024TRUE02)
      </p>
      <div className="flex gap-2">
        <Input
          value={wcaId}
          onChange={(e) => setWcaId(e.target.value.toUpperCase())}
          placeholder="2024TRUE02"
          className="font-mono text-sm uppercase"
          disabled={isPending}
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
          className="shrink-0"
        >
          Cancel
        </Button>
      </div>
      {currentWcaId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={isPending}
          className="mt-2 text-xs text-destructive hover:text-destructive"
        >
          Remove WCA ID
        </Button>
      )}
      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
