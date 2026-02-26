"use client"

import { useState } from "react"
import {
  Pencil,
  RotateCcw,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Check,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { WCA_EVENTS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { SolveSession } from "@/lib/types"

type SessionManagerProps = {
  isOpen: boolean
  onClose: () => void
  sessions: SolveSession[]
  currentSessionId: string | null
  onSelect: (session: SolveSession) => void
  onRename: (id: string, name: string) => void
  onToggleTracked: (id: string, isTracked: boolean) => void
  onReset: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onCreate: (name: string, event: string, isTracked: boolean) => void
}

export function SessionManager({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelect,
  onRename,
  onToggleTracked,
  onReset,
  onArchive,
  onDelete,
  onCreate,
}: SessionManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [confirmAction, setConfirmAction] = useState<{
    type: "reset" | "delete"
    id: string
    name: string
  } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEvent, setNewEvent] = useState("333")
  const [newTracked, setNewTracked] = useState(true)

  const eventLabel = (eventId: string) =>
    WCA_EVENTS.find((e) => e.id === eventId)?.label ?? eventId

  // Group by event
  const grouped = sessions.reduce<Record<string, SolveSession[]>>(
    (acc, session) => {
      const key = session.event
      if (!acc[key]) acc[key] = []
      acc[key].push(session)
      return acc
    },
    {}
  )

  const eventOrder: string[] = WCA_EVENTS.map((e) => e.id)
  const sortedEvents = Object.keys(grouped).sort(
    (a, b) => eventOrder.indexOf(a) - eventOrder.indexOf(b)
  )

  const startEdit = (session: SolveSession) => {
    setEditingId(session.id)
    setEditName(session.name)
  }

  const saveEdit = (id: string) => {
    const trimmed = editName.trim()
    if (trimmed) {
      onRename(id, trimmed)
    }
    setEditingId(null)
  }

  const handleCreate = () => {
    const name = newName.trim() || "Session 1"
    onCreate(name, newEvent, newTracked)
    setNewName("")
    setNewEvent("333")
    setNewTracked(true)
    setShowCreate(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Sessions</DialogTitle>
          <DialogDescription>
            Create, rename, reset, or delete your timer sessions.
          </DialogDescription>
        </DialogHeader>

        {/* Confirmation dialog overlay */}
        {confirmAction && (
          <div className="absolute inset-0 z-10 bg-background/95 rounded-lg flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-xs">
              <p className="text-sm font-medium">
                {confirmAction.type === "reset"
                  ? `Reset "${confirmAction.name}"?`
                  : `Delete "${confirmAction.name}"?`}
              </p>
              <p className="text-xs text-muted-foreground">
                {confirmAction.type === "reset"
                  ? "This will clear your current solve list. Your all-time stats are not affected."
                  : "This will permanently remove this session. Solves are preserved but unlinked."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirmAction.type === "reset") {
                      onReset(confirmAction.id)
                    } else {
                      onDelete(confirmAction.id)
                    }
                    setConfirmAction(null)
                  }}
                >
                  {confirmAction.type === "reset" ? "Reset" : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
          {sortedEvents.map((eventId) => (
            <div key={eventId}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                {eventLabel(eventId)}
              </div>
              <div className="space-y-1">
                {grouped[eventId].map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border border-transparent",
                      session.id === currentSessionId &&
                        "border-primary/30 bg-primary/5"
                    )}
                  >
                    {editingId === session.id ? (
                      /* Inline edit mode */
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(session.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => saveEdit(session.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      /* Normal display mode */
                      <>
                        <button
                          className="flex-1 text-left text-sm truncate hover:text-primary transition-colors"
                          onClick={() => {
                            onSelect(session)
                            onClose()
                          }}
                        >
                          {session.name}
                        </button>

                        {!session.is_tracked && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Untracked
                          </span>
                        )}

                        {session.solve_count !== undefined && (
                          <span className="text-xs text-muted-foreground font-mono min-w-6 text-right">
                            {session.solve_count}
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(session)}
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              onToggleTracked(session.id, !session.is_tracked)
                            }
                            title={session.is_tracked ? "Make untracked" : "Make tracked"}
                          >
                            {session.is_tracked ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setConfirmAction({
                                type: "reset",
                                id: session.id,
                                name: session.name,
                              })
                            }
                            title="Reset session"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            onClick={() => onArchive(session.id)}
                            title="Archive"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setConfirmAction({
                                type: "delete",
                                id: session.id,
                                name: session.name,
                              })
                            }
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No sessions yet. Create one to get started.
            </div>
          )}
        </div>

        {/* Create new session section */}
        <div className="border-t border-border pt-3 -mx-6 px-6">
          {showCreate ? (
            <div className="space-y-2">
              <Input
                placeholder="Session name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate()
                  if (e.key === "Escape") setShowCreate(false)
                }}
              />
              <div className="flex flex-wrap gap-1">
                {WCA_EVENTS.map((e) => (
                  <Badge
                    key={e.id}
                    variant={newEvent === e.id ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-[10px] h-6",
                      newEvent === e.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    )}
                    onClick={() => setNewEvent(e.id)}
                  >
                    {e.label}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setNewTracked(!newTracked)}
                >
                  {newTracked ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  {newTracked ? "Tracked" : "Untracked"}
                </button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCreate}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Session
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
