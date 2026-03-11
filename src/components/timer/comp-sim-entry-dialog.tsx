"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type CompSimEntryActionTone = "primary" | "secondary"

export type CompSimEntryAction = {
  label: string
  onSelect: () => void
  tone?: CompSimEntryActionTone
}

type CompSimEntryDialogProps = {
  open: boolean
  title: string
  description: string
  actions: CompSimEntryAction[]
  onOpenChange: (open: boolean) => void
}

const ACTION_STYLES: Record<CompSimEntryActionTone, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border border-border text-foreground hover:bg-muted",
}

export function CompSimEntryDialog({
  open,
  title,
  description,
  actions,
  onOpenChange,
}: CompSimEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {actions.map((action) => {
            const tone = action.tone ?? "secondary"
            return (
              <button
                key={action.label}
                type="button"
                className={cn(
                  "w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors min-h-11",
                  ACTION_STYLES[tone]
                )}
                onClick={action.onSelect}
              >
                {action.label}
              </button>
            )
          })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
