"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2, X } from "lucide-react"
import type { Session } from "@/lib/types"
import { EventBadge } from "@/components/shared/event-badge"
import { formatDuration } from "@/lib/utils"
import { EditSessionModal } from "@/components/dashboard/edit-session-modal"
import { deleteSessionsBulk } from "@/lib/actions/sessions"

function formatAvg(avg: number | null): string {
  if (avg === null) return "--"
  if (avg >= 60) {
    const min = Math.floor(avg / 60)
    const sec = (avg % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${avg.toFixed(2)}s`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function SessionLog({ sessions, readOnly = false }: { sessions: Session[]; readOnly?: boolean }) {
  const router = useRouter()
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleSaved() {
    setEditingSession(null)
    router.refresh()
  }

  function toggleSelectMode() {
    if (selectMode) {
      // Exit select mode — clear selections
      setSelectMode(false)
      setSelectedIds(new Set())
      setDeleteError(null)
    } else {
      setSelectMode(true)
    }
  }

  function toggleSession(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)))
    }
  }

  async function handleBulkDelete() {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteSessionsBulk(Array.from(selectedIds))
    if (result.error) {
      setDeleteError(result.error)
      setDeleting(false)
      setShowDeleteConfirm(false)
      return
    }
    setDeleting(false)
    setShowDeleteConfirm(false)
    setSelectMode(false)
    setSelectedIds(new Set())
    router.refresh()
  }

  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < sessions.length

  if (sessions.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Session Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sessions yet. Log your first practice session to see it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-foreground">Session Log</CardTitle>
          {!readOnly && (
            <Button
              variant={selectMode ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
              onClick={toggleSelectMode}
            >
              {selectMode ? (
                <>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </>
              ) : (
                "Select"
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {deleteError && (
            <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          {/* Mobile card layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-secondary/30 px-3 py-3"
                onClick={selectMode ? () => toggleSession(session.id) : undefined}
              >
                {selectMode && (
                  <Checkbox
                    checked={selectedIds.has(session.id)}
                    onCheckedChange={() => toggleSession(session.id)}
                    className="shrink-0"
                  />
                )}
                <div className="flex min-w-0 flex-1 items-center justify-between">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    {session.title && (
                      <span className="truncate text-sm font-medium text-foreground">
                        {session.title}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <EventBadge event={session.event} />
                      <span className="text-xs text-muted-foreground">
                        {session.practice_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(session.session_date)}</span>
                      {session.num_solves !== null && session.num_solves > 0 && (
                        <span>{session.num_solves} solves</span>
                      )}
                      {session.num_dnf != null && session.num_dnf > 0 && (
                        <span className="text-amber-500">{session.num_dnf} DNF{session.num_dnf !== 1 ? "s" : ""}</span>
                      )}
                      <span>{formatDuration(session.duration_minutes)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex gap-3 text-right">
                      {session.best_time !== null && (
                        <div>
                          <div className="font-mono text-sm font-semibold text-accent">
                            {formatAvg(session.best_time)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">best</div>
                        </div>
                      )}
                      <div>
                        <div className="font-mono text-sm font-semibold text-foreground">
                          {formatAvg(session.avg_time)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">avg</div>
                      </div>
                    </div>
                    {!readOnly && !selectMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingSession(session)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {selectMode && (
                    <th className="w-10 pb-3">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                  )}
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                    Event
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    Solves
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    DNFs
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    Duration
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    Best
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    Avg
                  </th>
                  {!readOnly && <th className="w-10 pb-3" />}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className={`group border-b border-border/30 last:border-0 hover:bg-secondary/30 ${selectMode ? "cursor-pointer" : ""}`}
                    onClick={selectMode ? () => toggleSession(session.id) : undefined}
                  >
                    {selectMode && (
                      <td className="py-3">
                        <Checkbox
                          checked={selectedIds.has(session.id)}
                          onCheckedChange={() => toggleSession(session.id)}
                        />
                      </td>
                    )}
                    <td className="py-3 text-sm text-muted-foreground">
                      {formatDate(session.session_date)}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <EventBadge event={session.event} />
                        {session.title && (
                          <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {session.title}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-sm text-foreground">
                      {session.practice_type}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-foreground">
                      {session.num_solves ?? "—"}
                    </td>
                    <td className="py-3 text-right font-mono text-sm">
                      {session.num_dnf != null && session.num_dnf > 0 ? (
                        <span className="text-amber-500">{session.num_dnf}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-foreground">
                      {formatDuration(session.duration_minutes)}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-accent">
                      {formatAvg(session.best_time)}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-foreground">
                      {formatAvg(session.avg_time)}
                    </td>
                    {!readOnly && (
                      <td className="py-3 text-center">
                        {!selectMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                            onClick={() => setEditingSession(session)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <>
          {/* Floating bulk action bar */}
          {selectMode && selectedIds.size > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-lg sm:border sm:px-6">
              <div className="flex items-center justify-between gap-4 sm:justify-center">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} session{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Bulk delete confirmation */}
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} session{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {selectedIds.size} practice session{selectedIds.size !== 1 ? "s" : ""}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting..." : "Delete Sessions"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {editingSession && (
            <EditSessionModal
              open={!!editingSession}
              onOpenChange={(open) => {
                if (!open) setEditingSession(null)
              }}
              session={editingSession}
              onSaved={handleSaved}
            />
          )}
        </>
      )}
    </>
  )
}
