"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { PANE_REGISTRY, PANE_TOOL_OPTIONS } from "@/components/timer/panes/pane-registry"
import type {
  PaneToolId,
  TimerPaneInstance,
  TimerPaneLayoutV1,
  TimerPaneRenderContext,
} from "@/components/timer/panes/types"

type MobilePaneDrawerProps = {
  panes: TimerPaneInstance[]
  layout: TimerPaneLayoutV1
  context: TimerPaneRenderContext
  timingActive: boolean
  autoHideDuringSolve: boolean
  openRequestKey?: number
  onAddPane: (tool: PaneToolId) => void
  onRemovePane: (paneId: string) => void
  onChangeTool: (paneId: string, tool: PaneToolId) => void
  onMovePane: (paneId: string, direction: "up" | "down") => void
  onSetPaneHeight: (paneId: string, height: "sm" | "md" | "lg") => void
  onUpdatePaneOptions: (paneId: string, options: TimerPaneInstance["options"]) => void
}

function heightClass(size: "sm" | "md" | "lg") {
  if (size === "sm") return "h-44"
  if (size === "lg") return "h-80"
  return "h-60"
}

export function MobilePaneDrawer({
  panes,
  layout,
  context,
  timingActive,
  autoHideDuringSolve,
  openRequestKey = 0,
  onAddPane,
  onRemovePane,
  onChangeTool,
  onMovePane,
  onSetPaneHeight,
  onUpdatePaneOptions,
}: MobilePaneDrawerProps) {
  const [open, setOpen] = useState(false)

  const paneById = useMemo(() => {
    const map = new Map<string, TimerPaneInstance>()
    for (const pane of panes) map.set(pane.id, pane)
    return map
  }, [panes])

  const orderedPanes = useMemo(() => {
    const ordered = layout.mobile.order
      .map((id) => paneById.get(id))
      .filter((pane): pane is TimerPaneInstance => !!pane)
    for (const pane of panes) {
      if (!ordered.some((entry) => entry.id === pane.id)) ordered.push(pane)
    }
    return ordered
  }, [layout.mobile.order, paneById, panes])

  const usedTools = useMemo(() => new Set(panes.map((pane) => pane.tool)), [panes])
  const canRenderPaneContent = !(autoHideDuringSolve && timingActive)

  useEffect(() => {
    if (openRequestKey <= 0) return
    const timerId = window.setTimeout(() => setOpen(true), 0)
    return () => window.clearTimeout(timerId)
  }, [openRequestKey])

  return (
    <div className="lg:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="fixed left-4 bottom-4 z-40 min-h-11 min-w-11 rounded-xl border border-border bg-background/95 px-3 text-sm font-medium text-foreground shadow-lg backdrop-blur"
            onPointerDown={(eventPointer) => eventPointer.stopPropagation()}
          >
            Panes
          </button>
        </DialogTrigger>
        <DialogContent
          showCloseButton
          className="top-auto bottom-3 left-3 right-3 translate-x-0 translate-y-0 w-auto max-w-none rounded-2xl p-4"
        >
          <DialogHeader>
            <DialogTitle>Pane Workspace</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
              <p className="mb-2 text-xs font-sans uppercase tracking-wide text-muted-foreground">
                Add Tool
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PANE_TOOL_OPTIONS.map((option) => {
                  const isUsed = usedTools.has(option.tool)
                  const isAvailable = PANE_REGISTRY[option.tool].isAvailable(context)
                  const showCrossEventHint = option.tool === "cross" && !isAvailable
                  const disabledReason = showCrossEventHint
                    ? "Only works on 3x3 and 3x3 one-handed"
                    : isUsed
                    ? "Already open"
                    : panes.length >= 4
                    ? "Max 4 panes open"
                    : null
                  return (
                    <button
                      key={option.tool}
                      className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                      disabled={isUsed || !isAvailable || panes.length >= 4}
                      onClick={() => onAddPane(option.tool)}
                      title={
                        disabledReason ? `${option.label}: ${disabledReason}` : undefined
                      }
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {autoHideDuringSolve && timingActive && (
              <div className="rounded-md border border-yellow-700/40 bg-yellow-900/30 p-2 text-xs text-yellow-200">
                Panes are hidden while solving/inspecting (auto-hide is on).
              </div>
            )}

            {orderedPanes.map((pane, index) => {
              const entry = PANE_REGISTRY[pane.tool]
              const size = layout.mobile.heights[pane.id] ?? "md"
              const Render = entry.Render

              return (
                <div key={pane.id} className="rounded-lg border border-border/70 bg-background/80 p-2">
                  <div className="mb-2 flex items-center gap-2">
                    <select
                      className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs text-foreground outline-none"
                      value={pane.tool}
                      onChange={(eventSelect) =>
                        onChangeTool(pane.id, eventSelect.target.value as PaneToolId)
                      }
                    >
                      {PANE_TOOL_OPTIONS.map((option) => {
                        const inUseByOther = panes.some(
                          (entryPane) =>
                            entryPane.tool === option.tool && entryPane.id !== pane.id
                        )
                        const available = PANE_REGISTRY[option.tool].isAvailable(context)
                        return (
                          <option
                            key={option.tool}
                            value={option.tool}
                            disabled={inUseByOther || !available}
                          >
                            {option.label}
                          </option>
                        )
                      })}
                    </select>

                    <button
                      className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground"
                      disabled={index === 0}
                      onClick={() => onMovePane(pane.id, "up")}
                    >
                      ↑
                    </button>
                    <button
                      className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground"
                      disabled={index === orderedPanes.length - 1}
                      onClick={() => onMovePane(pane.id, "down")}
                    >
                      ↓
                    </button>
                    <button
                      className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground"
                      onClick={() => onRemovePane(pane.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Height</span>
                    <div className="flex gap-1">
                      {([
                        { value: "sm", label: "Small" },
                        { value: "md", label: "Medium" },
                        { value: "lg", label: "Large" },
                      ] as const).map((optionSize) => (
                        <button
                          key={optionSize.value}
                          className={cn(
                            "rounded border border-border px-2 py-1 text-[11px] text-muted-foreground",
                            optionSize.value === size && "bg-secondary/70 text-foreground"
                          )}
                          onClick={() => onSetPaneHeight(pane.id, optionSize.value)}
                        >
                          {optionSize.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={cn("overflow-auto", heightClass(size))}>
                    {canRenderPaneContent ? (
                      <Render
                        pane={pane}
                        context={context}
                        updatePaneOptions={onUpdatePaneOptions}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-md border border-border/60 bg-muted/10 text-xs text-muted-foreground">
                        Hidden while solving/inspecting
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
