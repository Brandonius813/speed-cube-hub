"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  type ShortcutAction,
  type ShortcutMap,
  SHORTCUT_ACTIONS,
  SHORTCUT_LABELS,
  formatBinding,
  bindingFromEvent,
  getDefaultShortcutMap,
} from "@/lib/timer/keyboard-shortcuts"

type Props = {
  map: ShortcutMap
  onMapChange: (map: ShortcutMap) => void
}

export default function ShortcutSettings({ map, onMapChange }: Props) {
  const [rebindingAction, setRebindingAction] = useState<ShortcutAction | null>(
    null,
  )
  const [conflict, setConflict] = useState<string | null>(null)
  const captureRef = useRef<((e: KeyboardEvent) => void) | null>(null)

  // Listen for key capture when rebinding
  useEffect(() => {
    if (!rebindingAction) {
      captureRef.current = null
      return
    }

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Escape cancels rebind
      if (e.key === "Escape") {
        setRebindingAction(null)
        setConflict(null)
        return
      }

      const binding = bindingFromEvent(e)
      if (!binding) return // bare modifier or Space — ignore

      // Check for conflicts with other actions
      for (const action of SHORTCUT_ACTIONS) {
        if (action === rebindingAction) continue
        const existing = map[action]
        if (
          existing.key === binding.key &&
          !!existing.ctrl === !!binding.ctrl &&
          !!existing.alt === !!binding.alt &&
          !!existing.shift === !!binding.shift &&
          !!existing.meta === !!binding.meta
        ) {
          setConflict(
            `Already used for "${SHORTCUT_LABELS[action]}". Choose a different key.`,
          )
          return
        }
      }

      setConflict(null)
      const next = { ...map, [rebindingAction]: binding }
      onMapChange(next)
      setRebindingAction(null)
    }

    captureRef.current = handler
    window.addEventListener("keydown", handler, true)
    return () => window.removeEventListener("keydown", handler, true)
  }, [rebindingAction, map, onMapChange])

  const resetDefaults = useCallback(() => {
    onMapChange(getDefaultShortcutMap())
    setRebindingAction(null)
    setConflict(null)
  }, [onMapChange])

  return (
    <div className="space-y-1">
      {SHORTCUT_ACTIONS.map((action) => (
        <div
          key={action}
          className="flex items-center justify-between px-3 py-1.5"
        >
          <span className="text-[13px] text-foreground">
            {SHORTCUT_LABELS[action]}
          </span>
          <button
            className={cn(
              "font-mono text-[12px] px-2 py-1 rounded border transition-colors min-w-[72px] text-center",
              rebindingAction === action
                ? "border-primary text-primary bg-primary/10 animate-pulse"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
            onClick={(e) => {
              e.stopPropagation()
              setConflict(null)
              setRebindingAction(
                rebindingAction === action ? null : action,
              )
            }}
          >
            {rebindingAction === action
              ? "Press key…"
              : formatBinding(map[action])}
          </button>
        </div>
      ))}

      {conflict && (
        <p className="px-3 text-[11px] text-destructive">{conflict}</p>
      )}

      <button
        className="w-full px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors text-left"
        onClick={resetDefaults}
      >
        Reset to defaults
      </button>
    </div>
  )
}
