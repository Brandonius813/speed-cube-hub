"use client"

import { useState } from "react"
import { ChevronDown, Plus, Settings2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { WCA_EVENTS, ALL_TIMER_EVENTS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { SolveSession } from "@/lib/types"

type SessionSelectorProps = {
  sessions: SolveSession[]
  currentSessionId: string | null
  onSelect: (session: SolveSession) => void
  onCreate: (name: string, event: string, isTracked: boolean) => void
  onManage: () => void
}

export function SessionSelector({
  sessions,
  currentSessionId,
  onSelect,
  onCreate,
  onManage,
}: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEvent, setNewEvent] = useState("333")
  const [newTracked, setNewTracked] = useState(true)

  const currentSession = sessions.find((s) => s.id === currentSessionId)
  const eventLabel = (eventId: string) =>
    ALL_TIMER_EVENTS.find((e) => e.id === eventId)?.label ?? eventId

  // Group sessions by event
  const grouped = sessions.reduce<Record<string, SolveSession[]>>(
    (acc, session) => {
      const key = session.event
      if (!acc[key]) acc[key] = []
      acc[key].push(session)
      return acc
    },
    {}
  )

  // Sort event groups by ALL_TIMER_EVENTS order
  const eventOrder: string[] = ALL_TIMER_EVENTS.map((e) => e.id)
  const sortedEvents = Object.keys(grouped).sort(
    (a, b) => eventOrder.indexOf(a) - eventOrder.indexOf(b)
  )

  const handleCreate = () => {
    const name = newName.trim() || "Session 1"
    onCreate(name, newEvent, newTracked)
    setNewName("")
    setNewEvent("333")
    setNewTracked(true)
    setShowCreate(false)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium",
          "border border-border hover:bg-secondary/50 transition-colors",
          "min-h-9 max-w-56 truncate"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {currentSession
            ? `${currentSession.name} — ${eventLabel(currentSession.event)}`
            : "Select Session"}
        </span>
        {currentSession && !currentSession.is_tracked && (
          <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setShowCreate(false)
            }}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-md shadow-lg w-72 max-h-80 overflow-y-auto">
            {/* Session list grouped by event */}
            {sortedEvents.length > 0 ? (
              <div className="p-1.5">
                {sortedEvents.map((eventId) => (
                  <div key={eventId} className="mb-1 last:mb-0">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {eventLabel(eventId)}
                    </div>
                    {grouped[eventId].map((session) => (
                      <button
                        key={session.id}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left",
                          "hover:bg-secondary/50 transition-colors",
                          session.id === currentSessionId &&
                            "bg-primary/10 text-primary"
                        )}
                        onClick={() => {
                          onSelect(session)
                          setIsOpen(false)
                        }}
                      >
                        <span className="flex-1 truncate">{session.name}</span>
                        {!session.is_tracked && (
                          <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        {session.solve_count !== undefined && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {session.solve_count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No sessions yet
              </div>
            )}

            {/* Divider + actions */}
            <div className="border-t border-border p-1.5 space-y-1">
              {showCreate ? (
                <div className="p-2 space-y-2">
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
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                    {ALL_TIMER_EVENTS.map((e) => (
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
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-secondary/50 transition-colors text-muted-foreground"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Session
                </button>
              )}

              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-secondary/50 transition-colors text-muted-foreground"
                onClick={() => {
                  onManage()
                  setIsOpen(false)
                }}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Manage Sessions
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
