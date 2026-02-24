import { Badge } from "@/components/ui/badge"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { WCA_EVENTS } from "@/lib/constants"
import { cn } from "@/lib/utils"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

/**
 * Displays a WCA event as a badge with the official cubing icon + label.
 * Uniform styling for all events (no per-event color coding).
 */
export function EventBadge({
  event,
  className,
  selected,
}: {
  event: string
  className?: string
  selected?: boolean
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        selected
          ? "bg-foreground text-background"
          : "border-border/50 bg-secondary/50 text-foreground",
        className
      )}
    >
      <CubingIcon event={event} className="text-[0.85em]" />
      {getEventLabel(event)}
    </Badge>
  )
}
