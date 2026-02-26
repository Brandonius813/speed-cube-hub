"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
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
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react"
import type { Session } from "@/lib/types"
import { EditSessionModal } from "@/components/dashboard/edit-session-modal"
import { SessionCard, SessionTable } from "@/components/dashboard/session-log-layouts"
import { deleteSessionsBulk } from "@/lib/actions/sessions"

const PAGE_SIZE = 20

/** SSR-safe media query hook — returns null during SSR, true/false after hydration */
const SM_QUERY = "(min-width: 640px)"
function subscribeMedia(cb: () => void) {
  const mql = window.matchMedia(SM_QUERY)
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}
function getMediaSnapshot() {
  return window.matchMedia(SM_QUERY).matches
}
function getMediaServerSnapshot() {
  return null as boolean | null
}
function useIsDesktop(): boolean | null {
  return useSyncExternalStore(subscribeMedia, getMediaSnapshot, getMediaServerSnapshot)
}

export function SessionLog({ sessions, readOnly = false }: { sessions: Session[]; readOnly?: boolean }) {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  // Reset to first page whenever the sessions list changes (e.g. filters applied)
  useEffect(() => {
    setPage(0)
  }, [sessions])

  const totalPages = Math.ceil(sessions.length / PAGE_SIZE)
  const displayedSessions = sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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
    const pageIds = displayedSessions.map((s) => s.id)
    const allPageSelected = pageIds.every((id) => selectedIds.has(id))
    if (allPageSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      // Select all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
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

  const pageIds = displayedSessions.map((s) => s.id)
  const pageSelectedCount = pageIds.filter((id) => selectedIds.has(id)).length
  const allSelected = displayedSessions.length > 0 && pageSelectedCount === displayedSessions.length
  const someSelected = pageSelectedCount > 0 && pageSelectedCount < displayedSessions.length

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

          {/* Mobile card layout — rendered when not desktop (or during SSR with CSS hide) */}
          {(isDesktop === null || !isDesktop) && (
            <div className={`flex flex-col gap-3${isDesktop === null ? " sm:hidden" : ""}`}>
              {displayedSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  selectMode={selectMode}
                  selected={selectedIds.has(session.id)}
                  readOnly={readOnly}
                  onToggle={() => toggleSession(session.id)}
                  onEdit={() => setEditingSession(session)}
                />
              ))}
            </div>
          )}

          {/* Desktop table layout — rendered when desktop (or during SSR with CSS hide) */}
          {(isDesktop === null || isDesktop) && (
            <div className={`overflow-x-auto${isDesktop === null ? " hidden sm:block" : ""}`}>
              <SessionTable
                sessions={displayedSessions}
                selectMode={selectMode}
                selectedIds={selectedIds}
                allSelected={allSelected}
                someSelected={someSelected}
                readOnly={readOnly}
                onToggleSession={toggleSession}
                onToggleAll={toggleAll}
                onEdit={setEditingSession}
              />
            </div>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-4">
              <span className="text-sm text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sessions.length)} of {sessions.length} sessions
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
